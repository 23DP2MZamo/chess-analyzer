import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import passport from 'passport';
import { AppModule } from './app.module';

async function bootstrap() {
  if (!process.env.JWT_SECRET && !process.env.SESSION_SECRET) {
    throw new Error('JWT_SECRET or SESSION_SECRET must be configured');
  }
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.use(passport.initialize());
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });
  await app.listen(Number(process.env.PORT ?? 3000));
}
void bootstrap();
