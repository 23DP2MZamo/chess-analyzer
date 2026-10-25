import {
  Controller,
  Get,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SessionAuthGuard } from '../auth/auth.guard';
import { GameSearchService } from './game-search.service';
import { SearchGamesDto } from './search-games.dto';

@Controller('games')
@UseGuards(SessionAuthGuard)
export class GameSearchController {
  constructor(private readonly games: GameSearchService) {}

  @Get('search')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  search(@Request() request: { user: { id: string } }, @Query() query: SearchGamesDto) {
    return this.games.search(request.user.id, query);
  }
}
