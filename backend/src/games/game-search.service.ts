import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SearchGamesDto } from './search-games.dto';

@Injectable()
export class GameSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(userId: string, query: SearchGamesDto) {
    const date = (value?: string) => {
      if (!value) return undefined;
      const parsed = new Date(value + 'T00:00:00.000Z');
      if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
        throw new BadRequestException('Dates must be valid calendar dates (YYYY-MM-DD).');
      }
      return parsed;
    };
    const from = date(query.dateFrom);
    const through = date(query.dateTo);
    if (from && through && from > through)
      throw new BadRequestException('Start date must be on or before end date.');
    const conditions: Prisma.Sql[] = [];
    if (query.format) conditions.push(Prisma.sql`format::text = ${query.format}`);
    if (query.mode) conditions.push(Prisma.sql`mode::text = ${query.mode}`);
    if (query.result) conditions.push(Prisma.sql`"playerResult" = ${query.result}`);
    if (from) conditions.push(Prisma.sql`"playedAt" >= ${from}`);
    if (through)
      conditions.push(Prisma.sql`"playedAt" < ${new Date(through.getTime() + 86400000)}`);
    if (query.opening?.trim())
      conditions.push(
        Prisma.sql`position(lower(${query.opening.trim()}) in lower(coalesce(eco, '') || ' ' || coalesce("openingName", ''))) > 0`,
      );
    const where = conditions.length
      ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
      : Prisma.empty;
    // Only server-owned identifiers enter raw SQL. All user values remain bound parameters.
    const sort = {
      date: Prisma.sql`"playedAt"`,
      elo: Prisma.sql`"playerElo"`,
      accuracy: Prisma.sql`"playerAccuracy"`,
    }[query.sortBy];
    const direction = query.order === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    const grouping = query.groupBy === 'opening' ? Prisma.sql`"groupKey" ASC,` : Prisma.empty;
    const rows = await this.prisma.$queryRaw<{ result: unknown }[]>(Prisma.sql`
      WITH base AS (
        SELECT g.id, g.platform, g."externalId", g."whiteUsername", g."blackUsername",
          g."whiteElo", g."blackElo", g.result, g.format, g.mode, g."timeControl", g."playedAt" AT TIME ZONE 'UTC' AS "playedAt",
          coalesce(o.eco, substring(g.pgn from ${'(?m)^\\[ECO "([A-E][0-9]{2})"\\]'})) AS eco,
          coalesce(o.name, substring(g.pgn from ${'(?m)^\\[Opening "([^"\r\n]+)"\\]'})) AS "openingName",
          CASE WHEN lower(la."platformUsername") = lower(g."whiteUsername") THEN 'WHITE'
               WHEN lower(la."platformUsername") = lower(g."blackUsername") THEN 'BLACK' END AS color,
          a."accuracyWhite", a."accuracyBlack"
        FROM games g
        LEFT JOIN linked_accounts la ON la."userId" = g."userId" AND la.platform = g.platform
        LEFT JOIN openings o ON o.id = g."openingId"
        LEFT JOIN analyses a ON a."gameId" = g.id
        WHERE g."userId" = ${userId}
      ), enriched AS (
        SELECT *,
          CASE WHEN color IS NULL THEN 'UNKNOWN' WHEN result = 'DRAW' THEN 'DRAW'
               WHEN (color = 'WHITE' AND result = 'WHITE_WIN') OR (color = 'BLACK' AND result = 'BLACK_WIN') THEN 'WIN' ELSE 'LOSS' END AS "playerResult",
          CASE WHEN color = 'WHITE' THEN "whiteElo" WHEN color = 'BLACK' THEN "blackElo" END AS "playerElo",
          CASE WHEN color = 'WHITE' THEN "accuracyWhite" WHEN color = 'BLACK' THEN "accuracyBlack" END AS "playerAccuracy",
          coalesce(eco, '') || '|' || coalesce("openingName", '') AS "groupKey",
          CASE WHEN eco IS NULL AND "openingName" IS NULL THEN NULL ELSE jsonb_build_object('eco', eco, 'name', "openingName") END AS opening
        FROM base
      ), filtered AS (SELECT * FROM enriched ${where}), page AS (
        SELECT row_number() OVER (ORDER BY ${grouping} ${sort} ${direction} NULLS LAST, "playedAt" DESC, id ASC) AS ordinal, id, platform, "externalId", "whiteUsername", "blackUsername", "whiteElo", "blackElo",
          result, format, mode, "timeControl", "playedAt", opening, "groupKey", "playerResult", "playerElo", "playerAccuracy"
        FROM filtered ORDER BY ${grouping} ${sort} ${direction} NULLS LAST, "playedAt" DESC, id ASC
        LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}
      ), groups AS (
        SELECT "groupKey" AS key, min(eco) AS eco, min("openingName") AS name, count(*)::int AS count
        FROM filtered GROUP BY "groupKey" ORDER BY "groupKey"
      )
      SELECT jsonb_build_object(
        'items', coalesce((SELECT jsonb_agg(to_jsonb(page) - 'ordinal' ORDER BY ordinal) FROM page), '[]'::jsonb),
        'total', (SELECT count(*)::int FROM filtered), 'totalOwned', (SELECT count(*)::int FROM base), 'connectedAccountCount', (SELECT count(*)::int FROM linked_accounts WHERE "userId" = ${userId}), 'page', ${query.page}::int, 'pageSize', ${query.pageSize}::int,
        'groups', CASE WHEN ${query.groupBy === 'opening'} THEN coalesce((SELECT jsonb_agg(to_jsonb(groups) ORDER BY key) FROM groups), '[]'::jsonb) ELSE '[]'::jsonb END) AS result
    `);
    return rows[0].result;
  }
}
