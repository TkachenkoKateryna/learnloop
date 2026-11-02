import { join } from 'path';

export const migrationOptions = {
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTransactionMode: 'each' as const,
};
