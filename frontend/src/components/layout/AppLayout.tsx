import { Outlet } from 'react-router-dom';
import { logout } from '../../features/authentication';
import { useAppDispatch } from '../../store/hooks';
import styles from './AppLayout.module.css';

const AppLayout = () => {
  const dispatch = useAppDispatch();

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
