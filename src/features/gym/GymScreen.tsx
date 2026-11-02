import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';

export function GymScreen() {
  return (
    <Screen title="Salle">
      <EmptyState title="Aucune séance" description="Tes séances et tes exercices apparaîtront ici." />
    </Screen>
  );
}
