import { createHash } from 'crypto';

const POSTGRES_MAX_IDENTIFIER_LENGTH = 63;
const HASH_LENGTH = 8;

export const shortHash = (value: string): string =>
  createHash('sha256').update(value).digest('hex').slice(0, HASH_LENGTH);

// Postgres silently truncates longer names, and the truncated name would never
// match the one TypeORM compares against.
export const fitIdentifier = (name: string): string =>
  name.length <= POSTGRES_MAX_IDENTIFIER_LENGTH
    ? name
    : `${name.slice(0, POSTGRES_MAX_IDENTIFIER_LENGTH - HASH_LENGTH - 1)}_${shortHash(name)}`;

export const sqlInList = (values: readonly string[]): string =>
  values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const checkName = (base: string, expression: string): string =>
  fitIdentifier(`${base}_${shortHash(expression)}`);
