import { useEffect, useState } from 'react';
import { Coordinates } from '../types';

type GeolocationStatus = 'idle' | 'loading' | 'success' | 'error';

interface GeolocationState {
  status: GeolocationStatus;
  position: Coordinates | null;
  error?: string;
}

export const useGeolocation = (): GeolocationState => {
  const [state, setState] = useState<GeolocationState>({
    status: 'idle',
    position: null,
  });

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'error', position: null, error: 'Geolocalización no soportada' });
      return;
    }

    setState((prev) => ({ ...prev, status: 'loading' }));

    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          status: 'success',
          position: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          },
        });
      },
      (err) => {
        setState({ status: 'error', position: null, error: err.message });
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 60_000,
      },
    );

    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  return state;
};
