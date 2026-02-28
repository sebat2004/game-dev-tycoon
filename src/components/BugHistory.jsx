export default function BugHistory({ history }) {
    if (!history || history.length === 0) {
        return (
            <div className="card">
                <div className="card-title">Bug Log</div>
                <div className="bug-history-empty">No bugs encountered yet</div>
            </div>
        )
    }

    return (
        <div className="card">
            <div className="card-title">Bug Log ({history.length})</div>
            <div className="bug-history-list">
                {history
                    .slice()
                    .reverse()
                    .map((bug) => (
                        <div className="bug-history-item" key={bug.id}>
                            <span className="history-title">{bug.title}</span>
                            <span className={`status-badge ${bug.status}`}>
                                {bug.status === 'resolved'
                                    ? '✅ Fixed'
                                    : '❌ Missed'}
                            </span>
                        </div>
                    ))}
            </div>
        </div>
    )
}
