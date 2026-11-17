import type { ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from './AppLayout';
import { Loading } from '../components/Loading';
import { RouteError } from '../components/ErrorBoundary';
import { TodayScreen } from '../features/today/TodayScreen';
import { DiaryScreen } from '../features/nutrition/DiaryScreen';
import { AddEntryScreen } from '../features/nutrition/AddEntryScreen';
import { FoodsScreen } from '../features/nutrition/FoodsScreen';
import { MealsScreen } from '../features/nutrition/MealsScreen';
import { CalendarScreen } from '../features/gym/CalendarScreen';
import { WorkoutScreen } from '../features/gym/WorkoutScreen';
import { WorkoutSummaryScreen } from '../features/gym/WorkoutSummaryScreen';

/**
 * Lazy route for a screen module exporting `name`. Used for rarely visited screens (editors,
 * settings, history) so the main bundle stays small; every chunk is precached for offline use.
 */
function lazyScreen<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) {
  return async () => ({ Component: (await load())[name] });
}

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    // Shown while a lazy route loads on first render.
    hydrateFallbackElement: <Loading />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <TodayScreen /> },
      { path: 'nutrition', element: <DiaryScreen /> },
      { path: 'nutrition/add', element: <AddEntryScreen /> },
      {
        path: 'nutrition/adjust',
        lazy: lazyScreen(() => import('../features/nutrition/AdjustMealsScreen'), 'AdjustMealsScreen'),
      },
      { path: 'nutrition/foods', element: <FoodsScreen /> },
      {
        path: 'nutrition/foods/new',
        lazy: lazyScreen(() => import('../features/nutrition/FoodFormScreen'), 'FoodFormScreen'),
      },
      {
        path: 'nutrition/foods/:id',
        lazy: lazyScreen(() => import('../features/nutrition/FoodFormScreen'), 'FoodFormScreen'),
      },
      { path: 'nutrition/meals', element: <MealsScreen /> },
      {
        path: 'nutrition/meals/new',
        lazy: lazyScreen(() => import('../features/nutrition/MealFormScreen'), 'MealFormScreen'),
      },
      {
        path: 'nutrition/meals/:id',
        lazy: lazyScreen(() => import('../features/nutrition/MealFormScreen'), 'MealFormScreen'),
      },
      { path: 'gym', element: <CalendarScreen /> },
      {
        path: 'gym/history',
        lazy: lazyScreen(() => import('../features/gym/HistoryScreen'), 'HistoryScreen'),
      },
      {
        path: 'gym/templates',
        lazy: lazyScreen(() => import('../features/gym/TemplatesScreen'), 'TemplatesScreen'),
      },
      {
        path: 'gym/templates/new',
        lazy: lazyScreen(() => import('../features/gym/TemplateFormScreen'), 'TemplateFormScreen'),
      },
      {
        path: 'gym/templates/:id',
        lazy: lazyScreen(() => import('../features/gym/TemplateFormScreen'), 'TemplateFormScreen'),
      },
      {
        path: 'gym/exercises',
        lazy: lazyScreen(() => import('../features/gym/ExercisesScreen'), 'ExercisesScreen'),
      },
      {
        path: 'gym/exercises/new',
        lazy: lazyScreen(() => import('../features/gym/ExerciseFormScreen'), 'ExerciseFormScreen'),
      },
      {
        path: 'gym/exercises/:id',
        lazy: lazyScreen(() => import('../features/gym/ExerciseFormScreen'), 'ExerciseFormScreen'),
      },
      { path: 'gym/workout/:id', element: <WorkoutScreen /> },
      { path: 'gym/workout/:id/summary', element: <WorkoutSummaryScreen /> },
      // Lazy: the body map art (~70 kB gzipped) only loads when Corps is opened.
      { path: 'body', lazy: lazyScreen(() => import('../features/body/BodyScreen'), 'BodyScreen') },
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
      {
        path: 'settings',
        lazy: lazyScreen(() => import('../features/settings/SettingsScreen'), 'SettingsScreen'),
      },
      // Goals are nutrition data, edited from Réglages.
      {
        path: 'settings/goals',
        lazy: lazyScreen(() => import('../features/nutrition/GoalsScreen'), 'GoalsScreen'),
      },
      {
        path: 'settings/partners',
        lazy: lazyScreen(() => import('../features/settings/PartnersScreen'), 'PartnersScreen'),
      },
      {
        path: 'settings/partners/:id',
        lazy: lazyScreen(() => import('../features/settings/PartnerScreen'), 'PartnerScreen'),
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
