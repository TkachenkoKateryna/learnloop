import type { ComponentProps } from 'react';
import styles from './CheckBox.module.css';

interface CheckBoxProps extends ComponentProps<'input'> {
  label: string;
}

const CheckBox = ({ label, ...props }: CheckBoxProps) => {
  return (
    <label className={styles.checkboxField}>
      <input type="checkbox" {...props} className={styles.checkbox} />
      <p>{label}</p>
    </label>
  );
};

export default CheckBox;
