import { IsEmail, IsNotEmpty, Matches, MinLength } from 'class-validator';
import { NormalizeEmail } from '../decorators/normalize-email.decorator';

export class CreateUserDto {
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  firstName: string;

  @IsNotEmpty()
  lastName: string;

  @IsNotEmpty()
  @MinLength(6)
  @Matches(/[A-Z]/)
  password: string;
}
