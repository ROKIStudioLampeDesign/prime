import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './app/router';
import { requestPersistentStorage } from './db/persist';
import { setSetting } from './db/settings';
import './index.css';

// Idempotent: cheap when already granted, and retried each launch in case Safari
// only grants it after the app is added to the home screen.
void requestPersistentStorage().then((granted) => setSetting('storagePersisted', granted));

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing #root element');

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
