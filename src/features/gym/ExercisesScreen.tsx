import { useNavigate } from 'react-router';
import { Fab } from '../../components/Fab';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import { ExerciseList } from './ExerciseList';
import { useExercisesById } from './exerciseData';
import { GymTabs } from './shared';

export function ExercisesScreen() {
  const exercises = useExercisesById();
  const navigate = useNavigate();

  return (
    <Screen title="Salle">
      <GymTabs />
      {exercises === undefined ? (
        <Loading />
      ) : (
        <ExerciseList
          exercises={[...exercises.values()]}
          onSelect={(e) => void navigate(`/gym/exercises/${e.id}`)}
        />
      )}
      <div className="h-16" />
      <Fab to="/gym/exercises/new" label="Créer un exercice" />
    </Screen>
  );
}
