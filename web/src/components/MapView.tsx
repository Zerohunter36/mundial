import { useEffect, useMemo, useState } from 'react';
import { Circle, GoogleMap, Marker, TransitLayer, useLoadScript } from '@react-google-maps/api';
import { useNearbyPlaces } from '../hooks/useNearbyPlaces';
import { Coordinates, PlaceCategory } from '../types';
import './MapView.css';

const libraries: ('places')[] = ['places'];

const categories: Array<{
  id: PlaceCategory;
  label: string;
  description: string;
  color: string;
  icon: string;
}> = [
  {
    id: 'lodging',
    label: 'Hoteles',
    description: 'Hospedajes cercanos',
    color: '#fb923c',
    icon: '🏨',
  },
  {
    id: 'restaurant',
    label: 'Restaurantes',
    description: 'Sabores locales e internacionales',
    color: '#f97316',
    icon: '🍽️',
  },
  {
    id: 'tourist_attraction',
    label: 'Interés turístico',
    description: 'Lugares imperdibles',
    color: '#6366f1',
    icon: '📸',
  },
  {
    id: 'atm',
    label: 'Cajeros ATM',
    description: 'Efectivo disponible',
    color: '#22c55e',
    icon: '🏧',
  },
  {
    id: 'transit_station',
    label: 'Transporte',
    description: 'Estaciones y rutas',
    color: '#0ea5e9',
    icon: '🚌',
  },
];

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  styles: [
    {
      elementType: 'geometry',
      stylers: [{ color: '#f2f2f2' }],
    },
    {
      elementType: 'labels.text.stroke',
      stylers: [{ color: '#f8fafc' }],
    },
    {
      elementType: 'labels.text.fill',
      stylers: [{ color: '#475569' }],
    },
  ],
};

interface MapViewProps {
  center: Coordinates | null;
  radiusKm?: number;
  activeCategory?: PlaceCategory;
  onCategoryChange?: (category: PlaceCategory) => void;
}

export const MapView = ({ center, radiusKm = 5, activeCategory, onCategoryChange }: MapViewProps) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [internalCategory, setInternalCategory] = useState<PlaceCategory>('lodging');
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  useEffect(() => {
    if (activeCategory) {
      setInternalCategory(activeCategory);
    }
  }, [activeCategory]);

  const effectiveCategory = activeCategory ?? internalCategory;

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey ?? '',
    libraries,
    region: 'US',
    language: 'es',
  });

  const { results, loading, error, refresh } = useNearbyPlaces({
    map,
    location: center,
    radius: radiusKm * 1000,
    categories: categories.map((item) => item.id),
  });

  const markers = useMemo(() => results[effectiveCategory] ?? [], [results, effectiveCategory]);

  const currentCategory = categories.find((item) => item.id === effectiveCategory);

  const handleCategorySelect = (category: PlaceCategory) => {
    if (!activeCategory) {
      setInternalCategory(category);
    }
    onCategoryChange?.(category);
  };

  return (
    <section className="map-section" id="mapa">
      <header className="map-section__header">
        <div>
          <h2>Explora tu sede mundialista</h2>
          <p>Hoteles, comida, atracciones, cajeros y transporte a un clic.</p>
        </div>
        <button className="map-section__refresh" type="button" onClick={refresh}>
          ↻ Actualizar resultados
        </button>
      </header>

      <div className="map-section__content">
        <aside className="map-section__sidebar">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`map-category ${effectiveCategory === category.id ? 'map-category--active' : ''}`}
              onClick={() => handleCategorySelect(category.id)}
            >
              <span className="map-category__icon" style={{ backgroundColor: category.color }}>
                {category.icon}
              </span>
              <div>
                <strong>{category.label}</strong>
                <p>{category.description}</p>
                <small>
                  {results[category.id]?.length ? `${results[category.id].length} lugares` : 'Sin datos aún'}
                </small>
              </div>
            </button>
          ))}
        </aside>

        <div className="map-section__map">
          {!apiKey && (
            <div className="map-section__placeholder">
              <p>Configura tu VITE_GOOGLE_MAPS_API_KEY para visualizar el mapa interactivo.</p>
            </div>
          )}
          {apiKey && !isLoaded && !loadError && (
            <div className="map-section__placeholder">
              <p>Cargando mapa…</p>
            </div>
          )}
          {loadError && (
            <div className="map-section__placeholder">
              <p>Error al cargar Google Maps: {String(loadError)}</p>
            </div>
          )}
          {isLoaded && apiKey && (
            <GoogleMap
              mapContainerClassName="map-canvas"
              center={center ?? { lat: 19.4326, lng: -99.1332 }}
              zoom={center ? 13 : 4}
              options={mapOptions}
              onLoad={(mapInstance) => setMap(mapInstance)}
            >
              {center && (
                <Marker
                  position={center}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#f97316',
                    fillOpacity: 1,
                    strokeWeight: 3,
                    strokeColor: '#fb923c',
                  }}
                  title="Tu ubicación"
                />
              )}
              {markers.map((place) => (
                <Marker
                  key={place.id}
                  position={place.location}
                  title={place.name}
                  label={{
                    text: place.name,
                    fontSize: '11px',
                    color: '#1f2937',
                  }}
                />
              ))}
              <TransitLayer autoUpdate />
              {currentCategory && center && (
                <Circle
                  center={center}
                  radius={radiusKm * 1000}
                  options={{
                    strokeColor: currentCategory.color,
                    strokeOpacity: 0.6,
                    strokeWeight: 2,
                    fillColor: currentCategory.color,
                    fillOpacity: 0.08,
                  }}
                />
              )}
            </GoogleMap>
          )}
        </div>
      </div>

      {currentCategory && (
        <footer className="map-section__footer">
          <h3>
            {currentCategory.icon} {currentCategory.label}
          </h3>
          {loading && <p>Cargando sitios destacados…</p>}
          {error && <p className="map-section__error">{error}</p>}
          <div className="map-section__chips">
            {markers.slice(0, 6).map((place) => (
              <div key={place.id} className="map-chip">
                <strong>{place.name}</strong>
                {place.vicinity && <span>{place.vicinity}</span>}
                {place.rating && (
                  <small>
                    ⭐ {place.rating} ({place.userRatingsTotal ?? 0} reseñas)
                  </small>
                )}
              </div>
            ))}
            {!markers.length && !loading && !error && (
              <p>Aún no hay resultados disponibles en esta categoría.</p>
            )}
          </div>
        </footer>
      )}
    </section>
  );
};
