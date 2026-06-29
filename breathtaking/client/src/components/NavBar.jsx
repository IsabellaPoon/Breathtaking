import './NavBar.css';

export default function NavBar({ view, onNavigate, resting }) {
  return (
    <header className="navbar">
      <div className="navbar__brand">
        <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true">
          <circle cx="16" cy="16" r="11" fill="var(--rest-dim)" />
          <circle cx="16" cy="16" r="6" fill="var(--exertion)" />
        </svg>
        <span>Breathtaking</span>
      </div>
      <nav className="navbar__links">
        <button
          className={view === 'train' ? 'navbar__link is-active' : 'navbar__link'}
          onClick={() => onNavigate('train')}
        >
          Train
          {resting && <span className="navbar__resting-dot" aria-label="Resting" />}
        </button>
        <button
          className={view === 'history' ? 'navbar__link is-active' : 'navbar__link'}
          onClick={() => onNavigate('history')}
        >
          History
        </button>
      </nav>
    </header>
  );
}
