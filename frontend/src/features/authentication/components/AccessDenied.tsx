import { Link } from 'react-router-dom';
import styles from './AccessDenied.module.css';

const AccessDenied = () => (
  <section className={styles.denied}>
    <h2 className={styles.denied__title}>
      You don&apos;t have access to this page
    </h2>
    <p className={styles.denied__text}>
      Your account doesn&apos;t have permission to view it. If you think this is
      a mistake, ask a library administrator.
    </p>
    <Link to="/" className={styles.denied__link}>
      Go to the home page
    </Link>
  </section>
);

export default AccessDenied;
