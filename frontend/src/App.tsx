import { useCallback, useEffect, useRef, useState } from 'react';
import AppRoutes from './routes/AppRoutes';
import { refreshSession } from './features/authentication';
import { useAppDispatch } from './store/hooks';
import { useCountdown } from './hooks/useCountdown';
import styles from './App.module.css';

type RestoreStatus = 'pending' | 'done' | 'unavailable' | 'rate-limited';

// Used when a 429 arrives without a readable Retry-After header.
const RATE_LIMIT_FALLBACK_SECONDS = 30;

const RESTORE_SCREENS = {
  unavailable: {
    title: "Can't reach the server",
    message: 'Check your internet connection and try again.',
  },
  'rate-limited': {
    title: 'Too many requests',
    message:
      "We're getting a lot of requests from your network. Please wait a moment.",
  },
};

function App() {
  const dispatch = useAppDispatch();
  const [restoreStatus, setRestoreStatus] = useState<RestoreStatus>('pending');
  const [isRetrying, setIsRetrying] = useState(false);
  // Keeps the retry button locked until the server will accept the
  // refresh again.
  const { secondsLeft, start: startRetryCountdown } = useCountdown();
  const hasStartedRestore = useRef(false);

  const restoreSession = useCallback(async () => {
    const result = await dispatch(refreshSession());
    const failure = refreshSession.rejected.match(result)
      ? result.payload
      : undefined;

    if (failure?.reason === 'rate-limited') {
      startRetryCountdown(
        failure.retryAfterSeconds ?? RATE_LIMIT_FALLBACK_SECONDS,
      );
      setRestoreStatus('rate-limited');
    } else {
      setRestoreStatus(
        failure?.reason === 'unavailable' ? 'unavailable' : 'done',
      );
    }

    setIsRetrying(false);
  }, [dispatch, startRetryCountdown]);

  useEffect(() => {
    if (hasStartedRestore.current) {
      return;
    }
    hasStartedRestore.current = true;

    restoreSession();
  }, [restoreSession]);

  const handleRetry = () => {
    setIsRetrying(true);
    restoreSession();
  };

  if (restoreStatus === 'pending') {
    return null;
  }

  if (restoreStatus === 'unavailable' || restoreStatus === 'rate-limited') {
    const { title, message } = RESTORE_SCREENS[restoreStatus];
    const isWaiting = restoreStatus === 'rate-limited' && secondsLeft > 0;

    let retryLabel = 'Try again';
    if (isRetrying) {
      retryLabel = 'Trying again...';
    } else if (isWaiting) {
      retryLabel = `Try again in ${secondsLeft}s`;
    }

    return (
      <main className={styles.sessionRestore}>
        <section className={styles.sessionRestore__content}>
          <h1 className={styles.sessionRestore__title}>{title}</h1>
          <p className={styles.sessionRestore__message}>{message}</p>
          <button
            type="button"
            className={styles.sessionRestore__retry}
            onClick={handleRetry}
            disabled={isRetrying || isWaiting}
          >
            {retryLabel}
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
