import { matchOpening } from './opening-matcher';
import { parsePgnOpening } from './pgn.parser';
const candidates = [
  { id: 'base', eco: 'B20', name: 'Sicilian Defense' },
  { id: 'wing', eco: 'B20', name: 'Sicilian Defense: Wing Gambit' },
];
describe('Opening families with multiple variations', () => {
  it('matches by ECO and normalized full name independent of query order', () => {
    const name = '  SICILIAN   Defense: Wing Gambit ';
    expect(matchOpening(candidates, 'B20', name)).toBe('wing');
    expect(matchOpening([...candidates].reverse(), 'B20', name)).toBe('wing');
    expect(matchOpening(candidates, 'B21', name)).toBeNull();
  });
  it('does not assign an arbitrary sibling when the PGN name is missing or unmatched', () => {
    expect(matchOpening(candidates, 'B20', null)).toBeNull();
    expect(matchOpening(candidates, 'B20', 'Another variation')).toBeNull();
    expect(matchOpening([candidates[0]], 'B20', null)).toBe('base');
    expect(matchOpening([candidates[0]], 'B20', 'Another variation')).toBeNull();
  });
  it('reads separate Opening and Variation headers, tolerating escaped quotes and CRLF', () => {
    expect(
      parsePgnOpening(
        '[ECO "b20"]\r\n[Opening "Sicilian Defense"]\r\n[Variation "Wing Gambit"]\r\n',
      ),
    ).toEqual({ eco: 'B20', name: 'Sicilian Defense: Wing Gambit' });
    expect(parsePgnOpening('[Opening "The \\"Quoted\\" Opening"]')).toEqual({
      eco: null,
      name: 'The "Quoted" Opening',
    });
    expect(parsePgnOpening('[Result "1-0"]')).toEqual({ eco: null, name: null });
  });
});
