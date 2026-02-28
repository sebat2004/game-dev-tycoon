const officeImg = '/office.webp';

export default function Dashboard({ progress, players, timeRemaining }) {
    const playerEntries = Object.entries(players || {});

    return (
        <>
            {/* Progress */}
            <div className="card">
                <div className="card-title">Development Progress</div>
                <div className="progress-container">
                    <div className="progress-fill" style={{ width: `${Math.min(100, progress || 0)}%` }} />
                    <div className="progress-text">{(progress || 0).toFixed(1)}%</div>
                </div>
            </div>

            {/* Office Image */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="office-image-container">
                    <img src={officeImg} alt="Game Dev Office" className="office-image" />
                    <div className="office-overlay" />
                </div>
            </div>

            {/* Players */}
            <div className="card">
                <div className="card-title">Team ({playerEntries.length}/4)</div>
                <div className="players-list">
                    {playerEntries.map(([id, player], i) => (
                        <div className="player-item" key={id}>
                            <div className={`player-avatar avatar-${i}`}>
                                {player.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="player-name">{player.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
