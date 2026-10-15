import { useState, type ChangeEvent, type SubmitEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import Input from '../../components/ui/input/Input';
import styles from './SignUpPage.module.css';
import {
  authService,
  isPasswordValid,
  PasswordStrengthMeter,
  type RegisterRequest,
} from '../../features/authentication';
import { useAsyncAction } from '../../hooks/useAsyncAction';

const SignUpPage = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const {
    run: submitSignup,
    isPending: isSubmitting,
    error,
  } = useAsyncAction(
    (payload: RegisterRequest) => authService.register(payload),
    'Failed to register.',
  );
  const canSubmit =
    firstName.trim() !== '' &&
    lastName.trim() !== '' &&
    email.trim() !== '' &&
    isPasswordValid(password) &&
    !isSubmitting;

  const handleSignup = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const succeeded = await submitSignup({
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      password,
    });

    if (succeeded) {
      navigate('/login');
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.container}>
        <header className={styles.header}>
          <div className={styles.logo}>
            <img src="/login-logo.svg" width={56} height={56} alt="" />
          </div>
          <h1 className={styles.title}>Create Your Account</h1>
          <p className={styles.subtitle}>
            Join Libra and start managing your library with confidence
          </p>
        </header>
        <form className={styles.form} onSubmit={handleSignup}>
          {error && <p className={styles.signup__error}>{error}</p>}
          <div className={styles.nameRow}>
            <Input
              id="firstName"
              label="First Name"
              type="text"
              placeholder="Jane"
              value={firstName}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setFirstName(event.target.value)
              }
            />
            <Input
              id="lastName"
              label="Last Name"
              type="text"
              placeholder="Doe"
              value={lastName}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setLastName(event.target.value)
              }
            />
          </div>
          <Input
            id="email"
            label="Email Address"
            type="email"
            placeholder="yourname@example.com"
            value={email}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setEmail(event.target.value)
            }
          />
          <Input
            id="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a password"
            value={password}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setPassword(event.target.value)
            }
            endAdornment={
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />
          <PasswordStrengthMeter password={password} />
          <button
            type="submit"
            className={styles.submitButton}
            disabled={!canSubmit}
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <footer className={styles.footer}>
          <span>Already have an account? </span>
          <Link to="/login" className={styles.accentLink}>
            Login
          </Link>
        </footer>
      </section>
    </main>
  );
};

export default SignUpPage;
