export default function ImportHelp({ position = false }: { position?: boolean }) {
  return (
    <details className="my-5 rounded-sm border border-white/20 bg-[#242424] p-5 text-base text-[#dedbd5]">
      <summary className="min-h-7 cursor-pointer font-medium text-[#f3b187] focus-visible:outline-2 focus-visible:outline-[#f3b187]">
        {position ? 'What is FEN? How do I copy a position?' : 'How do I import my games?'}
      </summary>
      <div className="mt-4 space-y-4 leading-7">
        {position ? (
          <>
            <p>
              FEN is a text snapshot of one board position. You only need it for a specific
              position. To review a whole game, open{' '}
              <a className="text-[#f3b187] underline" href="/games">
                Your games
              </a>{' '}
              and choose <strong>Analyze game</strong>—no copying needed.
            </p>
            <p>
              <strong>Lichess:</strong> open a finished game → Analysis board → FEN &amp; PGN below
              the board. Copy the FEN field for the position you selected.
            </p>
            <p>
              <strong>Chess.com:</strong> open the game’s Analysis screen → Share → PGN. Copy the
              FEN shown above the move record.
            </p>
          </>
        ) : (
          <>
            <p>
              <strong>Fastest way:</strong> open Profile, link your Chess.com or Lichess username,
              then use the matching Import button here. Your finished games are downloaded
              automatically. Select <strong>Analyze game</strong> beside a game to review it.
            </p>
            <p>
              <strong>Find your username:</strong> it is the name at the end of your profile link,
              for example{' '}
              <code className="break-all text-[#f3b187]">chess.com/member/yourname</code> or{' '}
              <code className="break-all text-[#f3b187]">lichess.org/@/yourname</code>. Enter just{' '}
              <code>yourname</code> on Profile.
            </p>
            <p>
              <strong>Export a game record (PGN):</strong> on Chess.com, open a game → Share → PGN →
              Download. On Lichess, open Analysis board → FEN &amp; PGN → Download. PGN contains the
              moves of a whole game; a FEN contains only one position. Account import handles your
              game records for you here.
            </p>
            <p>
              To share a game link, use Chess.com’s Share menu or copy the Lichess game page URL. A
              game link is different from a profile username.
            </p>
          </>
        )}
        <p className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <a
            href="https://support.chess.com/en/articles/8598397-what-are-pgn-fen"
            target="_blank"
            rel="noreferrer"
            className="text-[#f3b187] underline"
          >
            Chess.com FEN / PGN guide ↗
          </a>
          <a
            href="https://support.chess.com/en/articles/8705305-how-do-i-get-a-pgn-of-my-game"
            target="_blank"
            rel="noreferrer"
            className="text-[#f3b187] underline"
          >
            Chess.com export guide ↗
          </a>
          <a
            href="https://lichess.org/analysis"
            target="_blank"
            rel="noreferrer"
            className="text-[#f3b187] underline"
          >
            Lichess analysis board ↗
          </a>
        </p>
      </div>
    </details>
  );
}
