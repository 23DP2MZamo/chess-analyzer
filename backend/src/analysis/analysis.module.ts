import { GameReviewController } from './game-review.controller';
import { GameReviewService } from './game-review.service';
import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { StockfishService } from './stockfish.service';

@Module({
  controllers: [AnalysisController, GameReviewController],
  providers: [StockfishService, GameReviewService],
})
export class AnalysisModule {}
