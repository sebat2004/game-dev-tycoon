import { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';

export default function BugCard({ bug, onSubmit, feedback, isSubmitting }) {
    const [code, setCode] = useState(bug.code);
    const editorRef = useRef(null);

    const handleEditorMount = (editor) => {
        editorRef.current = editor;
    };

    const handleSubmit = () => {
        if (isSubmitting) return;
        onSubmit(bug.id, code);
    };

    return (
        <div className="bug-card">
            <div className="bug-card-header">
                <span className="bug-badge">Active Bug</span>
                <span className="bug-title">{bug.title}</span>
            </div>

            <div className="bug-editor-wrapper">
                <Editor
                    height="220px"
                    defaultLanguage="python"
                    value={code}
                    onChange={(val) => setCode(val || '')}
                    onMount={handleEditorMount}
                    theme="vs-dark"
                    options={{
                        fontSize: 14,
                        fontFamily: "'Fira Code', monospace",
                        minimap: { enabled: false },
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
                    <div className={`fix-feedback ${feedback.fixed ? 'success' : 'error'}`}>
                        {feedback.fixed ? '✅' : '❌'} {feedback.explanation}
                        {feedback.submittedBy && (
                            <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>— {feedback.submittedBy}</span>
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
    );
}
