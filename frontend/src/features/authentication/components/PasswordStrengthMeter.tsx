import { Check, X } from 'lucide-react';
import styles from './PasswordStrengthMeter.module.css';
import {
  MIN_PASSWORD_LENGTH,
  hasMinLength,
  hasUppercase,
} from '../utils/passwordRules';

interface PasswordCriteriaProps {
  password: string;
}

interface Criterion {
  label: string;
  met: boolean;
}

const PasswordCriteria = ({ password }: PasswordCriteriaProps) => {
  const criteria: Criterion[] = [
    {
      label: `At least ${MIN_PASSWORD_LENGTH} characters`,
      met: hasMinLength(password),
    },
    { label: 'Contains uppercase letter', met: hasUppercase(password) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Contains special character', met: /[^A-Za-z0-9]/.test(password) },
  ];

  return (
    <div className={styles.container}>
      {criteria.map((item) => (
        <div key={item.label} className={styles.row}>
          {item.met ? (
            <Check className={`${styles.icon} ${styles.iconMet}`} />
          ) : (
            <X className={`${styles.icon} ${styles.iconUnmet}`} />
          )}
          <span className={item.met ? styles.labelMet : styles.labelUnmet}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
};

interface PasswordStrengthMeterProps {
  password: string;
}

const PasswordStrengthMeter = ({ password }: PasswordStrengthMeterProps) => {
  const getStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.match(/[a-z]/)) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/\d/)) strength++;
    if (password.match(/[^a-zA-Z\d]/)) strength++;

    return strength;
  };
  const strength = getStrength(password);

  const getSegmentClass = (strength: number): string => {
    if (strength === 0) return styles.segmentVeryWeak;
    if (strength === 1) return styles.segmentWeak;
    if (strength === 2) return styles.segmentFair;
    if (strength === 3) return styles.segmentGood;

    return styles.segmentStrong;
  };
  const getStrengthText = (strength: number): string => {
    if (strength === 0) return 'Very Weak';
    if (strength === 1) return 'Weak';
    if (strength === 2) return 'Fair';
    if (strength === 3) return 'Good';

    return 'Strong';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerLabel}>Password strength</span>
        <span className={styles.headerLabel}>{getStrengthText(strength)}</span>
      </div>

      <div className={styles.bar}>
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className={`${styles.segment} ${index < strength ? getSegmentClass(strength) : ''}`}
          />
        ))}
      </div>

      <PasswordCriteria password={password} />
    </div>
  );
};

export default PasswordStrengthMeter;
