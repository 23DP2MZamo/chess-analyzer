import { Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/auth.guard';
import { GamesService } from './games.service';

interface AuthenticatedRequest {
  user: { id: string };
}

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get('stats')
  @UseGuards(SessionAuthGuard)
  getStats(@Request() request: AuthenticatedRequest) {
    return this.gamesService.getStats(request.user.id);
  }

  @Get()
  @UseGuards(SessionAuthGuard)
  listGames(@Request() request: AuthenticatedRequest) {
    return this.gamesService.listGames(request.user.id);
  }

  @Post('chesscom/import')
  @UseGuards(SessionAuthGuard)
  importChessComGames(@Request() request: AuthenticatedRequest) {
    return this.gamesService.importChessComGames(request.user.id);
  }
}
