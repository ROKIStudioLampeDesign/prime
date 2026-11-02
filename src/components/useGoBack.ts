import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';

/** Goes back in history, or to `fallback` when the app was opened directly on this page. */
export function useGoBack(fallback = '/') {
  const navigate = useNavigate();
  const location = useLocation();
  return useCallback(() => {
    if (location.key !== 'default') void navigate(-1);
    else void navigate(fallback, { replace: true });
  }, [navigate, location.key, fallback]);
}
