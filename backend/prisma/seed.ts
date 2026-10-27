import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL nav definēts .env failā');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const BASE_URL = 'https://raw.githubusercontent.com/lichess-org/chess-openings/master';

async function seedOpenings() {
  const openings = new Map<string, { eco: string; name: string }>();
  const volumes = ['a', 'b', 'c', 'd', 'e'];

  for (const volume of volumes) {
    const url = `${BASE_URL}/${volume}.tsv`;
    console.log(`Lejupielādē ECO datus: ${volume.toUpperCase()}`);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Neizdevās lejupielādēt ${url}: ${response.status}`);
    }

    const content = await response.text();
    const lines = content.split(/\r?\n/);

    for (const line of lines.slice(1)) {
      if (!line.trim()) continue;

      const [eco, name] = line.split('\t');

      if (!eco || !name) continue;

      const key = JSON.stringify([eco, name]);
      if (!openings.has(key)) {
        openings.set(key, { eco, name });
      }
    }
  }

  let processed = 0;

  for (const { eco, name } of openings.values()) {
    await prisma.opening.upsert({
      where: { eco_name: { eco, name } },
      update: { name },
      create: { eco, name },
    });

    processed++;
  }

  console.log(`ECO seed pabeigts! Apstrādātas ${processed} atvērumu kombinācijas.`);
}

seedOpenings()
  .catch((error: unknown) => {
    console.error('ECO seed kļūda:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
