import { SubTabs } from '../../components/SubTabs';

const TABS = [
  { to: '/nutrition', label: 'Journal', end: true },
  { to: '/nutrition/foods', label: 'Produits' },
  { to: '/nutrition/meals', label: 'Plats' },
  { to: '/nutrition/courses', label: 'Courses' },
];

/** Journal / Produits / Plats / Courses switch at the top of the Alimentation section. */
export function NutritionTabs() {
  return <SubTabs label="Alimentation" tabs={TABS} />;
}
