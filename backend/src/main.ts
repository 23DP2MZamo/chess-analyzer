import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import session from 'express-session';
import passport from 'passport';
import connectPgSimple from 'connect-pg-simple';
import 'dotenv/config';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const sessionSecret = process.env.SESSION_SECRET; //dobavic SESSION_SECRET TOKEN V .ENV tipa
  if (!sessionSecret) {
    throw new Error('SESSION_SECRET is not defined in environment variables');
  }

  const pgSession = connectPgSimple(session);
  app.use(
    session({
      store: new pgSession({
        createTableIfMissing: true,
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());
  (app.enableCors({
    origin: 'http://localhost:5173', //POMENJACC PORT DLA CORS ORIGINA NA DEJSTVUJUSSIJ PORT PROJEKTA ESLI ETOT NE 4200
    credentials: true,
  }),
    await app.listen(3000));
}
bootstrap();
