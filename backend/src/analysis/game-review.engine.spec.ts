import { GameReviewService } from './game-review.service';
import { StockfishService } from './stockfish.service';
import { PrismaService } from '../prisma/prisma.service';
describe('Complete review with the bundled Stockfish engine', () => {
  it('analyzes every move of a sample game and recognizes checkmate', async () => {
    const engine = new StockfishService();
    const review = new GameReviewService({} as PrismaService, engine);
    try {
      await review.start('test-owner', 'sample-fools-mate');
      let state: Awaited<ReturnType<GameReviewService['status']>> | undefined;
      for (let attempt = 0; attempt < 120; attempt++) {
        state = await review.status('test-owner', 'sample-fools-mate');
        if (state.status !== 'running') break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      expect(state).toMatchObject({ status: 'completed', total: 4, completed: 4 });
      const completed = state as { result: { moves: { san: string; mateIn: number | null }[] } };
      expect(completed.result.moves.at(-1)).toMatchObject({ san: 'Qh4#', mateIn: 0 });
    } finally {
      review.onModuleDestroy();
      engine.onModuleDestroy();
    }
  }, 20000);
});
