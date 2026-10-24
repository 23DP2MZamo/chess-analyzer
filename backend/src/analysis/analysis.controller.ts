import { Body, Controller, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/auth.guard';
import { AnalyzePositionDto } from './analyze-position.dto';
import { StockfishService } from './stockfish.service';

@Controller('analysis')
@UseGuards(SessionAuthGuard)
export class AnalysisController {
  constructor(private readonly stockfish: StockfishService) {}

  @Post('position')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  analyze(@Body() body: AnalyzePositionDto) {
    return this.stockfish.analyze(body);
  }
}
