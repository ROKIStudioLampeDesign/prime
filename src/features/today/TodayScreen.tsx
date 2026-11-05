import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Screen } from '../../components/Screen';
import { useToday } from '../../components/useToday';
import { fromLocalDate } from '../../domain/date';
import { BackupReminder } from './BackupReminder';
import { GymCard, NutritionCard, ProteinCard, StreaksCard, WeightCard } from './TodayCards';

/** / — the day at a glance: what was eaten, the workout, the weigh-in. Each band opens its section. */
export function TodayScreen() {
  const today = useToday();

  return (
    <Screen title="Aujourd'hui" subtitle={format(fromLocalDate(today), 'EEEE d MMMM', { locale: fr })} fill>
      <BackupReminder />
      {/* Full-width bands, no gaps: energy, then protein and weight sharing a paper row, then gym. */}
      <NutritionCard today={today} />
      <div className="bleed grid grid-cols-2 bg-paper text-ink">
        <ProteinCard today={today} />
        <WeightCard today={today} />
      </div>
      <StreaksCard today={today} />
      {/* Last, and grows to the tab bar: its "Commencer une séance" button stays within thumb reach. */}
      <GymCard today={today} />
    </Screen>
  );
}
