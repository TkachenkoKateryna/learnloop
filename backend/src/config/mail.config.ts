import { registerAs } from '@nestjs/config';
import { MailConfig } from './config.types';

export const mailConfig = registerAs('mail', (): MailConfig => ({
  sendgridApiKey: process.env.SENDGRID_API_KEY as string,
  fromEmail: process.env.MAIL_FROM_EMAIL as string,
  fromName: process.env.MAIL_FROM_NAME as string,
}));
