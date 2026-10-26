import {
  BadRequestException,
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
  HttpException,
  HttpStatus,
  GatewayTimeoutException,
} from '@nestjs/common';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';
import { Chess } from 'chess.js';
import { findEngine } from 'stockfish';
import { AnalyzePositionDto } from './analyze-position.dto';

export type Evaluation = {
  engine: string;
  fen: string;
  sideToMove: 'white' | 'black';
  bestMove: string | null;
  depth: number;
  score: { type: 'cp' | 'mate'; value: number; perspective: 'white' };
  pv: string[];
  elapsedMs: number;
};

export function parseScore(line: string, side: 'w' | 'b') {
  if (/\b(?:lowerbound|upperbound)\b/.test(line) || /\bmultipv ([2-9]|[1-9]\d+)/.test(line))
    return null;
  const score = /\bscore (cp|mate) (-?\d+)/.exec(line);
  const depth = /\bdepth (\d+)/.exec(line);
  if (!score || !depth) return null;
  return {
    depth: Number(depth[1]),
    score: {
      type: score[1] as 'cp' | 'mate',
      value: Number(score[2]) * (side === 'w' ? 1 : -1),
      perspective: 'white' as const,
    },
    pv: line.split(' pv ')[1]?.trim().split(/\s+/) ?? [],
  };
}

export function validatePosition(fen: string): Chess {
  if (
    typeof fen !== 'string' ||
    /[\r\n]/.test(fen) ||
    fen.length > 150 ||
    fen.trim().split(/\s+/).length !== 6
  ) {
    throw new BadRequestException('Enter a complete, single-line FEN position (six fields).');
  }
  try {
    const chess = new Chess(fen.trim());
    const fields = fen.trim().split(/\s+/);
    if (Number(fields[4]) > 32767 || Number(fields[5]) > 50000) throw new Error();
    // chess.js checks FEN syntax; also reject positions where the previous mover left their king in check.
    const otherSide = fields[1] === 'w' ? 'b' : 'w';
    const otherKing = chess
      .board()
      .flat()
      .find((p) => p?.type === 'k' && p.color === otherSide)!;
    if (chess.isAttacked(otherKing.square, chess.turn())) throw new Error();
    for (const color of ['w', 'b'] as const) {
      const pieces = chess
        .board()
        .flat()
        .filter((p) => p?.color === color);
      const count = (type: string) => pieces.filter((p) => p?.type === type).length;
      const promotions =
        Math.max(0, count('q') - 1) +
        Math.max(0, count('r') - 2) +
        Math.max(0, count('b') - 2) +
        Math.max(0, count('n') - 2);
      if (count('p') > 8 || count('p') + promotions > 8) throw new Error();
    }
    return chess;
  } catch {
    throw new BadRequestException(
      'Invalid or illegal FEN position. Check the pieces, kings and side to move.',
    );
  }
}

@Injectable()
export class StockfishService implements OnModuleDestroy {
  private readonly processes = new Set<ChildProcessWithoutNullStreams>();
  private closing = false;

  onModuleDestroy() {
    this.closing = true;
    for (const child of this.processes) child.kill();
  }

  async analyze(
    input: AnalyzePositionDto,
    searchMs = 2000,
    history?: { initialFen: string; moves: string[] },
  ): Promise<Evaluation> {
    const chess = validatePosition(input.fen);
    const depth = input.depth ?? 12;
    if (!Number.isInteger(depth) || depth < 1 || depth > 18)
      throw new BadRequestException('Depth must be between 1 and 18.');
    if (this.closing) throw new ServiceUnavailableException('Analysis service is shutting down.');
    if (this.processes.size >= 2)
      throw new HttpException(
        'Both analysis workers are busy. Try again shortly.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    const fen = chess.fen();
    const started = Date.now();
    let child: ChildProcessWithoutNullStreams;
    try {
      // The bundled single-thread WASM engine runs in an isolated Node process on Windows/Linux/macOS.
      // STOCKFISH_PATH may instead point to an administrator-installed native executable.
      const enginePath = process.env.STOCKFISH_PATH;
      child = enginePath
        ? spawn(enginePath, [], { windowsHide: true, shell: false })
        : spawn(process.execPath, [findEngine('lite-single')], { windowsHide: true, shell: false });
    } catch {
      throw new ServiceUnavailableException(
        'Stockfish is unavailable. Check the backend engine installation.',
      );
    }
    this.processes.add(child);
    return new Promise<Evaluation>((resolve, reject) => {
      let settled = false;
      let ready = false;
      let engine = 'Stockfish';
      let evaluation: ReturnType<typeof parseScore> = null;
      const lines = createInterface({ input: child.stdout });
      const finish = (error?: Error, bestMove?: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        lines.close();
        child.stdin.destroy();
        child.kill();
        if (error) return reject(error);
        if (!evaluation)
          return reject(
            new ServiceUnavailableException('Stockfish returned no evaluation. Try again.'),
          );
        resolve({
          engine,
          fen,
          sideToMove: chess.turn() === 'w' ? 'white' : 'black',
          bestMove: bestMove && bestMove !== '(none)' && bestMove !== '0000' ? bestMove : null,
          ...evaluation,
          elapsedMs: Date.now() - started,
        });
      };
      // Includes startup and search; movetime below independently caps CPU work.
      const timeout = setTimeout(
        () => finish(new GatewayTimeoutException('Stockfish analysis timed out. Try again.')),
        15000,
      );
      child.once('error', () =>
        finish(
          new ServiceUnavailableException('Could not start Stockfish. Check the engine path.'),
        ),
      );
      child.once('close', () => {
        this.processes.delete(child);
        finish(
          new ServiceUnavailableException('Stockfish stopped before completing the analysis.'),
        );
      });
      child.stdin.on('error', () =>
        finish(new ServiceUnavailableException('Stockfish communication failed.')),
      );
      // Drain stderr without exposing filesystem paths or engine internals to clients.
      child.stderr.resume();
      lines.on('line', (raw: string) => {
        const line = raw.trim();
        if (line.startsWith('id name ')) engine = line.slice(8);
        if (line === 'uciok')
          child.stdin.write(
            'setoption name Threads value 1\nsetoption name Hash value 16\nisready\n',
          );
        if (line === 'readyok' && !ready) {
          ready = true;
          const position = history
            ? `position fen ${history.initialFen} moves ${history.moves.join(' ')}`
            : `position fen ${fen}`;
          child.stdin.write(
            `ucinewgame\n${position}\ngo depth ${depth} movetime ${Math.max(100, Math.min(2000, searchMs))}\n`,
          );
        }
        if (ready) evaluation = parseScore(line, chess.turn()) ?? evaluation;
        if (line.startsWith('bestmove ')) finish(undefined, line.split(/\s+/)[1]);
      });
      child.stdin.write('uci\n');
    });
  }
}
