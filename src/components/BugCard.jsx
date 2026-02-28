import { useRef, useState, useEffect } from "react";
import Editor from "@monaco-editor/react";

let monacoLib = null;

export default function BugCard(
    {
        bug,
        onSubmit,
        feedback,
        isSubmitting,
        onEditingChange,
        onCodeChange,
        onCursorChange,
        editingPlayers = [],
        externalCode,
        remoteCursors = {},
    },
) {
    const [code, setCode] = useState(bug.code);
    const editorRef = useRef(null);
    const isExternalUpdateRef = useRef(false);
    const cursorDecorationsRef = useRef([]);

    // Handle external code updates from other players
    useEffect(() => {
        if (externalCode !== undefined && externalCode !== code) {
            isExternalUpdateRef.current = true;
            setCode(externalCode);
            // Reset flag after state update
            setTimeout(() => {
                isExternalUpdateRef.current = false;
            }, 0);
        }
    }, [externalCode]);

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
                        glyphMarginClassName: "codicon codicon-debug-breakpoint",
                        after: {
                            content: cursor.name,
                            inlineClassName: "remote-cursor-label",
                        },
                        backgroundColor: color + "22",
                        borderColor: color,
                        border: `2px solid ${color}`,
                    },
                };
            }
        );

        if (editorRef.current?.deltaDecorations) {
            try {
                cursorDecorationsRef.current = editorRef.current.deltaDecorations(
                    cursorDecorationsRef.current,
                    newDecorations
                );
            } catch (err) {
                console.error("Error updating decorations:", err);
                // Fallback: clear decorations
                cursorDecorationsRef.current = editorRef.current.deltaDecorations(
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
        // Only send if not an external update
        if (!isExternalUpdateRef.current) {
            onCodeChange?.(bug.id, newCode || "");
        }
    };

    const handleSubmit = () => {
        if (isSubmitting) return
        onSubmit(bug.id, code)
    }

    return (
        <div className="bug-card">
            <div className="bug-card-header">
                <span className="bug-badge">Active Bug</span>
                <span className="bug-title">{bug.title}</span>
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
                                background: "var(--accent)",
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
                    height="220px"
                    defaultLanguage="python"
                    value={code}
                    onChange={handleCodeChange}
                    onMount={handleEditorMount}
                    theme="vs-dark"
                    options={{
                        fontSize: 14,
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
                        className={`fix-feedback ${
                            feedback.fixed ? "success" : "error"
                        }`}
                    >
                        {feedback.fixed ? "✅" : "❌"} {feedback.explanation}
                        {feedback.submittedBy && (
                            <span
                                style={{ marginLeft: "0.5rem", opacity: 0.7 }}
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
    )
}
