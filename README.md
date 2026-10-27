# Chess Analyzer

Chess Analyzer ir tīmekļa lietotne šaha partiju importēšanai, pārskatīšanai un analīzei. Lietotājs piesaista publisku Chess.com vai Lichess lietotājvārdu, importē pabeigtas partijas, atlasa tās un pārskata gājienus ar Stockfish palīdzību. Atsevišķi pieejama vienas pozīcijas analīze pēc FEN.

## Dokumentācija

- [Lietotāja instrukcija Word formātā](docs/Chess_Analyzer_lietotaja_instrukcija.docx) — darbības soli pa solim, rezultātu skaidrojumi un problēmu risināšana.
- [Backend integrāciju un palaišanas piezīmes](backend/README.md).
- [Analīzes un filtru tehniskais apraksts](FEATURES-ANALYSIS-AND-FILTERS.md).
- [Lietojamības uzlabojumi](UX-REVIEW-IMPORTS.md).

## Iespējas

- Reģistrācija ar automātisku autentifikāciju; pieteikšanās ar lietotājvārdu vai e-pastu. Abas darbības atver profilu.
- JWT autentifikācija ar HttpOnly sīkdatni, USER/ADMIN lomas un bloķētu kontu pārbaude.
- Viena Chess.com un viena Lichess publiska konta piesaiste katram lietotājam. Piesaiste pārbauda lietotājvārda esamību; tā nav OAuth autorizācija vai īpašumtiesību apliecināšana.
- Chess.com mēnešu arhīvu un pēdējo 1–300 Lichess partiju imports. Atkārtots imports neveido dublikātus viena lietotāja ietvaros.
- Filtri pēc formāta, rated/casual režīma, rezultāta, datumiem un atklājuma; grupēšana pēc atklājuma un kārtošana pēc datuma, sava Elo vai precizitātes.
- Atklājuma piesaiste pēc PGN ECO un nosaukuma/variācijas. Nezināmai vai neviennozīmīgai atbilstībai `openingId` ir `null`.
- Profila panelis ar platformu cilnēm, importētu rated partiju reitingu vēsturi, rezultātiem un pēdējām partijām.
- Atsevišķa Settings lapa konta informācijas rediģēšanai.
- Stockfish partijas pārskats ar Summary/Moves cilnēm, gājienu navigāciju un abu spēlētāju statistiku; FEN analīze ar paraugpozīcijām.
- Demonstrācijas partijas izmēģināšanai un ADMIN panelis lietotāju pārvaldībai.

## Sistēmas uzbūve

```text
Pārlūks → React un Tailwind frontend → NestJS API → PostgreSQL caur Prisma
                                           ├─ Chess.com un Lichess publiskie API
                                           └─ Stockfish process
```

| Daļa | Tehnoloģijas | Mape |
| --- | --- | --- |
| Saskarne | React 19, TypeScript, Vite, Tailwind CSS 4 | `frontend/` |
| Serveris | NestJS 11, TypeScript, JWT | `backend/` |
| Datubāze | PostgreSQL un Prisma 7 | `backend/prisma/` |
| Šaha analīze | chess.js un Stockfish 19 pakotne | `backend/src/analysis/` |
| Lietotāja dokumentācija | Word dokuments | `docs/` |

## Priekšnosacījumi un konfigurācija

Vajadzīgs Node.js ar npm (izstrādes vidē izmantots Node.js 24), pieejama PostgreSQL datubāze un pārlūks ar iespējotām sīkdatnēm. Kontu pārbaudei, importam un atklājumu seed vajadzīgs internets. Datubāzei jābūt izveidotai pirms migrāciju palaišanas.

Izveidojiet `backend/.env`, aizstājot piemēra vērtības ar savas vides datiem:

```dotenv
DATABASE_URL=postgresql://DB_USER:DB_PASSWORD@localhost:5432/chess_analyzer
JWT_SECRET=REPLACE_WITH_A_LONG_RANDOM_SECRET
FRONTEND_ORIGIN=http://localhost:5173
PORT=3000
```

Izmantojiet garu, nejaušu `JWT_SECRET`; neievietojiet īstos noslēpumus Git. Ja `JWT_SECRET` nav norādīts, backend atbalsta `SESSION_SECRET` kā rezerves noslēpumu.

Frontend noklusējuma API ir `http://localhost:3000`. Citai adresei izveidojiet `frontend/.env.local`:

```dotenv
VITE_API_URL=http://localhost:3000
```

Pēc konfigurācijas maiņas serveri jāpārstartē. Frontend adresei precīzi jāsakrīt ar `FRONTEND_ORIGIN`. Nejauciet `localhost` un `127.0.0.1`. Produkcijas režīma autentifikācijas sīkdatnei nepieciešams HTTPS.

## Backend palaišana

Pirmajā terminālī, sākot no repozitorija saknes:

```powershell
cd backend
npm ci
npm run prisma:generate
npx prisma migrate deploy
npm run seed:openings
npm run start:dev
```

`migrate deploy` izpilda esošās migrācijas. `seed:openings` ielādē atklājumu katalogu; tas nav jāatkārto katrā starta reizē. API pēc noklusējuma darbojas `http://localhost:3000`.

Stockfish WASM dzinējs ir backend atkarībās; atsevišķs izpildāmais fails nav obligāts. Uzturētājs var konfigurēt savu native dzinēju ar `STOCKFISH_PATH`.

## Frontend palaišana

Otrajā terminālī, sākot no repozitorija saknes:

```powershell
cd frontend
npm ci
npm run dev -- --port 5173 --strictPort
```

