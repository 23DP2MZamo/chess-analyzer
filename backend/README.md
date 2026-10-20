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

Arhīvu pieprasījumi tiek veikti ierobežotās grupās, bet partijas datubāzē tiek ievietotas pa
100 ierakstiem. Chess.com spēles unikālitāte ir noteikta katra lietotāja ietvaros, tāpēc viena
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
