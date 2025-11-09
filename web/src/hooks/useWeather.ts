import { useEffect, useState } from 'react';
import { Coordinates } from '../types';

interface WeatherState {
  loading: boolean;
  temperatureC?: number;
  description?: string;
  icon?: string;
  error?: string;
}

export const useWeather = (
  coords: Coordinates | null,
  apiKey: string | undefined,
): WeatherState => {
  const [state, setState] = useState<WeatherState>({ loading: false });

  useEffect(() => {
    if (!coords || !apiKey) {
      return;
    }

    const controller = new AbortController();
    const fetchWeather = async () => {
      setState({ loading: true });
      try {
        const params = new URLSearchParams({
          lat: coords.lat.toString(),
          lon: coords.lng.toString(),
          appid: apiKey,
          units: 'metric',
          lang: 'es',
        });

        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?${params.toString()}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error('No se pudo obtener el clima actual');
        }
        const payload = await response.json();
        setState({
          loading: false,
          temperatureC: payload.main?.temp,
          description: payload.weather?.[0]?.description,
          icon: payload.weather?.[0]?.icon,
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        setState({ loading: false, error: (error as Error).message });
      }
    };

    fetchWeather();

    return () => controller.abort();
  }, [coords, apiKey]);

  return state;
};
