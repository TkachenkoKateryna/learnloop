import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @Matches(/^[0-9a-f]{64}$/, { message: 'Invalid or expired token' })
  token: string;

  @IsNotEmpty()
  @MinLength(6)
  @Matches(/[A-Z]/)
  newPassword: string;
}
