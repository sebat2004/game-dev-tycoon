export default function EndScreen({ score, bugHistory, totalSpawned, totalResolved, onPlayAgain }) {
    const scoreClass =
        score >= 90 ? 'excellent' :
            score >= 70 ? 'good' :
                score >= 50 ? 'average' : 'poor';

    const unresolvedCount = bugHistory.filter(b => b.status === 'unresolved').length;
    const resolvedCount = bugHistory.filter(b => b.status === 'resolved').length;

    const getMessage = () => {
        if (score >= 90) return 'Outstanding! Your team crushed it! 🎉';
        if (score >= 70) return 'Great job! Only a few bugs got past you. 👏';
        if (score >= 50) return 'Not bad, but there\'s room for improvement. 💪';
        return 'Rough day at the office... Try again! 😅';
    };

    return (
        <div className="end-screen-overlay">
            <div className="end-screen-content">
                <div className="end-screen-title">Game Over</div>
                <div className="end-screen-subtitle">{getMessage()}</div>

                <div className={`score-display ${scoreClass}`}>{score}%</div>
                <div className="score-label">Final Score</div>

                <div className="end-stats">
                    <div className="end-stat">
                        <div className="end-stat-value">{totalSpawned}</div>
                        <div className="end-stat-label">Total Bugs</div>
                    </div>
                    <div className="end-stat">
                        <div className="end-stat-value">{resolvedCount}</div>
                        <div className="end-stat-label">Resolved</div>
                    </div>
                    <div className="end-stat">
                        <div className="end-stat-value" style={{ color: unresolvedCount > 0 ? 'var(--neon-red)' : 'inherit' }}>
                            {unresolvedCount}
                        </div>
                        <div className="end-stat-label">Unresolved</div>
                    </div>
                    <div className="end-stat">
                        <div className="end-stat-value">-{unresolvedCount * 2}%</div>
                        <div className="end-stat-label">Penalty</div>
                    </div>
                </div>

                {bugHistory.length > 0 && (
                    <div className="end-bug-list">
                        <h3>Bug Summary</h3>
                        {bugHistory.map((bug) => (
                            <div className="bug-history-item" key={bug.id} style={{ marginBottom: '0.4rem' }}>
                                <span className="history-title">{bug.title}</span>
                                <span className={`status-badge ${bug.status}`}>
                                    {bug.status === 'resolved' ? `✅ ${bug.resolvedBy}` : '❌ Missed'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                <button className="btn btn-primary" onClick={onPlayAgain} id="play-again-btn">
                    🔄 Play Again
                </button>
            </div>
        </div>
    );
}
