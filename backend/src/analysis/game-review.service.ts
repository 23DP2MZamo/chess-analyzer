import {
  BadRequestException,
  Injectable,
  NotFoundException,
  HttpException,
  OnModuleDestroy,
} from '@nestjs/common';
import { Chess, type Move } from 'chess.js';
import { setTimeout as delay } from 'node:timers/promises';
import { Color, MoveClassification } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StockfishService, type Evaluation } from './stockfish.service';
import { chanceLoss, moveAccuracy, meanAccuracy } from './review-scoring';

import { sampleGame } from '../games/sample-games';

const REVIEW_VERSION = '[review-v2]';

type ReviewedMove = {
  moveNumber: number;
  color: Color;
  san: string;
  fenBefore: string;
  fenAfter: string;
  evalBeforeCp: number | null;
  evalAfterCp: number | null;
  mateIn: number | null;
  bestMove: string | null;
  classification: MoveClassification;
};
type Review = {
  engine: string;
  depth: number;
  accuracyWhite: number | null;
  accuracyBlack: number | null;
  blunderCount: number;
  mistakeCount: number;
  inaccuracyCount: number;
  moves: ReviewedMove[];
};
type Job = {
  userId: string;
  gameId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  completed: number;
  total: number;
  error?: string;
  result?: Review;
  touched: number;
};

export function readGame(pgn: string) {
  if (!pgn || pgn.length > 200000)
    throw new BadRequestException(
      'This game has no usable move record. Reimport it from your account.',
    );
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    throw new BadRequestException(
      'The saved game contains invalid moves. Reimport the original game and try again.',
    );
  }
  const moves = chess.history({ verbose: true });
  if (!moves.length)
    throw new BadRequestException('This game has no moves to analyze. Try a finished game.');
  if (moves.length > 400)
    throw new BadRequestException('Quick review supports games up to 200 full moves.');
  if (
    chess.getHeaders().Variant &&
    !['standard', 'from position'].includes(chess.getHeaders().Variant.toLowerCase())
  )
    throw new BadRequestException('Only standard chess games can be reviewed.');
  return moves;
}

export function classifyMove(
  move: Move,
  before: Evaluation,
  after: Evaluation,
): MoveClassification {
  if (new Chess(move.before).moves().length === 1) return 'FORCED';
  if (before.bestMove === move.from + move.to + (move.promotion ?? '')) return 'BEST';
  const loss = chanceLoss(move.color, before, after);
  return loss >= 20
    ? 'BLUNDER'
    : loss >= 10
      ? 'MISTAKE'
      : loss >= 5
        ? 'INACCURACY'
        : loss >= 2
          ? 'GOOD'
          : 'EXCELLENT';
}

