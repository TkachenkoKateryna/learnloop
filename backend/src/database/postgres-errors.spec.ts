import { QueryFailedError } from 'typeorm';
import { isPostgresError, PostgresErrorCode } from './postgres-errors';

const queryError = (driverError: { code?: string; constraint?: string }) =>
  new QueryFailedError(
    'INSERT',
    [],
    Object.assign(new Error('query failed'), driverError),
  );

describe('isPostgresError', () => {
  const { UniqueViolation } = PostgresErrorCode;

  it('matches the code and constraint', () => {
    const error = queryError({ code: '23505', constraint: 'UQ_user_email' });

    expect(isPostgresError(error, UniqueViolation, 'UQ_user_email')).toBe(true);
  });

  it('matches any constraint when none is given', () => {
    const error = queryError({ code: '23505', constraint: 'UQ_other' });

    expect(isPostgresError(error, UniqueViolation)).toBe(true);
  });

  it('does not match a different constraint', () => {
    const error = queryError({ code: '23505', constraint: 'UQ_other' });

    expect(isPostgresError(error, UniqueViolation, 'UQ_user_email')).toBe(
      false,
    );
  });

  it('does not match a different code on the same constraint', () => {
    const error = queryError({ code: '23502', constraint: 'UQ_user_email' });

    expect(isPostgresError(error, UniqueViolation, 'UQ_user_email')).toBe(
      false,
    );
  });

  it('does not match a query error without a code', () => {
    expect(isPostgresError(queryError({}), UniqueViolation)).toBe(false);
  });

  it.each([
    ['a plain Error', new Error('connection lost')],
    ['a non-error value', 'oops'],
    ['undefined', undefined],
  ])('does not match %s', (_name, error) => {
    expect(isPostgresError(error, UniqueViolation)).toBe(false);
  });
});
