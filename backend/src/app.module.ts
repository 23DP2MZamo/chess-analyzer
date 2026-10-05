import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { AccountsModule } from './accounts/accounts.module';
import { GamesModule } from './games/games.module';

@Module({
  imports: [AuthModule, UserModule, AccountsModule, GamesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
