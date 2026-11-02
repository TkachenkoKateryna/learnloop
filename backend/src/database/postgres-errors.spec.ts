import { isPostgresError, PostgresErrorCode } from './postgres-errors';
import { postgresQueryError } from './postgres-errors.testing';

describe('isPostgresError', () => {
  const { UniqueViolation } = PostgresErrorCode;

  it('matches the code and constraint', () => {
    const error = postgresQueryError({
      code: '23505',
      constraint: 'uq_users_email',
    });

    expect(isPostgresError(error, UniqueViolation, 'uq_users_email')).toBe(
      true,
    );
  });

  it('matches any constraint when none is given', () => {
    const error = postgresQueryError({ code: '23505', constraint: 'uq_other' });

    expect(isPostgresError(error, UniqueViolation)).toBe(true);
  });

  it('does not match a different constraint', () => {
    const error = postgresQueryError({ code: '23505', constraint: 'uq_other' });

    expect(isPostgresError(error, UniqueViolation, 'uq_users_email')).toBe(
      false,
    );
  });

  it('does not match a different code on the same constraint', () => {
    const error = postgresQueryError({
      code: '23502',
      constraint: 'uq_users_email',
    });

    expect(isPostgresError(error, UniqueViolation, 'uq_users_email')).toBe(
      false,
    );
  });

  it('does not match a query error without a code', () => {
    expect(isPostgresError(postgresQueryError({}), UniqueViolation)).toBe(
      false,
    );
  });

  it.each([
    ['a plain Error', new Error('connection lost')],
    ['a non-error value', 'oops'],
    ['undefined', undefined],
  ])('does not match %s', (_name, error) => {
    expect(isPostgresError(error, UniqueViolation)).toBe(false);
  });
});
