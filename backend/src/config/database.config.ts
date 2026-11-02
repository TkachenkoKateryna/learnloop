import { registerAs } from '@nestjs/config';
import type { DataSourceOptions } from 'typeorm';

type PostgresOptions = Extract<DataSourceOptions, { type: 'postgres' }>;

export const databaseOptions = (): PostgresOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5433'),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export const typeOrmConfig = registerAs('database', databaseOptions);
