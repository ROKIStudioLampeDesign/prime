import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';

export function StatsScreen() {
  return (
    <Screen title="Stats">
      <EmptyState
        title="Pas encore de données"
        description="Tes tendances apparaîtront dès que tu auras enregistré quelques jours."
      />
    </Screen>
  );
}
