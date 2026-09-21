import { Outlet } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../../store';
import type { AppDispatch } from '../../store';
import styles from './AppLayout.module.css';

const AppLayout = () => {
  const dispatch = useDispatch<AppDispatch>();

  return (
    <div className={styles.layout}>
      <header className={styles.layout__header}>
        <div className={styles.layout__brand}>
          <img src="/login-logo.svg" width={28} height={28} alt="" />
          <span>Libra</span>
        </div>
        <button
          type="button"
          className={styles.layout__logout}
          onClick={() => dispatch(logout())}
        >
          Log out
        </button>
      </header>
      <main className={styles.layout__main}>
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
