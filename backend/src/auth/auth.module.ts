import { SignupController } from './signup.controller';
import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PassportModule } from '@nestjs/passport';
import { UserService } from '../user/user.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtTokens } from './jwt-tokens.service';

@Global()
@Module({
  imports: [PrismaModule, PassportModule.register({ session: false })],
  controllers: [AuthController, SignupController],
  providers: [AuthService, UserService, LocalStrategy, JwtTokens],
  exports: [JwtTokens],
})
export class AuthModule {}
