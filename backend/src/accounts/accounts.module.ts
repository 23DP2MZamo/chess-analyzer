import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { ChessComClient } from './chesscom.client';
import { LichessClient } from './lichess.client';

@Module({
  controllers: [AccountsController],
  providers: [AccountsService, LichessClient, ChessComClient],
  exports: [ChessComClient],
})
export class AccountsModule {}
