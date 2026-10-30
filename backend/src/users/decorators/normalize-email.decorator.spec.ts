import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginDto } from '../../auth/dto/login.dto';
import { ForgotPasswordDto } from '../../auth/dto/forgot-password.dto';

describe('NormalizeEmail', () => {
  it.each([
    ['CreateUserDto', CreateUserDto],
    ['LoginDto', LoginDto],
    ['ForgotPasswordDto', ForgotPasswordDto],
  ] as const)('trims and lowercases the email in %s', (_name, Dto) => {
    const dto = plainToInstance(Dto, { email: '  Kate@Example.COM ' });

    expect(dto.email).toBe('kate@example.com');
  });

  it('leaves a non-string for @IsEmail() to reject', async () => {
    const dto = plainToInstance(ForgotPasswordDto, { email: 123 });

    const errors = await validate(dto);

    expect(dto.email).toBe(123);
    expect(errors.map((error) => error.property)).toEqual(['email']);
  });
});
