import { SubTabs } from '../../components/SubTabs';

const GYM_TABS = [
  { to: '/gym', label: 'Calendrier', end: true },
  { to: '/gym/history', label: 'Historique' },
  { to: '/gym/templates', label: 'Modèles' },
  { to: '/gym/exercises', label: 'Exercices' },
];

export function GymTabs() {
  return <SubTabs label="Salle" tabs={GYM_TABS} />;
}

export function CustomBadge() {
  return (
    <span className="shrink-0 bg-surface-2 px-1.5 py-0.5 text-[11px] font-extrabold text-muted">Perso</span>
  );
}
