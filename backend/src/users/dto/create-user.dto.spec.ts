import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

describe('CreateUserDto', () => {
  const validData = {
    firstName: 'kate',
    lastName: 'doe',
    email: 'kate@gmail.com',
    password: 'Kate123',
  };

  it.each([
    ['valid data', {}, []],
    [
      'invalid email',
      { email: 'kate' },
      [{ property: 'email', constraints: ['isEmail'] }],
    ],
    [
      'missing first name',
      { firstName: '' },
      [{ property: 'firstName', constraints: ['isNotEmpty'] }],
    ],
    [
      'missing last name',
      { lastName: '' },
      [{ property: 'lastName', constraints: ['isNotEmpty'] }],
    ],
    [
      'password at minimum length boundary (6 chars)',
      { password: 'Abcdef' },
      [],
    ],
    [
      'password too short',
      { password: 'Ab1' },
      [{ property: 'password', constraints: ['minLength'] }],
    ],
    [
      'password missing uppercase letter',
      { password: 'lowercase1' },
      [{ property: 'password', constraints: ['matches'] }],
    ],
    [
      'missing password',
      { password: '' },
      [
        {
          property: 'password',
          constraints: ['isNotEmpty', 'minLength', 'matches'],
        },
      ],
    ],
    [
      'undefined password',
      { password: undefined },
      [
        {
          property: 'password',
          constraints: ['isNotEmpty', 'minLength', 'matches'],
        },
      ],
    ],
    [
      'invalid email and missing first name',
      { email: 'kate', firstName: '' },
      [
        { property: 'email', constraints: ['isEmail'] },
        { property: 'firstName', constraints: ['isNotEmpty'] },
      ],
    ],
  ] as const)('%s', async (_scenario, overrides, expectedErrors) => {
    const createUserDto = Object.assign(
      new CreateUserDto(),
      validData,
      overrides,
    );

    const errors = await validate(createUserDto);

    expect(errors).toHaveLength(expectedErrors.length);
    expectedErrors.forEach(({ property, constraints }) => {
      const error = errors.find((e) => e.property === property);
      expect(error).toBeDefined();
      expect(Object.keys(error!.constraints ?? {})).toEqual(
        expect.arrayContaining([...constraints]),
      );
    });
  });
});
