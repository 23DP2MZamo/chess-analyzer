import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';

@Module({
  imports: [AccountsModule],
  controllers: [GamesController],
  providers: [GamesService],
})
export class GamesModule {}
