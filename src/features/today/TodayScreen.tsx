import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Screen } from '../../components/Screen';
import { useToday } from '../../components/useToday';
import { fromLocalDate } from '../../domain/date';
import { BackupReminder } from './BackupReminder';
import { GymCard, NutritionCard, WeightCard } from './TodayCards';

/** / — the day at a glance: what was eaten, the workout, the weigh-in. Each card opens its section. */
export function TodayScreen() {
  const today = useToday();

  return (
    <Screen title="Aujourd'hui">
      <p className="mb-3 text-sm text-muted first-letter:uppercase">
        {format(fromLocalDate(today), 'EEEE d MMMM', { locale: fr })}
      </p>
      <BackupReminder />
      {/* Bento grid: energy and gym tiles span both columns, protein and weight share a row. */}
      <div className="grid grid-cols-2 gap-3">
        <NutritionCard today={today} />
        <WeightCard today={today} />
        {/* Last: its "Commencer une séance" button stays within thumb reach. */}
        <GymCard today={today} />
      </div>
    </Screen>
  );
}
