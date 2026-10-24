import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { StockfishService } from './stockfish.service';

@Module({ controllers: [AnalysisController], providers: [StockfishService] })
export class AnalysisModule {}
