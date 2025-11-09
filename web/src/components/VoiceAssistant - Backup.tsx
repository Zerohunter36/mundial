import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './VoiceAssistant.css';
import {
  appendElevenLabsLog,
  clearElevenLabsLogs,
  ElevenLabsLogEntry,
  getElevenLabsLogs,
} from '../utils/logs';
import { Conversation } from '@elevenlabs/client';

type CallStatus = 'idle' | 'initializing' | 'in-call' | 'error';

export const VoiceAssistant = () => {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY as string | undefined;
  const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID as string | undefined;

  const [status, setStatus] = useState<CallStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<ElevenLabsLogEntry[]>(() => getElevenLabsLogs());
  const [showLogs, setShowLogs] = useState(false);

  // Sesión de conversación de ElevenLabs (SDK nuevo)
  const conversationRef = useRef<any | null>(null);

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

  const cleanUp = useCallback(
    (options?: { keepStatus?: boolean; reason?: 'error' | 'ended' }) => {
      if (conversationRef.current) {
        // endSession devuelve una Promise; la ignoramos a propósito
        conversationRef.current.endSession?.().catch(() => {});
        conversationRef.current = null;
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
    },
    [appendLog],
  );

  // Cerrar sesión si el componente se desmonta
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

    // Verificamos soporte de getUserMedia como en tu demo HTML
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      const msg =
        'El navegador no soporta captura de audio (getUserMedia). Abre la app en HTTPS ' +
        'o usa la última versión de Chrome/Edge.';
      setError(msg);
      setStatus('error');
      appendLog({
        level: 'error',
        message:
          'El navegador no expone navigator.mediaDevices.getUserMedia. Verifica que accedes por HTTPS y con un navegador compatible.',
      });
      return;
    }

    setError(null);
    setStatus('initializing');
    appendLog({ level: 'info', message: 'Iniciando sesión de voz con ElevenLabs.' });

    try {
      // Esto solo fuerza el permiso de micrófono, igual que en tu HTML de bancos
      await navigator.mediaDevices.getUserMedia({ audio: true });
      appendLog({ level: 'info', message: 'Micrófono autorizado por el usuario.' });

      // SDK nuevo de ElevenLabs: igual que en ia_bancos.html
      conversationRef.current = await Conversation.startSession({
        agentId,
        apiKey,
        onConnect: () => {
          setStatus('in-call');
          appendLog({ level: 'info', message: 'Sesión de voz conectada con ElevenLabs.' });
        },
        onDisconnect: () => {
          appendLog({ level: 'info', message: 'Sesión de voz desconectada.' });
          cleanUp({ reason: 'ended' });
        },
        onError: (err: any) => {
          console.error('Error en sesión ElevenLabs:', err);
          const message = err?.message || 'Error desconocido en la sesión de voz.';
          setError(message);
          setStatus('error');
          appendLog({
            level: 'error',
            message: 'Error en la sesión de voz con ElevenLabs.',
            details: message,
          });
          cleanUp({ keepStatus: true, reason: 'error' });
        },
        onModeChange: (mode: any) => {
          // mode.mode suele ser 'listening' | 'speaking' | 'idle'
          appendLog({
            level: 'info',
            message: `Modo del agente cambiado a: ${mode.mode ?? JSON.stringify(mode)}`,
          });
        },
        onUserTranscript: (evt: any) => {
          if (evt?.user_transcript) {
            appendLog({
              level: 'info',
              message: `Usuario: ${evt.user_transcript}`,
            });
          }
        },
        onAgentResponse: (evt: any) => {
          if (evt?.agent_response) {
            appendLog({
              level: 'info',
              message: `Agente: ${evt.agent_response}`,
            });
          }
        },
      });
    } catch (err: any) {
      console.error('Error al iniciar la conversación:', err);
      const message = err?.message || 'Error inesperado al iniciar la conversación.';
      setError(message);
      setStatus('error');
      appendLog({
        level: 'error',
        message: 'Error inesperado al iniciar la conversación.',
        details: message,
      });
      cleanUp({ keepStatus: true, reason: 'error' });
    }
  }, [agentId, apiKey, appendLog, cleanUp]);

  const sortedLogs = useMemo(
    () => [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [logs],
  );

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
        <div className={`assistant__status assistant__status--${status}`}>
          Estado: {status === 'idle' && 'Listo'}
          {status === 'initializing' && 'Conectando…'}
          {status === 'in-call' && 'En llamada'}
          {status === 'error' && 'Error'}
        </div>
        <div className="assistant__actions">
          <button
            type="button"
            onClick={startConversation}
            disabled={status === 'initializing' || status === 'in-call'}
          >
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
            Añade tus credenciales en un archivo <code>.env.local</code> con las claves
            VITE_ELEVENLABS_API_KEY y VITE_ELEVENLABS_AGENT_ID.
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
                    <li
                      key={`${item.timestamp}-${item.message}`}
                      className={`assistant__log assistant__log--${item.level}`}
                    >
                      <span className="assistant__logTime">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                      <span className="assistant__logMessage">{item.message}</span>
                      {item.details && (
                        <pre className="assistant__logDetails">{item.details}</pre>
                      )}
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
