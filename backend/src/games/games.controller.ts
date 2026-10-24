import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SessionAuthGuard } from '../auth/auth.guard';
import { GamesService } from './games.service';
import { ImportLichessDto } from './import-lichess.dto';

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

  @Post('lichess/import')
  @UseGuards(SessionAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  importLichessGames(@Request() request: AuthenticatedRequest, @Body() body: ImportLichessDto) {
    return this.gamesService.importLichessGames(request.user.id, body.limit);
  }
}
