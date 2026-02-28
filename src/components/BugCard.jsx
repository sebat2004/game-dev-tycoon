import { useRef, useState, useEffect } from "react";
import Editor from "@monaco-editor/react";

let monacoLib = null;
const BUG_TIMEOUT = 60; // must match server

export default function BugCard({
    bug,
    onSubmit,
    feedback,
    isSubmitting,
    isExpanded,
    onToggleExpand,
    onEditingChange,
    onCodeChange,
    onCursorChange,
    editingPlayers = [],
    externalCode,
    remoteCursors = {},
}) {
    const [code, setCode] = useState(bug.code);
    const editorRef = useRef(null);
    const isExternalUpdateRef = useRef(false);
    const lastAppliedExternalCodeRef = useRef(bug.code);
    const cursorDecorationsRef = useRef([]);

    const [timeLeft, setTimeLeft] = useState(() => {
        const elapsed = (Date.now() - (bug.visibleAt || bug.spawnedAt)) / 1000;
        return Math.max(0, Math.ceil(BUG_TIMEOUT - elapsed));
    });

    // Countdown timer
    useEffect(() => {
        const interval = setInterval(() => {
            const elapsed =
                (Date.now() - (bug.visibleAt || bug.spawnedAt)) / 1000;
            const remaining = Math.max(0, Math.ceil(BUG_TIMEOUT - elapsed));
            setTimeLeft(remaining);
            if (remaining <= 0) clearInterval(interval);
        }, 1000);
        return () => clearInterval(interval);
    }, [bug.visibleAt, bug.spawnedAt]);

    // Handle external code updates from other players
    useEffect(() => {
        if (
            externalCode !== undefined &&
            externalCode !== lastAppliedExternalCodeRef.current
        ) {
            isExternalUpdateRef.current = true;
            lastAppliedExternalCodeRef.current = externalCode;
            setCode(externalCode);
            setTimeout(() => {
                isExternalUpdateRef.current = false;
            }, 0);
        }
    }, [externalCode, bug.id]);

    // Update remote cursor decorations
    useEffect(() => {
        if (!editorRef.current || !monacoLib) return;

        const newDecorations = Object.entries(remoteCursors).map(
            ([playerId, cursor], idx) => {
                const colors = [
                    "#FF6B6B",
                    "#4ECDC4",
                    "#45B7D1",
                    "#FFA07A",
                    "#98D8C8",
                ];
                const color = colors[idx % colors.length];
                return {
                    range: new monacoLib.Range(
                        cursor.line,
                        cursor.column,
                        cursor.line,
                        cursor.column + 2
                    ),
                    options: {
                        isWholeLine: false,
                        className: "remote-cursor-decoration",
                        after: {
                            content: cursor.name,
                            inlineClassName: "remote-cursor-label",
                        },
                    },
                };
            }
        );

        if (editorRef.current?.deltaDecorations) {
            try {
                cursorDecorationsRef.current =
                    editorRef.current.deltaDecorations(
                        cursorDecorationsRef.current,
                        newDecorations
                    );
            } catch (err) {
                cursorDecorationsRef.current =
                    editorRef.current.deltaDecorations(
                        cursorDecorationsRef.current,
                        []
                    );
            }
        }
    }, [remoteCursors]);

    const handleEditorMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoLib = monaco;

        editor.onDidFocusEditorText(() => {
            onEditingChange?.(bug.id, true);
        });
        editor.onDidBlurEditorText(() => {
            onEditingChange?.(bug.id, false);
        });
        editor.onDidChangeCursorPosition((event) => {
            const { lineNumber, column } = event.position;
            onCursorChange?.(bug.id, lineNumber, column);
        });
    };

    const handleCodeChange = (newCode) => {
        setCode(newCode || "");
        if (!isExternalUpdateRef.current) {
            onCodeChange?.(bug.id, newCode || "");
        }
    };

    const handleSubmit = () => {
        if (isSubmitting) return;
        onSubmit(bug.id, code);
    };

    const timerColor =
        timeLeft <= 10
            ? "var(--neon-red)"
            : timeLeft <= 20
                ? "var(--neon-orange)"
                : "var(--neon-cyan)";

    const timerPercent = (timeLeft / BUG_TIMEOUT) * 100;

    const card = (
        <div className={`bug-card ${isExpanded ? "bug-card-expanded" : ""}`}>
            <div className="bug-card-header">
                <span className="bug-badge">Active Bug</span>
                <span className="bug-title">{bug.title}</span>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        marginLeft: "auto",
                    }}
                >
                    {/* Countdown timer */}
                    <span
                        style={{
                            fontFamily: "var(--font-code)",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            color: timerColor,
                            minWidth: "28px",
                            textAlign: "right",
                        }}
                    >
                        {timeLeft}s
                    </span>
                    {/* Expand/collapse button */}
                    {onToggleExpand && (
                        <button
                            className="btn-icon"
                            onClick={() => onToggleExpand(bug.id)}
                            title={
                                isExpanded
                                    ? "Exit full screen"
                                    : "Full screen"
                            }
                        >
                            {isExpanded ? "⊖" : "⊕"}
                        </button>
                    )}
                </div>
            </div>

            {/* Timer progress bar */}
            <div className="bug-timer-bar">
                <div
                    className="bug-timer-fill"
                    style={{
                        width: `${timerPercent}%`,
                        background: timerColor,
                        transition: "width 1s linear, background 0.5s",
                    }}
                />
            </div>

            {editingPlayers.length > 0 && (
                <div
                    style={{
                        display: "flex",
                        gap: "0.4rem",
                        alignItems: "center",
                        marginBottom: "0.5rem",
                    }}
                >
                    {editingPlayers.map((p) => (
                        <span
                            key={p.id}
                            style={{
                                background: "var(--neon-purple)",
                                color: "white",
                                fontSize: "0.7rem",
                                padding: "2px 8px",
                                borderRadius: "99px",
                            }}
                        >
                            ✏️ {p.name} is editing
                        </span>
                    ))}
                </div>
            )}

            <div className="bug-editor-wrapper">
                <Editor
                    height={isExpanded ? "calc(100vh - 260px)" : "220px"}
                    defaultLanguage="python"
                    value={code}
                    onChange={handleCodeChange}
                    onMount={handleEditorMount}
                    theme="vs-dark"
                    options={{
                        fontSize: isExpanded ? 16 : 14,
                        fontFamily: "'Fira Code', monospace",
                        minimap: { enabled: false },
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        padding: { top: 12 },
                        renderLineHighlight: "gutter",
                        automaticLayout: true,
                        wordWrap: "on",
                    }}
                />
            </div>

            <div className="bug-actions">
                {feedback && (
                    <div
                        className={`fix-feedback ${feedback.fixed ? "success" : "error"
                            }`}
                    >
                        {feedback.fixed ? "✅" : "❌"} {feedback.explanation}
                        {feedback.submittedBy && (
                            <span
                                style={{
                                    marginLeft: "0.5rem",
                                    opacity: 0.7,
                                }}
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
                    {isSubmitting ? "⏳ Checking..." : "🔧 Submit Fix"}
                </button>
            </div>
        </div>
    );

    if (isExpanded) {
        return <div className="bug-fullscreen-overlay">{card}</div>;
    }

    return card;
}