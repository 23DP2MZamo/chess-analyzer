import { GameSearchController } from './game-search.controller';
import { GameSearchService } from './game-search.service';
import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';

@Module({
  imports: [AccountsModule],
  controllers: [GamesController, GameSearchController],
  providers: [GamesService, GameSearchService],
})
export class GamesModule {}
