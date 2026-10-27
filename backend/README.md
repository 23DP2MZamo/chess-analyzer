# Chess.com integrācija

Lietotājs var piesaistīt Chess.com kontu un importēt tā publiski pieejamo partiju arhīvu.
OAuth vai Chess.com parole nav nepieciešama — piesaiste pārbauda lietotājvārdu publiskajā
Chess.com API.

Visiem tālāk minētajiem maršrutiem nepieciešama autentificēta sesija:

- `POST /accounts/chesscom` ar JSON `{ "username": "ChessComUser" }` pārbauda lietotājvārdu un
  piesaista kontu. Katram lietotājam var būt piesaistīts viens konts katrā platformā.
- `POST /accounts/lichess` ar JSON `{ "username": "LichessUser" }` pārbauda un piesaista publisku
  Lichess kontu.
- `GET /accounts` atgriež piesaistītos kontus.
- `POST /games/chesscom/import` nolasa piesaistītā konta arhīvus, saglabā partijas un atgriež
  `{ "imported": 12, "skipped": 3 }`. Atkārtots imports izlaiž šim lietotājam jau saglabātās
  partijas.
- `POST /games/lichess/import` nolasa piesaistītā konta jaunākās pabeigtās partijas no Lichess API, pārveido PGN un saglabā partijas tajā pašā `games` tabulā ar platformu `LICHESS`.
  Body lauks `limit` ir vesels skaitlis 1–300; pēc noklusējuma importē 100 jaunākās partijas.
  Atbildei ir tāds pats `{ "imported": 12, "skipped": 3 }` formāts.

Chess.com mēnešu arhīvi tiek ielādēti secīgi hronoloģiskā secībā (no vecākā uz jaunāko).
Katra mēneša partijas tiek saglabātas datubāzē pa 100 ierakstiem pirms nākamā mēneša ielādes. Chess.com spēles unikālitāte ir noteikta katra lietotāja ietvaros, tāpēc viena
spēle var būt pieejama vairākiem mūsu lietotājiem.

## Pārbaude ar Postman

Importējiet `postman/Lichess integration.postman_collection.json` Postman un aizpildiet
kolekcijas mainīgos `identifier`, `password` un `lichessUsername` ar reālu publisku Lichess
lietotājvārdu. `baseUrl` pēc noklusējuma norāda uz `http://localhost:3000`. Palaidiet kolekciju
secībā ar reģistrētu lietotāju un piesaistītu izstrādes datubāzi. Kolekcija piesakās ar sesiju,
pārbauda Lichess konta piesaisti, importē spēles un pārbauda, ka `GET /games` atgriež
saglabātās Lichess partijas.

Chess.com integrācijas manuālai pārbaudei importējiet `postman/Chess.com integration.postman_collection.json`
un aizpildiet tās `identifier`, `password` un `chesscomUsername` mainīgos.
Izmantojiet attiecīgās platformas kontu ar vismaz vienu publiski pieejamu spēli.

Lietotājam nedrīkst jau būt piesaistīts cits Chess.com konts, jo katram lietotājam ir atļauts
viens konts platformā. Neizmantojiet produkcijas kontu vai datubāzi integrācijas pārbaudei.

## Chess.com importa kļūdas un atkārtota palaišana

- `404`: konts nav piesaistīts vai Chess.com konts/arhīvs nav atrasts.
- `409`: šim lietotājam šajā serverī jau darbojas imports.
- `429`: Chess.com pieprasījumu limits; atbildē ir `retryAfter` sekundēs.
- `503`: partiju saglabāšana DB neizdevās; atbildē ir kļūmes arhīvs un saglabāto/izlaisto partiju skaits.
- `502`: tīkla kļūda, taimauts, nederīgs JSON/dati vai Chess.com servera kļūda.

Ja mēneša ielāde neizdodas, imports apstājas; atbildē ir `failedArchive`, `imported` un `skipped`.
Iepriekš saglabātās partijas paliek DB. Atkārtoti palaižot to pašu importa maršrutu, jau saglabātās
partijas tiek izlaistas; nepabeigtais mēnesis tiek mēģināts vēlreiz. Arī DB kļūda aptur nākamo mēnešu
ielādi un atbrīvo importa bloķējumu. Datu unikālitāti nodrošina DB atslēga
`[userId, platform, externalId]`. Tukšs arhīvu saraksts ir veiksmīgs imports ar nulles skaitītājiem.

API atbildes tiek pārbaudītas pirms saglabāšanas; arhīvu URL drīkst norādīt tikai uz konkrētā
lietotāja Chess.com mēneša arhīvu.

