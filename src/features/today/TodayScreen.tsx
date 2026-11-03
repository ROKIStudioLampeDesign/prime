import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToday } from '../../components/useToday';
import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';
import { fromLocalDate } from '../../domain/date';
import { BackupReminder } from './BackupReminder';

export function TodayScreen() {
  const today = format(fromLocalDate(useToday()), 'EEEE d MMMM', { locale: fr });

  return (
    <Screen title="Aujourd'hui">
      <BackupReminder />
      <p className="text-sm text-muted first-letter:uppercase">{today}</p>
      <EmptyState
        title="Rien pour l'instant"
        description="Ton résumé du jour (repas, séance, poids) apparaîtra ici."
      />
    </Screen>
  );
}
