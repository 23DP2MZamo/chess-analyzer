import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { LichessClient } from './lichess.client';

@Module({
  controllers: [AccountsController],
  providers: [AccountsService, LichessClient],
})
export class AccountsModule {}
