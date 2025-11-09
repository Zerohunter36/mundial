import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Match } from '../types';
import './ScheduleList.css';

interface ScheduleListProps {
  matches: Array<Match & { distanceKm?: number }>;
}

export const ScheduleList = ({ matches }: ScheduleListProps) => {
  if (!matches.length) {
    return (
      <div className="schedule-card schedule-card--empty">
        No hay partidos cercanos en los próximos días. Ajusta el radio o revisa más tarde.
      </div>
    );
  }

  return (
    <div className="schedule-list">
      {matches.map((match) => {
        const date = parseISO(match.date);
        return (
          <article key={match.id} className="schedule-card">
            <header>
              <h4>
                {match.homeTeam} vs {match.awayTeam}
              </h4>
              <span>{format(date, "EEEE d 'de' MMMM, HH:mm", { locale: es })}</span>
            </header>
            <p>
              {match.stadium} · {match.city}, {match.state}
            </p>
            {match.distanceKm !== undefined && (
              <p className="schedule-card__distance">
                A {match.distanceKm.toFixed(0)} km de tu ubicación
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
};
