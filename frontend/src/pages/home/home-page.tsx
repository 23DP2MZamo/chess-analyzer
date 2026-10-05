import './home-page.css';

export default function HomePage() {
  return (
    <main className="home-page">
      {/* Navigation */}
      <header className="home-header">
        <a href="/home" className="home-logo">
          <span className="logo-mark">♞</span>
          <span>CHESS ANALYZER</span>
        </a>

        <nav className="home-nav">
          <a href="/home" className="active">
            Home
          </a>
          <a href="/analyze">Analyze</a>
          <a href="/games">Games</a>
        </nav>

        <button className="menu-button" aria-label="Open menu">
          <span />
          <span />
          <span />
        </button>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">CHESS ANALYSIS PLATFORM</p>

          <h1>
            CHESS
            <br />
            <span>ANALYZER</span>
          </h1>

          <p className="hero-description">
            Analyze your games. Find your mistakes.
            <br />
            Improve your chess.
          </p>

          <div className="hero-actions">
            <a href="/analyze" className="primary-button">
              Analyze a game
              <span>→</span>
            </a>

            <a href="/games" className="secondary-button">
              View games
            </a>
          </div>
        </div>

        {/* Decorative chess board */}
        <div className="hero-board">
          <div className="board-grid">
            {Array.from({ length: 64 }).map((_, index) => (
              <div
                key={index}
                className={`board-square ${
                  (Math.floor(index / 8) + index) % 2 === 0 ? 'light' : 'dark'
                }`}
              />
            ))}
          </div>

          <div className="board-piece piece-1">♟</div>
          <div className="board-piece piece-2">♘</div>
          <div className="board-piece piece-3">♔</div>
          <div className="board-piece piece-4">♜</div>
        </div>
      </section>

      {/* Main cards */}
      <section className="features">
        <div className="feature-card feature-large">
          <div className="card-number">01</div>

          <div className="card-content">
            <p className="card-label">ANALYSIS</p>

            <h2>
              Analyze
              <br />
              your game
            </h2>

            <p>Upload a PGN or enter a position and let the engine analyze every move.</p>

            <a href="/analyze" className="card-link">
              Start analysis <span>↗</span>
            </a>
          </div>
        </div>

        <div className="feature-card">
          <div className="card-number">02</div>

          <div className="card-content">
            <p className="card-label">GAMES</p>

            <h2>
              Your
              <br />
              games
            </h2>

            <p>Browse your previous games and review your performance.</p>

            <a href="/games" className="card-link">
              Open games <span>↗</span>
            </a>
          </div>
        </div>

        <div className="feature-card">
          <div className="card-number">03</div>

          <div className="card-content">
            <p className="card-label">IMPROVEMENT</p>

            <h2>
              Improve
              <br />
              your chess
            </h2>

            <p>Understand your mistakes and discover where you can improve.</p>

            <a href="/stats" className="card-link">
              View statistics <span>↗</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <span>CHESS ANALYZER</span>

        <span>BUILT FOR CHESS PLAYERS</span>

        <span>2026</span>
      </footer>
    </main>
  );
}
