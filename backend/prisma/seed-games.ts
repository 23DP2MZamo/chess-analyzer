import 'dotenv/config';
import { PrismaService } from '../src/prisma/prisma.service';
import { seedSampleGames } from '../src/games/sample-seed';
const db = new PrismaService();
async function main() {
  const email = process.env.DEMO_EMAIL ?? 'demo-preview@example.test';
  const password = process.env.DEMO_PASSWORD;
  if (!password)
    throw new Error(
      'Set DEMO_PASSWORD (at least 12 characters). The seed never resets existing passwords.',
    );
  const result = await seedSampleGames(db, email, password);
  console.log(
    `Seeded ${result.games} sample games for ${result.email}. Log in with DEMO_EMAIL / DEMO_PASSWORD. Re-running is safe.`,
  );
}
void main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Sample seed failed');
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
