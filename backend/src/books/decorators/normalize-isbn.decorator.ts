import { Transform } from 'class-transformer';
import { normalizeIsbn } from '../utils/normalize-isbn';

export const NormalizeIsbn = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeIsbn(value) : value,
  );
