import { Link } from 'react-router-dom';
import styles from './LoginPage.module.css';
import { Eye, EyeOff } from 'lucide-react';
import Input from '../../components/ui/input/Input';
import { useState, type ChangeEvent, type SubmitEvent } from 'react';
import CheckBox from '../../components/ui/checkbox/CheckBox';
import { login, type LoginRequest } from '../../features/authentication';
import { useAppDispatch } from '../../store/hooks';
import { useAsyncAction } from '../../hooks/useAsyncAction';

const LoginPage = () => {
  const [formValues, setFormValues] = useState<LoginRequest>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useAppDispatch();
  const {
    run: submitLogin,
    isPending: isSubmitting,
    error,
  } = useAsyncAction(
    (credentials: LoginRequest) => dispatch(login(credentials)).unwrap(),
    'Failed to sign in.',
  );
  const { email, password, rememberMe } = formValues;
  const canSubmit = email.trim() !== '' && password !== '' && !isSubmitting;

  const updateField = <K extends keyof LoginRequest>(
    field: K,
    value: LoginRequest[K],
  ) => setFormValues((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    await submitLogin({ ...formValues, email: email.trim() });
  };

  return (
    <main className={styles.page}>
      <section className={styles.container}>
        <header className={styles.header}>
          <div className={styles.logo}>
            <img src="/login-logo.svg" width={56} height={56} alt="" />
          </div>
          <h1 className={styles.title}>Welcome Back, Librarian</h1>
          <p className={styles.subtitle}>
            Access your library dashboard and manage with confidence
          </p>
        </header>
        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <p className={styles.login__error}>{error}</p>}
          <Input
            id="email"
            label="Email Address"
            type="email"
            placeholder="yourname@example.com"
            value={email}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              updateField('email', event.target.value)
            }
          />
          <Input
            id="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            value={password}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              updateField('password', event.target.value)
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
          <div className={styles.formOptions}>
            <CheckBox
              label="Remember Me"
              checked={rememberMe}
              onChange={() => updateField('rememberMe', !rememberMe)}
            />
            <Link to="/forgot-password" className={styles.accentLink}>
              Forgot Password?
            </Link>
          </div>
          <button
            type="submit"
            className={styles.loginButton}
            disabled={!canSubmit}
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <footer className={styles.footer}>
          <span>New to Libra? </span>
          <Link to="/signup" className={styles.accentLink}>
            Create an Account
          </Link>
        </footer>
      </section>
    </main>
  );
};

export default LoginPage;
