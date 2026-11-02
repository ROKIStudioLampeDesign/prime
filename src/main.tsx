import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './app/router';
import { requestPersistentStorage } from './db/persist';
import { getSetting, setSetting } from './db/settings';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Idempotent: cheap when already granted, and retried each launch in case Safari
// only grants it after the app is added to the home screen.
void requestPersistentStorage().then((granted) => setSetting('storagePersisted', granted));

// Reference date for the backup reminder when nothing was ever exported.
void getSetting<number>('firstLaunchAt').then((at) => {
  if (at === undefined) return setSetting('firstLaunchAt', Date.now());
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing #root element');

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
);
