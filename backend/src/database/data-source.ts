import { existsSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { databaseOptions } from '../config/database.config';
import { migrationOptions } from './migration-options';
import { schemaOptions } from './schema-options';

// Used only by the TypeORM CLI; the Nest app builds its own connection.
const envFile = join(__dirname, '..', '..', '.env');
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

export default new DataSource({
  ...databaseOptions(),
  ...schemaOptions,
  ...migrationOptions,
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
});
