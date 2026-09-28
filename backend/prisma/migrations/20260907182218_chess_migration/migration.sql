-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('LICHESS', 'CHESSCOM');

-- CreateEnum
CREATE TYPE "GameResult" AS ENUM ('WHITE_WIN', 'BLACK_WIN', 'DRAW');

-- CreateEnum
CREATE TYPE "GameFormat" AS ENUM ('BULLET', 'BLITZ', 'RAPID', 'CLASSICAL', 'CORRESPONDENCE');

-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('RATED', 'CASUAL');

-- CreateEnum
CREATE TYPE "Color" AS ENUM ('WHITE', 'BLACK');

-- CreateEnum
CREATE TYPE "MoveClassification" AS ENUM ('BOOK', 'BEST', 'EXCELLENT', 'GOOD', 'INACCURACY', 'MISTAKE', 'BLUNDER', 'FORCED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linked_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "platformUsername" TEXT NOT NULL,
    "accessToken" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "linked_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "openings" (
    "id" TEXT NOT NULL,
    "eco" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "openings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "externalId" TEXT NOT NULL,
    "pgn" TEXT NOT NULL,
    "whiteUsername" TEXT NOT NULL,
    "blackUsername" TEXT NOT NULL,
    "whiteElo" INTEGER,
    "blackElo" INTEGER,
    "result" "GameResult" NOT NULL,
    "format" "GameFormat" NOT NULL,
    "mode" "GameMode" NOT NULL DEFAULT 'RATED',
    "timeControl" TEXT,
    "openingId" TEXT,
    "playedAt" TIMESTAMP(3) NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "engine" TEXT NOT NULL DEFAULT 'stockfish',
    "depth" INTEGER NOT NULL DEFAULT 18,
    "accuracyWhite" DOUBLE PRECISION,
    "accuracyBlack" DOUBLE PRECISION,
    "blunderCount" INTEGER NOT NULL DEFAULT 0,
    "mistakeCount" INTEGER NOT NULL DEFAULT 0,
    "inaccuracyCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "move_analyses" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "moveNumber" INTEGER NOT NULL,
    "color" "Color" NOT NULL,
    "san" TEXT NOT NULL,
    "fenBefore" TEXT NOT NULL,
    "fenAfter" TEXT NOT NULL,
    "evalBeforeCp" INTEGER,
    "evalAfterCp" INTEGER,
    "mateIn" INTEGER,
    "bestMove" TEXT,
    "classification" "MoveClassification" NOT NULL,

    CONSTRAINT "move_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "linked_accounts_userId_platform_key" ON "linked_accounts"("userId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "openings_eco_key" ON "openings"("eco");

-- CreateIndex
CREATE INDEX "games_userId_idx" ON "games"("userId");

-- CreateIndex
CREATE INDEX "games_format_idx" ON "games"("format");

-- CreateIndex
CREATE INDEX "games_mode_idx" ON "games"("mode");

-- CreateIndex
CREATE INDEX "games_openingId_idx" ON "games"("openingId");

-- CreateIndex
CREATE UNIQUE INDEX "games_platform_externalId_key" ON "games"("platform", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "analyses_gameId_key" ON "analyses"("gameId");

-- CreateIndex
CREATE INDEX "move_analyses_analysisId_idx" ON "move_analyses"("analysisId");

-- AddForeignKey
ALTER TABLE "linked_accounts" ADD CONSTRAINT "linked_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_openingId_fkey" FOREIGN KEY ("openingId") REFERENCES "openings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "move_analyses" ADD CONSTRAINT "move_analyses_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
