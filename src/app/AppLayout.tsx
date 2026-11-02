import { Outlet } from 'react-router';
import { TabBar } from '../components/TabBar';
import { UpdatePrompt } from '../components/UpdatePrompt';

export function AppLayout() {
  return (
    <div className="min-h-dvh pb-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom))]">
      <Outlet />
      <TabBar />
      <UpdatePrompt />
    </div>
  );
}
