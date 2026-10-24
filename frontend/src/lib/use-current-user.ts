import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, ApiError } from './api';

type CurrentUser = { id: string; username: string; email: string; role: 'USER' | 'ADMIN' };
type AccessState = {
  path: string;
  attempt: number;
  status: 'checking' | 'authenticated' | 'anonymous' | 'error';
  user: CurrentUser | null;
};

export function useCurrentUser(retry = 0) {
  const { pathname } = useLocation();
  const [access, setAccess] = useState<AccessState>({
    path: '',
    attempt: -1,
    status: 'checking',
    user: null,
  });

  useEffect(() => {
    let active = true;
    api<CurrentUser>('/auth/protected')
      .then((user) => {
        if (active) setAccess({ path: pathname, attempt: retry, status: 'authenticated', user });
      })
      .catch((error: unknown) => {
        if (active) {
          setAccess({
            path: pathname,
            attempt: retry,
            status: error instanceof ApiError && error.status === 401 ? 'anonymous' : 'error',
            user: null,
          });
        }
      });
    return () => {
      active = false;
    };
  }, [pathname, retry]);

  return access.path === pathname && access.attempt === retry
    ? access
    : { ...access, status: 'checking' as const, user: null };
}
