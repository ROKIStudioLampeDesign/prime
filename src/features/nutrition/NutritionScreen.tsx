import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';

export function NutritionScreen() {
  return (
    <Screen title="Alimentation">
      <EmptyState
        title="Aucun repas enregistré"
        description="Tes repas et tes macros du jour apparaîtront ici."
      />
    </Screen>
  );
}
