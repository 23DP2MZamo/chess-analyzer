import { BadRequestException } from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { Chess } from 'chess.js';
import { PrismaService } from '../prisma/prisma.service';
import { SAMPLE_GAMES, sampleGame } from './sample-games';

// Isolated demo identity only: never silently insert mock history into a real user's account.
export async function seedSampleGames(db: PrismaService, email: string, password: string) {
  if (
    !/^[a-z0-9._+-]+@example\.test$/.test(email) ||
    password.length < 12 ||
    Buffer.byteLength(password) > 72
  )
    throw new BadRequestException(
      'Use a demo email at example.test and a password of 12–72 bytes.',
    );
  const existing = await db.user.findUnique({ where: { email } });
  if (
    existing &&
    (existing.username !== 'demo-preview' || !(await compare(password, existing.passwordHash)))
  )
    throw new BadRequestException(
      'This demo identity already exists. Supply its original password; no account was changed.',
    );
  const passwordHash = existing?.passwordHash ?? (await hash(password, 12));
  return db.$transaction(async (tx) => {
    const user =
      existing ??
      (await tx.user.create({ data: { email, username: 'demo-preview', passwordHash } }));
    for (const fixture of SAMPLE_GAMES) {
      const sample = sampleGame(fixture.id)!;
      const parsed = new Chess();
      parsed.loadPgn(sample.pgn);
      const data = {
        userId: user.id,
        platform: sample.platform,
        externalId: sample.id,
        pgn: sample.pgn,
        whiteUsername: sample.whiteUsername,
        blackUsername: sample.blackUsername,
        whiteElo: sample.whiteElo,
        blackElo: sample.blackElo,
        result: sample.result,
        format: sample.format,
        mode: sample.mode,
        timeControl: sample.timeControl,
        playedAt: sample.playedAt,
      };
      await tx.game.upsert({
        where: {
          userId_platform_externalId: {
            userId: user.id,
            platform: sample.platform,
            externalId: sample.id,
          },
        },
        create: data,
        update: { timeControl: data.timeControl },
      });
    }
    await tx.linkedAccount.upsert({
      where: { userId_platform: { userId: user.id, platform: 'CHESSCOM' } },
      create: { userId: user.id, platform: 'CHESSCOM', platformUsername: 'DemoPlayer' },
      update: {},
    });
    return { userId: user.id, email, games: SAMPLE_GAMES.length };
  });
}
