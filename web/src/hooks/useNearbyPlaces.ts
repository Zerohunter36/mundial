import { useCallback, useEffect, useState } from 'react';
import { Coordinates, PlaceCategory, PlaceResultItem } from '../types';

interface UseNearbyPlacesParams {
  map: google.maps.Map | null;
  location: Coordinates | null;
  radius: number;
  categories: PlaceCategory[];
}

interface NearbyPlacesState {
  loading: boolean;
  results: Record<PlaceCategory, PlaceResultItem[]>;
  error?: string;
}

const initialState: NearbyPlacesState = {
  loading: false,
  results: {
    lodging: [],
    restaurant: [],
    tourist_attraction: [],
    atm: [],
    transit_station: [],
  },
};

export const useNearbyPlaces = ({ map, location, radius, categories }: UseNearbyPlacesParams) => {
  const [state, setState] = useState<NearbyPlacesState>(initialState);

  const searchPlaces = useCallback(() => {
    if (!map || !location) {
      return;
    }

    const service = new google.maps.places.PlacesService(map);
    setState((prev) => ({ ...prev, loading: true }));

    categories.forEach((category) => {
      const request: google.maps.places.PlaceSearchRequest = {
        location,
        radius,
        type: category,
        openNow: false,
      };

      service.nearbySearch(request, (results, status) => {
        setState((prev) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
            return {
              ...prev,
              loading: false,
              error: status !== google.maps.places.PlacesServiceStatus.OK ? status : prev.error,
            };
          }
          return {
            loading: false,
            error: prev.error,
            results: {
              ...prev.results,
              [category]: results.map((place) => ({
                id: place.place_id ?? `${place.name}-${category}`,
                name: place.name ?? 'Ubicación sin nombre',
                location: {
                  lat: place.geometry?.location?.lat() ?? 0,
                  lng: place.geometry?.location?.lng() ?? 0,
                },
                vicinity: place.vicinity,
                rating: place.rating ?? undefined,
                userRatingsTotal: place.user_ratings_total ?? undefined,
                icon: place.icon,
                types: place.types ?? undefined,
              })),
            },
          };
        });
      });
    });
  }, [map, location, radius, categories]);

  useEffect(() => {
    searchPlaces();
  }, [searchPlaces]);

  return { ...state, refresh: searchPlaces };
};
