import {
  Body,
  Controller,
  Post,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SessionAuthGuard } from '../auth/auth.guard';
import { AccountsService } from './accounts.service';
import { LinkChessComAccountDto } from './dto/link-chesscom-account.dto';
import { LinkLichessAccountDto } from './dto/link-lichess-account.dto';

interface AuthenticatedRequest {
  user: { id: string };
}

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post('lichess')
  @UseGuards(SessionAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  linkLichessAccount(
    @Request() request: AuthenticatedRequest,
    @Body() linkLichessAccountDto: LinkLichessAccountDto,
  ) {
    return this.accountsService.linkLichessAccount(request.user.id, linkLichessAccountDto.username);
  }

  @Post('chesscom')
  @UseGuards(SessionAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  linkChessComAccount(
    @Request() request: AuthenticatedRequest,
    @Body() linkChessComAccountDto: LinkChessComAccountDto,
  ) {
    return this.accountsService.linkChessComAccount(
      request.user.id,
      linkChessComAccountDto.username,
    );
  }
}
