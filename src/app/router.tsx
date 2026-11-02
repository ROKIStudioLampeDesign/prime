import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from './AppLayout';
import { Loading } from '../components/Loading';
import { TodayScreen } from '../features/today/TodayScreen';
import { DiaryScreen } from '../features/nutrition/DiaryScreen';
import { AddEntryScreen } from '../features/nutrition/AddEntryScreen';
import { FoodsScreen } from '../features/nutrition/FoodsScreen';
import { FoodFormScreen } from '../features/nutrition/FoodFormScreen';
import { GoalsScreen } from '../features/nutrition/GoalsScreen';
import { MealsScreen } from '../features/nutrition/MealsScreen';
import { MealFormScreen } from '../features/nutrition/MealFormScreen';
import { CalendarScreen } from '../features/gym/CalendarScreen';
import { HistoryScreen } from '../features/gym/HistoryScreen';
import { TemplatesScreen } from '../features/gym/TemplatesScreen';
import { TemplateFormScreen } from '../features/gym/TemplateFormScreen';
import { ExercisesScreen } from '../features/gym/ExercisesScreen';
import { ExerciseFormScreen } from '../features/gym/ExerciseFormScreen';
import { WorkoutScreen } from '../features/gym/WorkoutScreen';
import { WorkoutSummaryScreen } from '../features/gym/WorkoutSummaryScreen';
import { BodyScreen } from '../features/body/BodyScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    // Shown while a lazy route loads on first render.
    hydrateFallbackElement: <Loading />,
    children: [
      { index: true, element: <TodayScreen /> },
      { path: 'nutrition', element: <DiaryScreen /> },
      { path: 'nutrition/add', element: <AddEntryScreen /> },
      { path: 'nutrition/foods', element: <FoodsScreen /> },
      { path: 'nutrition/foods/new', element: <FoodFormScreen /> },
      { path: 'nutrition/foods/:id', element: <FoodFormScreen /> },
      { path: 'nutrition/meals', element: <MealsScreen /> },
      { path: 'nutrition/meals/new', element: <MealFormScreen /> },
      { path: 'nutrition/meals/:id', element: <MealFormScreen /> },
      { path: 'gym', element: <CalendarScreen /> },
      { path: 'gym/history', element: <HistoryScreen /> },
      { path: 'gym/templates', element: <TemplatesScreen /> },
      { path: 'gym/templates/new', element: <TemplateFormScreen /> },
      { path: 'gym/templates/:id', element: <TemplateFormScreen /> },
      { path: 'gym/exercises', element: <ExercisesScreen /> },
      { path: 'gym/exercises/new', element: <ExerciseFormScreen /> },
      { path: 'gym/exercises/:id', element: <ExerciseFormScreen /> },
      { path: 'gym/workout/:id', element: <WorkoutScreen /> },
      { path: 'gym/workout/:id/summary', element: <WorkoutSummaryScreen /> },
      { path: 'body', element: <BodyScreen /> },
      // Stats screens are lazy-loaded: they carry Recharts, which the rest of the app doesn't need.
      {
        path: 'stats',
        lazy: async () => ({ Component: (await import('../features/stats/WeightScreen')).WeightScreen }),
      },
      {
        path: 'stats/progress',
        lazy: async () => ({
          Component: (await import('../features/stats/ProgressionScreen')).ProgressionScreen,
        }),
      },
      {
        path: 'stats/records',
        lazy: async () => ({ Component: (await import('../features/stats/RecordsScreen')).RecordsScreen }),
      },
      {
        path: 'stats/week',
        lazy: async () => ({ Component: (await import('../features/stats/WeekScreen')).WeekScreen }),
      },
      { path: 'settings', element: <SettingsScreen /> },
      // Goals are nutrition data, edited from Réglages.
      { path: 'settings/goals', element: <GoalsScreen /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