Atveriet [http://localhost:5173](http://localhost:5173). **`npm run build` sagatavo failus; React izstrādes serveri palaiž `npm run dev`.** Abiem serveriem jādarbojas vienlaikus. Saknes `package.json` nepalaiž abas lietotnes. Apturēšana: `Ctrl+C` attiecīgajā terminālī.

## Demonstrācijas dati

Lietotājam bez importētām partijām Games lapā pieejami `Analyze sample` paraugi. Tie netiek saglabāti personīgajā vēsturē un nemaina statistiku.

Atsevišķa demonstrācijas konta datubāzes piemēriem backend mapē:

```powershell
$env:DEMO_EMAIL='demo-preview@example.test'
$env:DEMO_PASSWORD='IZVELIETIES_SAVU_TESTA_PAROLI'
npm run seed:games
```

Izmantojiet testa adresi domēnā `example.test` un savu paroli ar vismaz 12 rakstzīmēm, nepārsniedzot 72 UTF-8 baitus. Esošam demonstrācijas kontam jānorāda tā sākotnējā parole; seed to nemaina. Datubāzē saglabātās paraugpartijas piedalās demonstrācijas konta statistikā. Tās atšķiras no īslaicīgajiem `Analyze sample` paraugiem.

## Galvenās lapas

| Lapa | Maršruts | Piekļuve |
| --- | --- | --- |
| Sākumlapa | `/home` | Publiska |
| Reģistrācija un pieteikšanās | `/signup`, `/login` | Publiska |
| Profils un kontu piesaiste | `/profile`, `/profile#connections` | Autentificēts lietotājs |
| Iestatījumi | `/settings` | Autentificēts lietotājs |
| Partiju saraksts | `/games` | Autentificēts lietotājs |
| Pozīcijas analīze | `/analyze` | Autentificēts lietotājs |
| Partijas pārskats | `/analyze/games/:gameId` | Partijas īpašnieks vai sistēmas paraugs pēc autentifikācijas |
| Kopējā statistika | `/stats` | Autentificēts lietotājs |
| Administrēšana | `/admin` | ADMIN |

## Rezultātu nozīme un ierobežojumi

- Pozīcijas vērtējums ir no balto skatpunkta: pozitīvs ir par labu baltajiem, negatīvs — melnajiem.
- Partijas pārskats pieprasa dziļumu 14 ar vienas sekundes meklēšanas limitu katrai pozīcijai. Saskarnē redzams zemākais pabeigtais dziļums. FEN analīzē lietotājs izvēlas dziļumu 1–18; meklēšanas limits ir divas sekundes.
- **Estimated accuracy ir mūsu aprēķināts vidējais gājienu precizitātes novērtējums, nevis Chess.com CAPS2 vai Lichess pilnas partijas precizitāte.** Chess.com API piegādātās precizitātes attēlošana nav ieviesta.
- PGN faila augšupielādes vai partijas URL ievades importa forma nav ieviesta; imports notiek pēc piesaistīta publiska lietotājvārda.
- Kontu atsaistīšanas/pārsaistes saskarne un paroles atjaunošana pa e-pastu nav ieviesta.
- Pilnas partijas pārskats paredzēts standarta šaham līdz 400 pusgājieniem. Vienā backend procesā darbojas līdz diviem partiju pārskatiem, ne vairāk kā viens vienam lietotājam.
- Profila grafiks rāda līdz 60 importētu rated partiju reitinga punktiem katrai platformai izvēlētajā formātā, nevis dzīvo reitingu. Platformu Elo netiek vidējots.
- Atklājumu meklē pēc PGN metadatiem, nevis atpazīst no gājienu secības.

## Pārbaudes un būvēšana

Backend mapē:

```powershell
npm test -- --runInBand
npm run test:integration
npm run test:e2e
npm run build
```

Integrācijas testiem vajadzīga testa datubāze un tiesības izveidot/dzēst izolētas testa shēmas.

Frontend mapē:

```powershell
npm test -- --maxWorkers=1
npm run lint
npm run build
```

Prisma klients tiek automātiski ģenerēts pirms backend būvēšanas un izstrādes palaišanas. Migrācijas jāpalaiž atsevišķi. Backend produkcijas palaišana pēc būvēšanas: `npm run start:prod`. Frontend `npm run preview` lokāli rāda sagatavoto frontend būvējumu; tas nepalaiž API.

## Biežākās problēmas

| Problēma | Rīcība |
| --- | --- |
| `EADDRINUSE` portam 3000 vai 5173 | Apturiet iepriekš palaisto šī projekta serveri tā terminālī. Mainot portu, saskaņojiet arī API adresi un frontend origin. |
| Prisma kļūda par `eco_name` vai `isBlocked` | Backend mapē palaidiet `npm run prisma:generate`, `npx prisma migrate deploy` un pārstartējiet serveri. |
| Neizdodas ielādēt datus | Pārbaudiet API, PostgreSQL savienojumu un vides konfigurāciju. |
| 401 vai 403 | Piesakieties atkārtoti; ADMIN lapai vajadzīga attiecīgā loma. Bloķētam kontam jāvēršas pie administratora. |
| 429 importā vai analīzē | Uzgaidiet un atkārtojiet darbību; nepalaižiet vairākus vienādus darbus. |
| `openingId` ir `null` | Pārbaudiet kataloga seed un PGN metadatus. Nezināma vai neviennozīmīga atbilstība drīkst palikt tukša. |

Dokumentācija apraksta projekta stāvokli 2026. gada 27. oktobrī.
