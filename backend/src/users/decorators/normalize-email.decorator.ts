import { Transform } from 'class-transformer';
import { normalizeEmail } from '../utils/normalize-email';

export const NormalizeEmail = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeEmail(value) : value,
  );
