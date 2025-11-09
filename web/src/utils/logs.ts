export type ElevenLabsLogLevel = 'info' | 'error';

export interface ElevenLabsLogEntry {
  timestamp: string;
  level: ElevenLabsLogLevel;
  message: string;
  details?: string;
}

const STORAGE_KEY = 'mundial_elevenlabs_logs';
const MAX_LOGS = 200;

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readRawLogs = (): ElevenLabsLogEntry[] => {
  if (!isBrowser) {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as ElevenLabsLogEntry[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry) => Boolean(entry?.timestamp && entry?.level && entry?.message));
  } catch (error) {
    console.error('No se pudieron leer los registros de ElevenLabs.', error);
    return [];
  }
};

const writeRawLogs = (entries: ElevenLabsLogEntry[]) => {
  if (!isBrowser) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_LOGS)));
  } catch (error) {
    console.error('No se pudieron guardar los registros de ElevenLabs.', error);
  }
};

export const getElevenLabsLogs = (): ElevenLabsLogEntry[] => readRawLogs();

export const appendElevenLabsLog = (
  entry: Omit<ElevenLabsLogEntry, 'timestamp'> & { timestamp?: string },
): ElevenLabsLogEntry | null => {
  if (!isBrowser) {
    return null;
  }

  const normalized: ElevenLabsLogEntry = {
    timestamp: entry.timestamp ?? new Date().toISOString(),
    level: entry.level,
    message: entry.message,
    details: entry.details,
  };

  const current = readRawLogs();
  current.push(normalized);
  writeRawLogs(current);
  return normalized;
};

export const clearElevenLabsLogs = () => {
  if (!isBrowser) {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('No se pudieron limpiar los registros de ElevenLabs.', error);
  }
};
