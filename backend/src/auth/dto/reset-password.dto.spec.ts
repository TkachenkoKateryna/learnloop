import { validate } from 'class-validator';
import { ResetPasswordDto } from './reset-password.dto';

describe('ResetPasswordDto', () => {
  const validData = {
    token: 'a1'.repeat(32),
    newPassword: 'Kate123',
  };

  it.each([
    ['valid data', {}, []],
    [
      'numeric token',
      { token: 123 },
      [{ property: 'token', constraints: ['isString', 'matches'] }],
    ],
    [
      'array token',
      { token: [] },
      [{ property: 'token', constraints: ['isString', 'matches'] }],
    ],
    [
      'object token',
      { token: {} },
      [{ property: 'token', constraints: ['isString', 'matches'] }],
    ],
    [
      'missing token',
      { token: undefined },
      [{ property: 'token', constraints: ['isString', 'matches'] }],
    ],
    [
      'empty token',
      { token: '' },
      [{ property: 'token', constraints: ['matches'] }],
    ],
    [
      'non-hex token',
      { token: 'z'.repeat(64) },
      [{ property: 'token', constraints: ['matches'] }],
    ],
    [
      'uppercase hex token',
      { token: 'A1'.repeat(32) },
      [{ property: 'token', constraints: ['matches'] }],
    ],
    [
      'token too short',
      { token: 'a1'.repeat(31) },
      [{ property: 'token', constraints: ['matches'] }],
    ],
    [
      'token too long',
      { token: 'a1'.repeat(33) },
      [{ property: 'token', constraints: ['matches'] }],
    ],
  ] as const)('%s', async (_scenario, overrides, expectedErrors) => {
    const resetPasswordDto = Object.assign(
      new ResetPasswordDto(),
      validData,
      overrides,
    );

    const errors = await validate(resetPasswordDto);

    expect(errors).toHaveLength(expectedErrors.length);
    expectedErrors.forEach(({ property, constraints }) => {
      const error = errors.find((e) => e.property === property);
      expect(error).toBeDefined();
      expect(Object.keys(error!.constraints ?? {})).toEqual(
        expect.arrayContaining([...constraints]),
      );
    });
  });

  it('reports a malformed token with the same message as an unknown one', async () => {
    const resetPasswordDto = Object.assign(new ResetPasswordDto(), validData, {
      token: 'not-a-token',
    });

    const [error] = await validate(resetPasswordDto);

    expect(error.constraints).toEqual({ matches: 'Invalid or expired token' });
  });
});
