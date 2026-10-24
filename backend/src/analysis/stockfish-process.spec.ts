import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { spawn } from 'node:child_process';
import { DEFAULT_POSITION } from 'chess.js';
import { StockfishService } from './stockfish.service';

jest.mock('node:child_process', () => ({ spawn: jest.fn() }));

function worker() {
  const child = Object.assign(new EventEmitter(), {
    stdin: new PassThrough(),
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    kill: jest.fn(function (this: EventEmitter) {
      queueMicrotask(() => this.emit('close', null));
      return true;
    }),
  });
  jest.mocked(spawn).mockReturnValueOnce(child as never);
  return child;
}

describe('Stockfish process lifecycle', () => {
  let service: StockfishService;
  beforeEach(() => {
    service = new StockfishService();
    jest.clearAllMocks();
  });
  afterEach(() => {
    service.onModuleDestroy();
    jest.useRealTimers();
  });

  it('limits concurrency and releases capacity when a process fails', async () => {
    const first = worker();
    const second = worker();
    const p1 = service.analyze({ fen: DEFAULT_POSITION, depth: 3 });
    const p2 = service.analyze({ fen: DEFAULT_POSITION, depth: 3 });
    await expect(service.analyze({ fen: DEFAULT_POSITION, depth: 3 })).rejects.toMatchObject({
      status: 429,
    });
    first.emit('error', new Error('spawn failed'));
    second.emit('close', 1);
    await expect(p1).rejects.toMatchObject({ status: 503 });
    await expect(p2).rejects.toMatchObject({ status: 503 });
    await Promise.resolve();
    const next = worker();
    const p3 = service.analyze({ fen: DEFAULT_POSITION, depth: 3 });
    next.emit('close', 1);
    await expect(p3).rejects.toMatchObject({ status: 503 });
    expect(spawn).toHaveBeenCalledTimes(3);
  });

  it('kills a silent engine on timeout', async () => {
    jest.useFakeTimers();
    const child = worker();
    const promise = service.analyze({ fen: DEFAULT_POSITION, depth: 3 });
    const rejected = expect(promise).rejects.toMatchObject({ status: 504 });
    await jest.advanceTimersByTimeAsync(15000);
    await rejected;
    expect(child.kill).toHaveBeenCalled();
  });

  it('cleans up active engines on shutdown', async () => {
    const child = worker();
    const promise = service.analyze({ fen: DEFAULT_POSITION, depth: 3 });
    service.onModuleDestroy();
    await expect(promise).rejects.toMatchObject({ status: 503 });
    await expect(service.analyze({ fen: DEFAULT_POSITION, depth: 3 })).rejects.toMatchObject({
      status: 503,
    });
    expect(child.kill).toHaveBeenCalled();
  });
});
