import { useCallback, useEffect, useRef, useState } from 'react';
import AppRoutes from './routes/AppRoutes';
import { refreshSession } from './features/authentication';
import { useAppDispatch } from './store/hooks';
import styles from './App.module.css';

type RestoreStatus = 'pending' | 'done' | 'unavailable' | 'retrying';

function App() {
  const dispatch = useAppDispatch();
  const [restoreStatus, setRestoreStatus] = useState<RestoreStatus>('pending');
  const hasStartedRestore = useRef(false);

  const restoreSession = useCallback(async () => {
    const result = await dispatch(refreshSession());
    const isUnavailable =
      refreshSession.rejected.match(result) && result.payload === 'unavailable';

    setRestoreStatus(isUnavailable ? 'unavailable' : 'done');
  }, [dispatch]);

  useEffect(() => {
    if (hasStartedRestore.current) {
      return;
    }
    hasStartedRestore.current = true;

    restoreSession();
  }, [restoreSession]);

  const handleRetry = () => {
    setRestoreStatus('retrying');
    restoreSession();
  };

  if (restoreStatus === 'pending') {
    return null;
  }

  if (restoreStatus === 'unavailable' || restoreStatus === 'retrying') {
    const isRetrying = restoreStatus === 'retrying';

    return (
      <main className={styles.sessionRestore}>
        <section className={styles.sessionRestore__content}>
          <h1 className={styles.sessionRestore__title}>
            Can&apos;t reach the server
          </h1>
          <p className={styles.sessionRestore__message}>
            Check your internet connection and try again.
          </p>
          <button
            type="button"
            className={styles.sessionRestore__retry}
            onClick={handleRetry}
            disabled={isRetrying}
          >
            {isRetrying ? 'Trying again...' : 'Try again'}
          </button>
        </section>
      </main>
    );
  }

  return (
    <div>
      <AppRoutes />
    </div>
  );
}

export default App;
