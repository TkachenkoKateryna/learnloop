import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { LOGIN_IP_THROTTLER } from './auth/login-throttle';
import { ConfigType, CorsConfig } from './config/config.types';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get<ConfigService<ConfigType>>(ConfigService);

  app.enableCors({
    origin: configService.getOrThrow<CorsConfig>('cors').origins,
    credentials: true,
    // Lets the frontend read how long to wait after a 429. Named throttlers
    // add their name as a suffix; list each one here.
    exposedHeaders: ['Retry-After', `Retry-After-${LOGIN_IP_THROTTLER}`],
  });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
