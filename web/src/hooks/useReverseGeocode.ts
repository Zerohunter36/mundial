import { useEffect, useState } from 'react';
import { Coordinates } from '../types';

interface ReverseGeocodeState {
  loading: boolean;
  data?: {
    city?: string;
    state?: string;
    country?: string;
    formatted?: string;
  };
  error?: string;
}

export const useReverseGeocode = (
  coords: Coordinates | null,
  apiKey: string | undefined,
): ReverseGeocodeState => {
  const [state, setState] = useState<ReverseGeocodeState>({ loading: false });

  useEffect(() => {
    if (!coords || !apiKey) {
      return;
    }

    const controller = new AbortController();
    const fetchLocation = async () => {
      setState({ loading: true });
      try {
        const params = new URLSearchParams({
          latlng: `${coords.lat},${coords.lng}`,
          key: apiKey,
          language: 'es',
        });
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error('No se pudo obtener la ubicación');
        }
        const payload = await response.json();
        const result = payload.results?.[0];
        if (!result) {
          setState({ loading: false });
          return;
        }
        const components: Record<string, string> = {};
        for (const component of result.address_components ?? []) {
          for (const type of component.types) {
            components[type] = component.long_name;
          }
        }
        setState({
          loading: false,
          data: {
            city: components.locality ?? components.sublocality ?? components.administrative_area_level_2,
            state: components.administrative_area_level_1,
            country: components.country,
            formatted: result.formatted_address,
          },
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        setState({ loading: false, error: (error as Error).message });
      }
    };

    fetchLocation();

    return () => controller.abort();
  }, [coords, apiKey]);

  return state;
};
