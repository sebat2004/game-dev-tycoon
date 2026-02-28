export default function BugQueue({ activeBugs, maxBugs }) {
    const count = activeBugs?.length || 0

    return (
        <div className="bug-queue-bar">
            <span className="bug-queue-label">Bug Queue</span>
            <div className="bug-queue-dots">
                {Array.from({ length: maxBugs }).map((_, i) => (
                    <div
                        key={i}
                        className={`bug-queue-dot ${i < count ? '' : 'empty'}`}
                    />
                ))}
            </div>
            <span className="bug-queue-status">
                {count === 0
                    ? 'No active bugs'
                    : count === 1
                      ? '1 bug active'
                      : `${count} bugs active`}
            </span>
        </div>
    )
}
