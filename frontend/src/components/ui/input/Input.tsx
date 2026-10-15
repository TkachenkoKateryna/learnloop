import type { InputHTMLAttributes, ReactNode } from 'react';
import styles from './Input.module.css';
import type { LucideIcon } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  startIcon?: LucideIcon;
  endAdornment?: ReactNode;
}

const Input = ({
  id,
  label,
  startIcon: StartIcon,
  endAdornment,
  ...props
}: InputProps) => {
  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.wrapper}>
        {StartIcon && <StartIcon className={styles.startIcon} />}
        <input
          id={id}
          {...props}
          className={`${styles.input} ${StartIcon ? styles.withStartIcon : ''} ${endAdornment ? styles.withEndAdornment : ''}`}
        />
        {endAdornment && (
          <div className={styles.endAdornment}>{endAdornment}</div>
        )}
      </div>
    </div>
  );
};

export default Input;
