import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';

export function TodayScreen() {
  const today = format(new Date(), 'EEEE d MMMM', { locale: fr });

  return (
    <Screen title="Aujourd'hui">
      <p className="text-sm text-muted first-letter:uppercase">{today}</p>
      <EmptyState
        title="Rien pour l'instant"
        description="Ton résumé du jour (repas, séance, poids) apparaîtra ici."
      />
    </Screen>
  );
}