## Pēc repozitorija atjaunināšanas (Prisma)

`prisma/schema.prisma`, ģenerētais Prisma klients un datubāzes migrācijas ir jāsaskaņo.
Ja shēma mainīta pēc `git pull`, esošais `generated/prisma` klients vēl var saturēt vecās atslēgas.
Piemēram, `Opening` tagad izmanto `@@unique([eco, name])`, tāpēc seed kodā jālieto
`where: { eco_name: { eco, name } }`.

Palaidiet backend mapē ar savu konfigurēto `.env`:

```powershell
npm ci
npm run prisma:generate
npx prisma migrate deploy
npm run start:dev
```

`npm run build`, `npm start`, `npm run start:dev` un `npm run start:debug` automātiski ģenerē
Prisma klientu pirms kompilācijas. Migrācijas netiek automātiski palaistas pie starta.
`npm run seed:openings` izpilda publisko ECO datu seed; palaidiet to pēc migrācijām, ja
vajadzīgi atvērumu kataloga dati. Seed nav jāpalaiž katrā starta reizē.

ECO kods viens pats vairs nenosaka unikālu atvērumu. Imports sasaista pēc ECO un pilna
PGN atvēruma nosaukuma (ar `Variation`, ja norādīts); ja PGN ir tikai ECO, sasaisti veic
vienīgi tad, ja katalogā tam ir viens kandidāts. Neskaidras variācijas netiek minētas.
Atkārtots Chess.com vai Lichess imports arī pārskata agrākās atvērumu saites tikai
attiecīgā lietotāja partijām.

Pēc `npm run build` produkcijas serveri palaiž `npm run start:prod`; šī projekta
kompilētais ieejas fails ir `dist/src/main.js`.

## Reģistrācija un profila panelis

`POST /auth/signup` pieņem `{ username, email, password }`, izveido lietotāju un uzreiz
izsniedz to pašu HttpOnly `access_token` sīkdatni kā `POST /auth/signin`. Frontend pēc
reģistrācijas vai pieteikšanās atver `/profile`; konta rediģēšana atrodas `/settings`.
Platformu kontu piesaiste un imports paliek profilā (`/profile#connections`).

Aizsargātais `GET /user/me/dashboard?platform=CHESSCOM&format=BLITZ` atgriež tikai
pašreizējā lietotāja datus. `platform` ir `CHESSCOM`, `LICHESS` vai `ALL`; `format`
izvēlas reitinga grafika formātu, savukārt rezultātu statistika un pēdējās partijas aptver
visus izvēlētās platformas formātus. Grafiks izmanto savas krāsas Elo no importētām rated
partijām (līdz 60 punktiem katrai platformai), nevis dzīvo platformas reitingu.
Dažādu platformu Elo netiek vidējots. Bez identificējama piesaistīta lietotājvārda
partijas rezultāts ir nezināms un netiek pieskaitīts zaudējumiem.

Ja aizsargāta pieprasījuma laikā redzams `Unknown field isBlocked`, jāatjaunina Prisma
klients un migrācijas ar iepriekšējās sadaļas komandām un jāpārstartē backend process.
`isBlocked` jāpaliek autentifikācijas pārbaudē, lai bloķēti konti nevarētu piekļūt sistēmai.

## Game review scoring (review-v2)

Game reviews target depth 14 with a 1-second search limit per position; the report
shows the minimum completed depth. Played-move history is passed to Stockfish so
repetition is preserved. Scores are consistently from White's perspective.

Move labels use loss in estimated winning percentage for the player who moved:
5 percentage points = inaccuracy, 10 = mistake, 20 = blunder. A best engine move is
BEST, a single legal move is FORCED. Other moves losing less than 2 points are
EXCELLENT, otherwise GOOD. This avoids treating a 300-centipawn change in a heavily
won/lost position the same as a 300-centipawn change in an equal position.

Win percentage and individual move accuracy use the documented curves at
https://lichess.org/page/accuracy. The displayed per-player **estimated accuracy**
is a simple arithmetic mean of move accuracies. It is not Chess.com's proprietary
accuracy or Lichess's volatility-weighted/harmonic game aggregate. Forced/best
moves receive 100; a player with no moves has no accuracy value. No brilliant,
missed-chance or opening-book classification is invented without a detector.

Completed reviews carry `[review-v2]` in their engine metadata. Old cached reviews
return idle and are recalculated when opened; replacement is atomic, leaving the
previous result intact if the new run fails. The UI also provides Reanalyze game.
The report separates White and Black counts and uses the game's actual fullmove
numbers (including games starting from a FEN).
