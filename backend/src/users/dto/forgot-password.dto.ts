import { IsEmail } from 'class-validator';
import { NormalizeEmail } from '../decorators/normalize-email.decorator';

export class ForgotPasswordDto {
  @NormalizeEmail()
  @IsEmail()
  email: string;
}
