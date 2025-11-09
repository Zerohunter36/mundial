export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string; // ISO string in UTC
  stadium: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export type PlaceCategory =
  | 'lodging'
  | 'restaurant'
  | 'tourist_attraction'
  | 'atm'
  | 'transit_station';

export interface PlaceResultItem {
  id: string;
  name: string;
  location: Coordinates;
  vicinity?: string;
  rating?: number;
  userRatingsTotal?: number;
  icon?: string;
  types?: string[];
}
