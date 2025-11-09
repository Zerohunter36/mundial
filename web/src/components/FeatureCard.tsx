import type { ReactNode } from 'react';
import './FeatureCard.css';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  onClick?: () => void;
  active?: boolean;
}

export const FeatureCard = ({ title, description, icon, onClick, active }: FeatureCardProps) => (
  <button
    type="button"
    className={`feature-card ${active ? 'feature-card--active' : ''}`}
    onClick={onClick}
  >
    <div className="feature-card__icon">{icon}</div>
    <div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  </button>
);
