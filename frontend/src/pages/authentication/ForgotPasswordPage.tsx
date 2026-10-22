import { useState, type ChangeEvent, type SubmitEvent } from 'react';
import { ChevronLeft, MailCheck, Signpost } from 'lucide-react';
import { Link } from 'react-router-dom';
import Input from '../../components/ui/input/Input';
import styles from './ForgotPasswordPage.module.css';
import {
  authService,
  type ForgotPasswordRequest,
} from '../../features/authentication';
import { useAsyncAction } from '../../hooks/useAsyncAction';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const {
    run: sendResetEmail,
    isPending: isSubmitting,
    error,
  } = useAsyncAction(
    (payload: ForgotPasswordRequest) => authService.forgotPassword(payload),
    'Failed to send the reset email.',
  );
  const canSubmit = email.trim() !== '' && !isSubmitting;

  const requestResetEmail = async () => {
    if (await sendResetEmail({ email: email.trim() })) {
      setSubmitted(true);
    }
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    await requestResetEmail();
  };

  if (submitted) {
    return (
      <main className={styles.page}>
        <section className={styles.container}>
          <header className={styles.header}>
            <div className={styles.iconBadge}>
              <MailCheck size={28} />
            </div>
            <h1 className={styles.title}>Check your email!</h1>
            <p className={styles.subtitle}>
              Thanks! An email was sent that will ask you to click on a link to
              verify that you own this account. If you don&apos;t get the email,
              please contact support@libra.com
            </p>
          </header>
          {error && <p className={styles.forgotPassword__error}>{error}</p>}
          <a href="mailto:" className={styles.primaryButton}>
            Open email inbox
          </a>
          <button
            type="button"
            className={styles.backLink}
            onClick={requestResetEmail}
            disabled={isSubmitting}
          >
            Resend email
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.container}>
        <header className={styles.header}>
          <div className={styles.iconBadge}>
            <Signpost size={28} />
          </div>
          <h1 className={styles.title}>Forgot your password?</h1>
          <p className={styles.subtitle}>
            Enter your email so that we can send you password reset link
          </p>
        </header>
        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <p className={styles.forgotPassword__error}>{error}</p>}
          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="e.g. username@example.com"
            value={email}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setEmail(event.target.value)
            }
          />
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={!canSubmit}
          >
            {isSubmitting ? 'Sending...' : 'Send Email'}
          </button>
        </form>
        <Link to="/login" className={styles.backLink}>
          <ChevronLeft size={16} />
          Back to Login
        </Link>
      </section>
    </main>
  );
};

export default ForgotPasswordPage;
