import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { AccentRotation } from '../components/AccentRotation';
import { TabBar } from '../components/TabBar';
import { UpdatePrompt } from '../components/UpdatePrompt';
import { watchIosViewport } from '../lib/iosViewport';

export function AppLayout() {
  // iOS home-screen app: re-measure the viewport after launch so the tab bar sits at the bottom.
  useEffect(() => watchIosViewport(), []);

  return (
    <div className="min-h-dvh pb-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom))]">
      <AccentRotation />
      <Outlet />
      <TabBar />
      <UpdatePrompt />
    </div>
  );
}
