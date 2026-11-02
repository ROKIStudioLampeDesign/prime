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
    <span className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted uppercase">
      Perso
    </span>
  );
}
