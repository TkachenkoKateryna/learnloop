import { QueryFailedError } from 'typeorm';

export const postgresQueryError = (driverError: {
  code?: string;
  constraint?: string;
}): QueryFailedError =>
  new QueryFailedError(
    'INSERT',
    [],
    Object.assign(new Error('query failed'), driverError),
  );
