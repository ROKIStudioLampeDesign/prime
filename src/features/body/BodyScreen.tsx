import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';

export function BodyScreen() {
  return (
    <Screen title="Corps">
      <EmptyState title="Aucune mesure" description="Ton poids et tes mensurations apparaîtront ici." />
    </Screen>
  );
}