@Injectable()
export class GameReviewService implements OnModuleDestroy {
  private readonly jobs = new Map<string, Job>();
  private closing = false;
  constructor(
    private readonly db: PrismaService,
    private readonly engine: StockfishService,
  ) {}
  onModuleDestroy() {
    this.closing = true;
    for (const job of this.jobs.values()) if (job.status === 'running') job.status = 'cancelled';
  }
  private key(userId: string, id: string) {
    return userId + ':' + id;
  }
  private async owned(userId: string, id: string) {
    const sample = sampleGame(id);
    if (sample) return { ...sample, isPreview: true };
    const game = await this.db.game.findFirst({
      where: { id, userId },
      select: {
        id: true,
        pgn: true,
        whiteUsername: true,
        blackUsername: true,
        whiteElo: true,
        blackElo: true,
        platform: true,
        externalId: true,
        playedAt: true,
      },
    });
    if (!game) throw new NotFoundException('Game not found. Open a game from your own library.');
    return { ...game, isSample: game.externalId?.startsWith('sample-') ?? false, isPreview: false };
  }
  async detail(userId: string, id: string) {
    const game = await this.owned(userId, id);
    const moves = readGame(game.pgn);
    const header = { ...game, pgn: undefined };
    return {
      ...header,
      initialFen: moves[0].before,
      moves: moves.map((move) => ({
        san: move.san,
        before: move.before,
        after: move.after,
        color: move.color,
        from: move.from,
        to: move.to,
      })),
    };
  }
  async status(userId: string, id: string) {
    const game = await this.owned(userId, id);
    const job = this.jobs.get(this.key(userId, id));
    if (job && (job.status !== 'completed' || game.isPreview)) return this.publicJob(job);
    const saved = game.isPreview
      ? null
      : await this.db.analysis.findUnique({
          where: { gameId: id },
          include: { moves: { orderBy: [{ moveNumber: 'asc' }, { color: 'asc' }] } },
        });
    if (saved?.moves.length && saved.engine.includes(REVIEW_VERSION))
      return {
        status: 'completed',
        completed: saved.moves.length,
        total: saved.moves.length,
        result: {
          ...saved,
          moves: [...saved.moves].sort(
            (a, b) =>
              a.moveNumber - b.moveNumber ||
              (a.color === b.color ? 0 : a.color === 'WHITE' ? -1 : 1),
          ),
        },
      };
    return { status: 'idle', completed: 0, total: 0 };
  }
  async start(userId: string, id: string) {
    const game = await this.owned(userId, id);
    const moves = readGame(game.pgn);
    const key = this.key(userId, id);
    const existing = this.jobs.get(key);
    if (existing?.status === 'running') return this.publicJob(existing);
    if (this.closing)
      throw new HttpException('Review service is restarting. Try again shortly.', 503);
    // Bounds both background work and retained in-memory progress/results.
    for (const [jobKey, job] of this.jobs)
      if (job.status !== 'running' && Date.now() - job.touched > 600000) this.jobs.delete(jobKey);
    const active = [...this.jobs.values()].filter((job) => job.status === 'running');
    if (active.length >= 2 || active.some((job) => job.userId === userId))
      throw new HttpException(
        'A game review is already running. Wait for it to finish, then try again.',
        429,
      );
    if (this.jobs.size >= 256) {
      const oldest = [...this.jobs.entries()].find(([, job]) => job.status !== 'running');
      if (oldest) this.jobs.delete(oldest[0]);
    }
    const job: Job = {
      userId,
      gameId: id,
      status: 'running',
      completed: 0,
      total: moves.length,
      touched: Date.now(),
    };
    this.jobs.set(key, job);
    void this.run(job, moves, game.isPreview);
    return this.publicJob(job);
  }
  async cancel(userId: string, id: string) {
    await this.owned(userId, id);
    const job = this.jobs.get(this.key(userId, id));
    if (job?.status === 'running') job.status = 'cancelled';
    return { status: job?.status ?? 'idle' };
  }
  private publicJob(job: Job) {
    return {
      status: job.status,
      completed: job.completed,
      total: job.total,
      error: job.error,
      result: job.result,
    };
  }
  private async evaluate(fen: string, history?: { initialFen: string; moves: string[] }) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.engine.analyze({ fen, depth: 14 }, 1000, history);
      } catch (error) {
        if (
          !(error instanceof HttpException) ||
          error.getStatus() !== 429 ||
          attempt >= 30 ||
          this.closing
        )
          throw error;
        await delay(100);
      }
    }
  }
  private async run(job: Job, moves: Move[], isSample: boolean) {
    try {
      const history = { initialFen: moves[0].before, moves: [] as string[] };
      let before = await this.evaluate(moves[0].before, history);
      const reviewed: ReviewedMove[] = [];
      const accuracy = { w: [] as number[], b: [] as number[] };
      let minimumDepth = before.depth;
      for (const move of moves) {
        if (job.status !== 'running' || this.closing) return;
        // Pass the played move history so Stockfish can recognize repetitions and the fifty-move clock.
        history.moves.push(move.from + move.to + (move.promotion ?? ''));
        const after = await this.evaluate(move.after, history);
        if (job.status !== 'running' || this.closing) return;
        if (after.depth > 0) minimumDepth = Math.min(minimumDepth, after.depth);
        const classification = classifyMove(move, before, after);
        accuracy[move.color].push(
          moveAccuracy(
            classification === 'BEST' || classification === 'FORCED'
              ? 0
              : chanceLoss(move.color, before, after),
          ),
        );
        reviewed.push({
          moveNumber: Number(move.before.split(' ')[5]),
          color: move.color === 'w' ? 'WHITE' : 'BLACK',
          san: move.san,
          fenBefore: move.before,
          fenAfter: move.after,
          evalBeforeCp: before.score.type === 'cp' ? before.score.value : null,
          evalAfterCp: after.score.type === 'cp' ? after.score.value : null,
          mateIn: after.score.type === 'mate' ? after.score.value : null,
          bestMove: before.bestMove,
          classification,
        });
        before = after;
        job.completed++;
      }
      const result: Review = {
        engine: before.engine + ' ' + REVIEW_VERSION,
        accuracyWhite: meanAccuracy(accuracy.w),
        accuracyBlack: meanAccuracy(accuracy.b),
        depth: minimumDepth,
        blunderCount: reviewed.filter((move) => move.classification === 'BLUNDER').length,
        mistakeCount: reviewed.filter((move) => move.classification === 'MISTAKE').length,
        inaccuracyCount: reviewed.filter((move) => move.classification === 'INACCURACY').length,
        moves: reviewed,
      };
      if (!isSample) {
        const { moves: records, ...summary } = result;
        // Replace all move rows atomically; a failed/cancelled review never saves a partial result.
        await this.db.analysis.upsert({
          where: { gameId: job.gameId },
          create: { ...summary, gameId: job.gameId, moves: { create: records } },
          update: { ...summary, moves: { deleteMany: {}, create: records } },
        });
      }
      job.result = result;
      job.status = 'completed';
    } catch (error) {
      if (job.status === 'running') {
        job.status = 'failed';
        job.error =
          error instanceof HttpException
            ? error.message
            : 'The review could not be completed. Your game is safe. Try again.';
      }
    } finally {
      job.touched = Date.now();
    }
  }
}
