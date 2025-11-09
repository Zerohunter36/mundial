import { Coordinates, Match } from '../types';

const R = 6371; // Earth radius in km

export const haversineDistance = (a: Coordinates, b: Coordinates): number => {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return R * c;
};

export const getClosestMatches = (
  matches: Match[],
  location: Coordinates | null,
  limit = 6,
): Array<Match & { distanceKm?: number }> => {
  if (!location) {
    return matches.slice(0, limit);
  }

  return matches
    .map((match) => ({
      ...match,
      distanceKm: haversineDistance(location, { lat: match.lat, lng: match.lng }),
    }))
    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
    .slice(0, limit);
};
