import { useState, type ChangeEvent, type SubmitEvent } from 'react';
import { Eye, EyeOff, KeyRound, Mailbox } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import Input from '../../components/ui/input/Input';
import {
  authService,
  isPasswordValid,
  logout,
  PasswordStrengthMeter,
  selectIsAuthenticated,
  type ResetPasswordRequest,
} from '../../features/authentication';
import styles from './ResetPasswordPage.module.css';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useAppDispatch, useAppSelector } from '../../store/hooks';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const {
    run: submitReset,
    isPending: isSubmitting,
    error,
  } = useAsyncAction(
    (payload: ResetPasswordRequest) => authService.resetPassword(payload),
    'This reset link is invalid or has expired. Please request a new one.',
  );
  const passwordsMismatch =
    confirmPassword !== '' && newPassword !== confirmPassword;
  const canSubmit =
    !!token &&
    isPasswordValid(newPassword) &&
    newPassword === confirmPassword &&
    !isSubmitting;

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      return;
    }

    if (await submitReset({ token, newPassword })) {
      // The server revoked every session of this account, this browser's
      // included, so a logged-in user has to sign in again.
      if (isAuthenticated) {
        await dispatch(logout());
      }
      setSucceeded(true);
    }
  };

  if (succeeded) {
    return (
      <main className={styles.page}>
        <section className={styles.container}>
          <header className={styles.header}>
            <div className={styles.iconBadge}>
              <KeyRound size={28} />
            </div>
            <h1 className={styles.title}>Password changed!</h1>
            <p className={styles.subtitle}>
              You&apos;ve successfully completed your password reset!
            </p>
          </header>
          <Link to="/login" className={styles.primaryButton}>
            Log In Now
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.container}>
        <header className={styles.header}>
          <div className={styles.iconBadge}>
            <Mailbox size={28} />
          </div>
          <h1 className={styles.title}>Reset password</h1>
          <p className={styles.subtitle}>Please kindly set your new password</p>
        </header>
        {!token ? (
          <p className={styles.resetPassword__error}>
            This reset link is invalid or has expired.{' '}
            <Link to="/forgot-password" className={styles.inlineLink}>
              Request a new one
            </Link>
            .
          </p>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            {error && (
              <p className={styles.resetPassword__error}>{error}</p>
            )}
            <div className={styles.field}>
              <Input
                id="newPassword"
                label="New password"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Enter your new password"
                value={newPassword}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setNewPassword(event.target.value)
                }
                endAdornment={
                  <button
                    type="button"
                    className={styles.togglePassword}
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    aria-label={
                      showNewPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showNewPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                }
              />
              <PasswordStrengthMeter password={newPassword} />
            </div>
            <div className={styles.field}>
              <Input
                id="confirmPassword"
                label="Re-enter password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setConfirmPassword(event.target.value)
                }
                endAdornment={
                  <button
                    type="button"
                    className={styles.togglePassword}
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={
                      showConfirmPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                }
              />
              {passwordsMismatch && (
                <p className={styles.fieldHint}>Passwords don&apos;t match</p>
              )}
            </div>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={!canSubmit}
            >
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
};

export default ResetPasswordPage;
