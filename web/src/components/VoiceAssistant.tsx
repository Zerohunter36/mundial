import { useCallback, useEffect, useRef, useState } from 'react';
import './VoiceAssistant.css';

type CallStatus = 'idle' | 'initializing' | 'in-call' | 'error';

interface ElevenLabsSessionResponse {
  conversation_id: string;
  rtc_session_id: string;
  ice_servers: RTCIceServer[];
  websocket_url: string;
}

export const VoiceAssistant = () => {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY as string | undefined;
  const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID as string | undefined;

  const [status, setStatus] = useState<CallStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const cleanUp = useCallback(() => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
    setStatus('idle');
  }, []);

  useEffect(() => cleanUp, [cleanUp]);

  const startConversation = useCallback(async () => {
    if (!apiKey || !agentId) {
      setError('Configura las variables VITE_ELEVENLABS_API_KEY y VITE_ELEVENLABS_AGENT_ID.');
      setStatus('error');
      return;
    }

    setError(null);
    setStatus('initializing');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const response = await fetch('https://api.elevenlabs.io/v1/convai/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({ agent_id: agentId }),
      });

      if (!response.ok) {
        throw new Error('No se pudo iniciar la llamada con el asistente.');
      }

      const payload = (await response.json()) as ElevenLabsSessionResponse;

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
        throw new Error('No se pudo negociar la llamada de audio.');
      }

      const sdpPayload = await sdpResponse.json();
      if (sdpPayload?.sdp && sdpPayload?.type) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(sdpPayload));
      }

      const ws = new WebSocket(`${payload.websocket_url}?conversation_id=${payload.conversation_id}`);
      wsRef.current = ws;
      ws.onopen = () => {
        setStatus('in-call');
      };
      ws.onerror = () => {
        setError('Conexión inestable con ElevenLabs.');
        setStatus('error');
        appendLog({ level: 'error', message: 'Error en la conexión WebSocket con ElevenLabs.' });
        cleanUp();
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
      cleanUp();
    }
  }, [agentId, apiKey, appendLog, cleanUp]);

  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs]);
      cleanUp();
    }
  }, [agentId, apiKey, cleanUp]);

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
          <button type="button" onClick={cleanUp} disabled={status !== 'in-call'} className="assistant__hangup">
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
