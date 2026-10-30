import { ConflictException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Role } from '../authorization/role.enum';
import { AuthService } from '../auth/auth.service';
import { UserService } from '../users/user.service';
import { normalizeEmail } from '../users/utils/normalize-email';

const ROLES = Object.values(Role);
const USAGE = `Usage: npm run user:set-role -- <email> <${ROLES.join('|')}>`;

const isRole = (value: string | undefined): value is Role =>
  ROLES.includes(value as Role);

async function main(): Promise<void> {
  const [email, role] = process.argv.slice(2);

  if (!email || !isRole(role)) {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const user = await app
      .get(UserService)
      .findOneByEmail(normalizeEmail(email));

    if (!user) {
      console.error(`No user with email ${email}`);
      process.exitCode = 1;
      return;
    }

    let changed: boolean;
    try {
      changed = await app.get(AuthService).changeRole(user, role);
    } catch (error) {
      if (error instanceof ConflictException) {
        console.error(`${user.email}: ${error.message}`);
        process.exitCode = 1;
        return;
      }
      throw error;
    }

    console.log(
      changed
        ? `${user.email}: ${user.role} -> ${role} (signed out of all sessions)`
        : `${user.email} is already ${role}`,
    );
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
