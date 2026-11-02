import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from './AppLayout';
import { TodayScreen } from '../features/today/TodayScreen';
import { NutritionScreen } from '../features/nutrition/NutritionScreen';
import { GymScreen } from '../features/gym/GymScreen';
import { BodyScreen } from '../features/body/BodyScreen';
import { StatsScreen } from '../features/stats/StatsScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <TodayScreen /> },
      { path: 'nutrition', element: <NutritionScreen /> },
      { path: 'gym', element: <GymScreen /> },
      { path: 'body', element: <BodyScreen /> },
      { path: 'stats', element: <StatsScreen /> },
      { path: 'settings', element: <SettingsScreen /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
