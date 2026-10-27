DROP INDEX "openings_eco_key";

CREATE UNIQUE INDEX "openings_eco_name_key" ON "openings"("eco", "name");
