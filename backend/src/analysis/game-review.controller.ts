import { Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/auth.guard';
import { GameReviewService } from './game-review.service';
import { sampleList } from '../games/sample-games';

@Controller('analysis')
@UseGuards(SessionAuthGuard)
export class GameReviewController {
  constructor(private readonly review: GameReviewService) {}
  @Get('samples') samples() {
    return sampleList();
  }
  @Get('games/:id') detail(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.review.detail(req.user.id, id);
  }
  @Get('games/:id/status') status(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.review.status(req.user.id, id);
  }
  @Post('games/:id') start(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.review.start(req.user.id, id);
  }
  @Delete('games/:id') cancel(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.review.cancel(req.user.id, id);
  }
}
