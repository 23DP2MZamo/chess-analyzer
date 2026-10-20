DROP INDEX "games_platform_externalId_key";

CREATE UNIQUE INDEX "games_userId_platform_externalId_key"
ON "games"("userId", "platform", "externalId");
