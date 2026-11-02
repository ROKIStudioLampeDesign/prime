import { SubTabs } from '../../components/SubTabs';

const TABS = [
  { to: '/nutrition', label: 'Journal', end: true },
  { to: '/nutrition/foods', label: 'Produits' },
  { to: '/nutrition/meals', label: 'Plats' },
];

/** Journal / Produits / Plats switch at the top of the Alimentation section. */
export function NutritionTabs() {
  return <SubTabs label="Alimentation" tabs={TABS} />;
}
