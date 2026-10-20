# Chess.com integrācija

Lietotājs var piesaistīt Chess.com kontu un importēt tā publiski pieejamo partiju arhīvu.
OAuth vai Chess.com parole nav nepieciešama — piesaiste pārbauda lietotājvārdu publiskajā
Chess.com API.

Visiem tālāk minētajiem maršrutiem nepieciešama autentificēta sesija:

- `POST /accounts/chesscom` ar JSON `{ "username": "ChessComUser" }` pārbauda lietotājvārdu un
  piesaista kontu. Katram lietotājam var būt piesaistīts viens konts katrā platformā.
- `GET /accounts` atgriež piesaistītos kontus.
- `POST /games/chesscom/import` nolasa piesaistītā konta arhīvus, saglabā partijas un atgriež
  `{ "imported": 12, "skipped": 3 }`. Atkārtots imports izlaiž šim lietotājam jau saglabātās
  partijas.

Arhīvu pieprasījumi tiek veikti ierobežotās grupās, bet partijas datubāzē tiek ievietotas pa
100 ierakstiem. Chess.com spēles unikālitāte ir noteikta katra lietotāja ietvaros, tāpēc viena
spēle var būt pieejama vairākiem mūsu lietotājiem.

## Pārbaude ar Postman

Importējiet `postman/Chess.com integration.postman_collection.json` Postman un aizpildiet
kolekcijas mainīgos `identifier`, `password` un `chesscomUsername`. `baseUrl` pēc noklusējuma
norāda uz `http://localhost:3000`. Palaidiet kolekciju secībā ar jau reģistrēta lietotāja
piesaistīto izstrādes datubāzi. Kolekcija piesakās ar sesiju, pārbauda Chess.com konta piesaisti,
importē publiskos arhīvus un pārbauda, ka `GET /games` atgriež saglabātās Chess.com partijas.
Izmantojiet kontu ar vismaz vienu publiski pieejamu spēli.

Lietotājam nedrīkst jau būt piesaistīts cits Chess.com konts, jo katram lietotājam ir atļauts
viens konts platformā. Neizmantojiet produkcijas kontu vai datubāzi integrācijas pārbaudei.
