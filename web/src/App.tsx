import { useMemo, useState } from 'react';
import { FeatureCard } from './components/FeatureCard';
import { MapView } from './components/MapView';
import { ScheduleList } from './components/ScheduleList';
import { VoiceAssistant } from './components/VoiceAssistant';
import { worldCupMatches } from './data/matches';
import { useGeolocation } from './hooks/useGeolocation';
import { useReverseGeocode } from './hooks/useReverseGeocode';
import { useWeather } from './hooks/useWeather';
import { getClosestMatches } from './utils/distance';
import { PlaceCategory } from './types';
import './styles/App.css';

const featureItems = [
  {
    id: 'schedule',
    title: 'Horarios',
    description: 'Próximos partidos oficiales cerca de ti',
    icon: '⏱️',
    target: 'horarios',
  },
  {
    id: 'hotel',
    title: 'Mi hotel',
    description: 'Encuentra hospedaje disponible alrededor',
    icon: '🏨',
    target: 'mapa',
    category: 'lodging' as PlaceCategory,
  },
  {
    id: 'restaurants',
    title: 'Restaurantes',
    description: 'Reserva y descubre sabores locales',
    icon: '🍽️',
    target: 'mapa',
    category: 'restaurant' as PlaceCategory,
  },
  {
    id: 'attractions',
    title: 'Zonas de interés',
    description: 'Museos, plazas y experiencias imperdibles',
    icon: '📍',
    target: 'mapa',
    category: 'tourist_attraction' as PlaceCategory,
  },
  {
    id: 'atm',
    title: 'Cajeros ATM',
    description: 'Ubica puntos de retiro de efectivo',
    icon: '🏧',
    target: 'mapa',
    category: 'atm' as PlaceCategory,
  },
  {
    id: 'transport',
    title: 'Transporte',
    description: 'Consulta rutas y estaciones disponibles',
    icon: '🚌',
    target: 'mapa',
    category: 'transit_station' as PlaceCategory,
  },
  {
    id: 'assistant',
    title: 'Itinerario en vivo',
    description: 'Habla con el asistente oficial',
    icon: '🎙️',
    target: 'asistente',
  },
];

function App() {
  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const weatherApiKey = import.meta.env.VITE_OPENWEATHER_API_KEY as string | undefined;

  const { position, status: geoStatus, error: geoError } = useGeolocation();
  const { data: locationData } = useReverseGeocode(position, googleApiKey);
  const weather = useWeather(position, weatherApiKey);

  const [selectedFeature, setSelectedFeature] = useState(featureItems[0].id);
  const [mapCategory, setMapCategory] = useState<PlaceCategory>('lodging');

  const matches = useMemo(() => getClosestMatches(worldCupMatches, position ?? null), [position]);

  const handleFeatureClick = (featureId: string, target?: string, category?: PlaceCategory) => {
    setSelectedFeature(featureId);
    if (category) {
      setMapCategory(category);
    }
    if (target) {
      const element = document.getElementById(target);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="app">
      <header className="hero">
        <div className="hero__info">
          <p>Estás en:</p>
          <h1>
            {locationData?.city ?? 'Ubicación desconocida'}
            {locationData?.state ? `, ${locationData.state}` : ''}
          </h1>
          <div className="hero__weather">
            <div>
              <span className="hero__weather-label">Temperatura actual</span>
              <strong>
                {weather.temperatureC !== undefined ? `${Math.round(weather.temperatureC)}°C` : '--'}
              </strong>
            </div>
            {weather.description && <span className="hero__weather-desc">{weather.description}</span>}
          </div>
          {geoStatus === 'loading' && <small>Obteniendo tu ubicación…</small>}
          {geoError && <small className="hero__error">{geoError}</small>}
          {weather.error && <small className="hero__error">{weather.error}</small>}
        </div>
        <div className="hero__illustration">
          <div className="hero__ball" />
          <div className="hero__phone">
            <div className="hero__phone-screen">
              <span>Horarios</span>
              <span>Mi hotel</span>
              <span>Rutas</span>
              <span>Restaurantes</span>
              <span>Zonas de interés</span>
              <span>Cajeros</span>
              <span>Transporte</span>
              <span>Itinerario</span>
            </div>
          </div>
        </div>
      </header>

      <section className="feature-panel">
        {featureItems.map((feature) => (
          <FeatureCard
            key={feature.id}
            title={feature.title}
            description={feature.description}
            icon={<span className="feature-icon">{feature.icon}</span>}
            onClick={() => handleFeatureClick(feature.id, feature.target, feature.category)}
            active={selectedFeature === feature.id}
          />
        ))}
      </section>
      <section className="assistant-wrapper" id="asistente">
        <VoiceAssistant />
      </section>
      <section className="schedule" id="horarios">
        <div className="section-header">
          <h2>Horarios oficiales del Mundial 2026</h2>
          <p>Ordenados según tu ubicación actual y horario local.</p>
        </div>
        <ScheduleList matches={matches} />
      </section>
      <MapView center={position ?? null} activeCategory={mapCategory} onCategoryChange={setMapCategory} />
    </div>
  );
}

export default App;
