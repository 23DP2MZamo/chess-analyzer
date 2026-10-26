import { describe, expect, it } from 'vitest';
import { fenProblem } from './fen';
import { DEFAULT_POSITION } from 'chess.js';
describe('Friendly FEN validation', () => {
  it('accepts samples and explains missing fields, links, PGN, missing kings and illegal turns', () => {
    expect(fenProblem(DEFAULT_POSITION)).toBe('');
    expect(fenProblem('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1')).toBe('');
    expect(fenProblem('8/8/7k/8/8/5K2/8/4R3 w - - 0 1')).toBe('');
    expect(fenProblem('')).toContain('sample');
    expect(fenProblem('https://chess.com/game/live/123')).toContain('link');
    expect(fenProblem('1. e4 e5')).toContain('PGN');
    expect(fenProblem('8/8/8/8/8/8/8/8')).toContain('six fields');
    expect(fenProblem('8/8/8/8/8/8/8/8 w - - 0 1')).toMatch(/king/i);
    expect(fenProblem('4k3/8/8/8/8/8/4R3/4K3 w - - 0 1')).toContain('not legal');
  });
});
