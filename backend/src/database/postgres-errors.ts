import { QueryFailedError } from 'typeorm';

export enum PostgresErrorCode {
  UniqueViolation = '23505',
}

interface PostgresDriverError {
  code?: string;
  constraint?: string;
}

export const isPostgresError = (
  error: unknown,
  code: PostgresErrorCode,
  constraint?: string,
): boolean => {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as PostgresDriverError;

  return (
    driverError.code === code &&
    (constraint === undefined || driverError.constraint === constraint)
  );
};
