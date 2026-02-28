export default function BugQueue({ activeBugs, maxBugs }) {
    const total = activeBugs?.length || 0
    const visible = activeBugs?.filter((b) => b.visibleAt).length || 0
    const queued = total - visible

    return (
        <div className="bug-queue-bar">
            <span className="bug-queue-label">Bug Queue</span>
            <div className="bug-queue-dots">
                {Array.from({ length: maxBugs }).map((_, i) => (
                    <div
                        key={i}
                        className={`bug-queue-dot ${i < visible ? '' : i < total ? 'queued' : 'empty'}`}
                    />
                ))}
            </div>
            <span className="bug-queue-status">
                {total === 0
                    ? 'No active bugs'
                    : `${visible} visible${queued > 0 ? ` · ${queued} queued` : ''}`}
            </span>
        </div>
    )
}
