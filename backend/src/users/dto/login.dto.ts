import { IsBoolean, IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { NormalizeEmail } from '../decorators/normalize-email.decorator';

export class LoginDto {
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsBoolean()
  rememberMe: boolean;
}
