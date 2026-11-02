import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from './AppLayout';
import { TodayScreen } from '../features/today/TodayScreen';
import { DiaryScreen } from '../features/nutrition/DiaryScreen';
import { AddEntryScreen } from '../features/nutrition/AddEntryScreen';
import { FoodsScreen } from '../features/nutrition/FoodsScreen';
import { FoodFormScreen } from '../features/nutrition/FoodFormScreen';
import { GoalsScreen } from '../features/nutrition/GoalsScreen';
import { GymScreen } from '../features/gym/GymScreen';
import { BodyScreen } from '../features/body/BodyScreen';
import { StatsScreen } from '../features/stats/StatsScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <TodayScreen /> },
      { path: 'nutrition', element: <DiaryScreen /> },
      { path: 'nutrition/add', element: <AddEntryScreen /> },
      { path: 'nutrition/foods', element: <FoodsScreen /> },
      { path: 'nutrition/foods/new', element: <FoodFormScreen /> },
      { path: 'nutrition/foods/:id', element: <FoodFormScreen /> },
      { path: 'gym', element: <GymScreen /> },
      { path: 'body', element: <BodyScreen /> },
      { path: 'stats', element: <StatsScreen /> },
      { path: 'settings', element: <SettingsScreen /> },
      // Goals are nutrition data, edited from Réglages.
      { path: 'settings/goals', element: <GoalsScreen /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
