import { Controller, Post, Request, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/auth.guard';
import { GamesService } from './games.service';

interface AuthenticatedRequest {
  user: { id: string };
}

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post('chesscom/import')
  @UseGuards(SessionAuthGuard)
  importChessComGames(@Request() request: AuthenticatedRequest) {
    return this.gamesService.importChessComGames(request.user.id);
  }
}
