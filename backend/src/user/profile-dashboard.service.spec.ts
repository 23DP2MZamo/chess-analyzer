import { ProfileDashboardService } from './profile-dashboard.service';
import { ProfileDashboardQuery } from './profile-dashboard.dto';
import { PrismaService } from '../prisma/prisma.service';
const user = { id: 'owner', username: 'Owner', role: 'USER', createdAt: new Date() };
const accounts = [
  { id: 'a', platform: 'CHESSCOM', platformUsername: 'Owner', connectedAt: new Date() },
  { id: 'b', platform: 'LICHESS', platformUsername: 'OtherName', connectedAt: new Date() },
];
const base = {
  whiteUsername: 'Opponent',
  blackUsername: 'OWNER',
  whiteElo: 3000,
  blackElo: 1440,
  format: 'BLITZ',
  mode: 'RATED',
  timeControl: '180+2',
  opening: null,
  playedAt: new Date(),
};
const games = [
  {
    ...base,
    id: 'one',
    platform: 'CHESSCOM',
    whiteUsername: 'owner',
    blackUsername: 'Opponent',
    whiteElo: 1350,
    result: 'WHITE_WIN',
  },
  { ...base, id: 'two', platform: 'CHESSCOM', result: 'WHITE_WIN' },
  {
    ...base,
    id: 'three',
    platform: 'LICHESS',
    whiteUsername: 'othername',
    blackUsername: 'Opponent',
    whiteElo: 1600,
    result: 'DRAW',
  },
  {
    ...base,
    id: 'four',
    platform: 'CHESSCOM',
    mode: 'CASUAL',
    blackElo: 2000,
    result: 'BLACK_WIN',
  },
];
describe('Profile dashboard data', () => {
  const db = {
    user: { findUnique: jest.fn() },
    linkedAccount: { findMany: jest.fn() },
    game: { findMany: jest.fn() },
  };
  let service: ProfileDashboardService;
  beforeEach(() => {
    jest.clearAllMocks();
    db.user.findUnique.mockResolvedValue(user);
    db.linkedAccount.findMany.mockResolvedValue(accounts);
    db.game.findMany.mockImplementation(
      ({
        where,
        select,
      }: {
        where: { platform?: string; id?: { in: string[] } };
        select: { pgn?: boolean };
      }) =>
        Promise.resolve(
          select.pgn
            ? games
                .filter((game) => where.id?.in.includes(game.id))
                .map((game) => ({
                  id: game.id,
                  pgn: '[ECO "B20"]\n[Opening "Sicilian Defense"]\n1. e4 c5 *',
                }))
            : games.filter((game) => !where.platform || game.platform === where.platform),
        ),
    );
    service = new ProfileDashboardService(db as unknown as PrismaService);
  });
  it('uses the linked player’s side and keeps platforms and rating formats distinct', async () => {
    const result = await service.get('owner', new ProfileDashboardQuery());
    expect(result.summary).toMatchObject({ total: 3, wins: 2, losses: 1, draws: 0 });
    expect(result.ratingSeries[0].points.map((point) => point.rating)).toEqual([1350, 1440]);
    expect(result.ratingSeries[0].currentRating).toBe(1440);
    expect(result.recentGames[0]).toMatchObject({
      opponent: 'Opponent',
      color: 'BLACK',
      moveCount: 1,
    });
    expect(db.game.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'owner', platform: 'CHESSCOM' } }),
    );
    const global = await service.get(
      'owner',
      Object.assign(new ProfileDashboardQuery(), { platform: 'ALL' }),
    );
    expect(global.summary.total).toBe(4);
    expect(global.ratingSeries).toHaveLength(2);
    expect(global.ratingSeries[1].currentRating).toBe(1600);
  });
  it('shows genuine empty state instead of fabricating a rating or loss', async () => {
    db.linkedAccount.findMany.mockResolvedValue([]);
    db.game.findMany.mockResolvedValue([]);
    const result = await service.get('owner', new ProfileDashboardQuery());
    expect(result.summary).toMatchObject({ total: 0, wins: 0, losses: 0, winRate: null });
    expect(result.ratingSeries).toEqual([]);
    expect(result.recentGames).toEqual([]);
  });
  it('rejects a removed user', async () => {
    db.user.findUnique.mockResolvedValue(null);
    await expect(service.get('owner', new ProfileDashboardQuery())).rejects.toMatchObject({
      status: 404,
    });
  });
});
