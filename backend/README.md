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
- `POST /games/lichess/import` nolasa piesaistītā konta publisko spēļu vēsturi pa Lichess API
  lapām, pārveido PGN un saglabā partijas tajā pašā `games` tabulā ar platformu `LICHESS`.
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
