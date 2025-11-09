import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './VoiceAssistant.css';
import {
  appendElevenLabsLog,
  clearElevenLabsLogs,
  ElevenLabsLogEntry,
  getElevenLabsLogs,
} from '../utils/logs';

type CallStatus = 'idle' | 'initializing' | 'in-call' | 'error';

interface ElevenLabsSessionResponse {
  conversation_id: string;
  rtc_session_id: string;
  ice_servers: RTCIceServer[];
  websocket_url: string;
}

const describeHttpFailure = (status: number, rawBody: string) => {
  let hint = rawBody.trim();
  try {
    const parsed = JSON.parse(rawBody);
    if (typeof parsed === 'string') {
      hint = parsed;
    } else if (parsed?.detail) {
      hint = typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail);
    } else if (parsed?.message) {
      hint = typeof parsed.message === 'string' ? parsed.message : JSON.stringify(parsed.message);
    }
  } catch (error) {
    // Ignore JSON parse errors and fall back to the plain text body.
  }

  return `ElevenLabs respondió ${status}${hint ? `: ${hint}` : ''}`;
};

export const VoiceAssistant = () => {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY as string | undefined;
  const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID as string | undefined;

  const [status, setStatus] = useState<CallStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<ElevenLabsLogEntry[]>(() => getElevenLabsLogs());
  const [showLogs, setShowLogs] = useState(false);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const appendLog = useCallback(
    (entry: Omit<ElevenLabsLogEntry, 'timestamp'> & { timestamp?: string }) => {
      const saved = appendElevenLabsLog(entry);
      if (saved) {
        setLogs((prev) => {
          const next = [...prev, saved];
          return next.slice(-200);
        });
      }
    },
    [],
  );

  const refreshLogs = useCallback(() => {
    setLogs(getElevenLabsLogs());
  }, []);

  const cleanUp = useCallback((options?: { keepStatus?: boolean; reason?: 'error' | 'ended' }) => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
    if (!options?.keepStatus) {
      setStatus('idle');
    }
    appendLog({
      level: options?.reason === 'error' ? 'error' : 'info',
      message:
        options?.reason === 'error'
          ? 'La sesión se cerró tras un error y se liberaron los recursos locales.'
          : 'Sesión de voz finalizada y recursos liberados.',
    });
  }, [appendLog]);

  useEffect(() => cleanUp, [cleanUp]);

  const startConversation = useCallback(async () => {
    if (!apiKey || !agentId) {
      setError('Configura las variables VITE_ELEVENLABS_API_KEY y VITE_ELEVENLABS_AGENT_ID.');
      setStatus('error');
      appendLog({
        level: 'error',
        message: 'Faltan las variables de entorno de ElevenLabs para iniciar la llamada.',
      });
      return;
    }

    setError(null);
    setStatus('initializing');
    appendLog({ level: 'info', message: 'Iniciando sesión de voz con ElevenLabs.' });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      appendLog({ level: 'info', message: 'Micrófono autorizado por el usuario.' });

      const response = await fetch('https://api.elevenlabs.io/v1/convai/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({ agent_id: agentId }),
      });

      if (!response.ok) {
        const text = await response.text();
        const formattedMessage = describeHttpFailure(response.status, text);
        appendLog({
          level: 'error',
          message: 'La API de ElevenLabs rechazó la creación de la conversación.',
          details: text || formattedMessage,
        });
        throw new Error(formattedMessage);
      }

      const payload = (await response.json()) as ElevenLabsSessionResponse;
      appendLog({ level: 'info', message: 'Sesión RTC creada correctamente en ElevenLabs.' });

      const peerConnection = new RTCPeerConnection({
        iceServers: payload.ice_servers,
      });
      peerConnectionRef.current = peerConnection;

      const remoteStream = new MediaStream();
      if (audioRef.current) {
        audioRef.current.srcObject = remoteStream;
        audioRef.current.play().catch(() => {
          /* autoplay restrictions */
        });
      }

      peerConnection.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => remoteStream.addTrack(track));
      };

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      const offer = await peerConnection.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
      await peerConnection.setLocalDescription(offer);

      const sdpResponse = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/${payload.conversation_id}/sdp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify({
            sdp: offer.sdp,
            type: offer.type,
            rtc_session_id: payload.rtc_session_id,
          }),
        },
      );

      if (!sdpResponse.ok) {
        const text = await sdpResponse.text();
        const formattedMessage = describeHttpFailure(sdpResponse.status, text);
        appendLog({
          level: 'error',
          message: 'La API de ElevenLabs rechazó la negociación SDP.',
          details: text || formattedMessage,
        });
        throw new Error(formattedMessage);
      }

      const sdpPayload = await sdpResponse.json();
      if (sdpPayload?.sdp && sdpPayload?.type) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(sdpPayload));
      }
      appendLog({ level: 'info', message: 'Negociación SDP completada.' });

      const ws = new WebSocket(`${payload.websocket_url}?conversation_id=${payload.conversation_id}`);
      wsRef.current = ws;
      ws.onopen = () => {
        setStatus('in-call');
        appendLog({ level: 'info', message: 'Conexión WebSocket establecida.' });
      };
      ws.onerror = () => {
        setError('Conexión inestable con ElevenLabs.');
        setStatus('error');
        appendLog({ level: 'error', message: 'Error en la conexión WebSocket con ElevenLabs.' });
        cleanUp({ keepStatus: true, reason: 'error' });
      };
      ws.onclose = () => {
        cleanUp();
      };
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
      setStatus('error');
      appendLog({
        level: 'error',
        message: 'Error inesperado al iniciar la conversación.',
        details: err instanceof Error ? err.message : String(err),
      });
      cleanUp({ keepStatus: true, reason: 'error' });
    }
  }, [agentId, apiKey, appendLog, cleanUp]);

  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs]);

  return (
    <section className="assistant">
      <div>
        <h2>Habla con el asistente oficial</h2>
        <p>
          Conéctate con el agente conversacional impulsado por ElevenLabs y resuelve tus dudas sobre
          el Mundial 2026 en tiempo real con voz natural.
        </p>
        <ul>
          <li>Agenda recordatorios de partidos y boletos.</li>
          <li>Descubre datos curiosos de selecciones y sedes.</li>
          <li>Recibe sugerencias de transporte y logística.</li>
        </ul>
      </div>
      <div className="assistant__panel">
        <audio ref={audioRef} autoPlay playsInline />
        <div className={`assistant__status assistant__status--${status}`}>
          Estado: {status === 'idle' && 'Listo'}
          {status === 'initializing' && 'Conectando…'}
          {status === 'in-call' && 'En llamada'}
          {status === 'error' && 'Error'}
        </div>
        <div className="assistant__actions">
          <button type="button" onClick={startConversation} disabled={status === 'initializing' || status === 'in-call'}>
            📞 Iniciar llamada
          </button>
          <button
            type="button"
            onClick={() => cleanUp()}
            disabled={status !== 'in-call'}
            className="assistant__hangup"
          >
            ✖️ Finalizar
          </button>
        </div>
        {error && <p className="assistant__error">{error}</p>}
        {!apiKey && !agentId && (
          <p className="assistant__note">
            Añade tus credenciales en un archivo <code>.env.local</code> con las claves VITE_ELEVENLABS_API_KEY y
            VITE_ELEVENLABS_AGENT_ID.
          </p>
        )}
        <div className="assistant__logsPanel">
          <button
            type="button"
            className="assistant__logsToggle"
            onClick={() => {
              if (!showLogs) {
                refreshLogs();
              }
              setShowLogs((prev) => !prev);
            }}
          >
            {showLogs ? 'Ocultar registros' : 'Ver registros de ElevenLabs'}
          </button>
          {showLogs && (
            <div className="assistant__logs">
              <div className="assistant__logsHeader">
                <span>Últimos eventos</span>
                <button
                  type="button"
                  onClick={() => {
                    clearElevenLabsLogs();
                    refreshLogs();
                  }}
                >
                  Limpiar
                </button>
              </div>
              {sortedLogs.length === 0 ? (
                <p className="assistant__logsEmpty">Aún no hay registros almacenados.</p>
              ) : (
                <ul>
                  {sortedLogs.map((item) => (
                    <li key={`${item.timestamp}-${item.message}`} className={`assistant__log assistant__log--${item.level}`}>
                      <span className="assistant__logTime">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                      <span className="assistant__logMessage">{item.message}</span>
                      {item.details && <pre className="assistant__logDetails">{item.details}</pre>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
