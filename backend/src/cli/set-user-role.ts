import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Role } from '../authorization/role.enum';
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
    const userService = app.get(UserService);
    const user = await userService.findOneByEmail(normalizeEmail(email));

    if (!user) {
      console.error(`No user with email ${email}`);
      process.exitCode = 1;
      return;
    }

    await userService.updateRole(user.id, role);
    console.log(`${user.email}: ${user.role} -> ${role}`);
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
