import { useState, useRef, useEffect } from 'react'
import Editor from '@monaco-editor/react'

const BUG_TIMEOUT = 60 // must match server

export default function BugCard({
    bug,
    onSubmit,
    feedback,
    isSubmitting,
    isExpanded,
    onToggleExpand,
}) {
    const [code, setCode] = useState(bug.code)
    const editorRef = useRef(null)
    const [timeLeft, setTimeLeft] = useState(() => {
        const elapsed = (Date.now() - (bug.visibleAt || bug.spawnedAt)) / 1000
        return Math.max(0, Math.ceil(BUG_TIMEOUT - elapsed))
    })

    useEffect(() => {
        const interval = setInterval(() => {
            const elapsed = (Date.now() - (bug.visibleAt || bug.spawnedAt)) / 1000
            const remaining = Math.max(0, Math.ceil(BUG_TIMEOUT - elapsed))
            setTimeLeft(remaining)
            if (remaining <= 0) clearInterval(interval)
        }, 1000)
        return () => clearInterval(interval)
    }, [bug.spawnedAt])

    const handleEditorMount = (editor) => {
        editorRef.current = editor
    }

    const handleSubmit = () => {
        if (isSubmitting) return
        onSubmit(bug.id, code)
    }

    const timerColor =
        timeLeft <= 10
            ? 'var(--neon-red)'
            : timeLeft <= 20
                ? 'var(--neon-orange)'
                : 'var(--neon-cyan)'

    const timerPercent = (timeLeft / BUG_TIMEOUT) * 100

    const card = (
        <div className={`bug-card ${isExpanded ? 'bug-card-expanded' : ''}`}>
            <div className="bug-card-header">
                <span className="bug-badge">Active Bug</span>
                <span className="bug-title">{bug.title}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto' }}>
                    {/* Countdown timer */}
                    <span
                        style={{
                            fontFamily: 'var(--font-code)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: timerColor,
                            minWidth: '28px',
                            textAlign: 'right',
                        }}
                    >
                        {timeLeft}s
                    </span>
                    {/* Expand/collapse button */}
                    <button
                        className="btn-icon"
                        onClick={() => onToggleExpand(bug.id)}
                        title={isExpanded ? 'Exit full screen' : 'Full screen'}
                    >
                        {isExpanded ? '⊖' : '⊕'}
                    </button>
                </div>
            </div>

            {/* Timer progress bar */}
            <div className="bug-timer-bar">
                <div
                    className="bug-timer-fill"
                    style={{
                        width: `${timerPercent}%`,
                        background: timerColor,
                        transition: 'width 1s linear, background 0.5s',
                    }}
                />
            </div>

            <div className="bug-editor-wrapper">
                <Editor
                    height={isExpanded ? 'calc(100vh - 260px)' : '220px'}
                    defaultLanguage="python"
                    value={code}
                    onChange={(val) => setCode(val || '')}
                    onMount={handleEditorMount}
                    theme="vs-dark"
                    options={{
                        fontSize: isExpanded ? 16 : 14,
                        fontFamily: "'Fira Code', monospace",
                        minimap: { enabled: isExpanded },
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        padding: { top: 12 },
                        renderLineHighlight: 'gutter',
                        automaticLayout: true,
                        wordWrap: 'on',
                    }}
                />
            </div>

            <div className="bug-actions">
                {feedback && (
                    <div
                        className={`fix-feedback ${feedback.fixed ? 'success' : 'error'}`}
                    >
                        {feedback.fixed ? '✅' : '❌'} {feedback.explanation}
                        {feedback.submittedBy && (
                            <span
                                style={{ marginLeft: '0.5rem', opacity: 0.7 }}
                            >
                                — {feedback.submittedBy}
                            </span>
                        )}
                    </div>
                )}
                <button
                    className="btn btn-success"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    id={`submit-fix-${bug.id}`}
                >
                    {isSubmitting ? '⏳ Checking...' : '🔧 Submit Fix'}
                </button>
            </div>
        </div>
    )

    if (isExpanded) {
        return (
            <div className="bug-fullscreen-overlay">
                {card}
            </div>
        )
    }

    return card
}
