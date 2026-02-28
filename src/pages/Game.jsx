import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import PartySocket from 'partysocket';
import Dashboard from '../components/Dashboard';
import BugCard from '../components/BugCard';
import BugQueue from '../components/BugQueue';
import BugHistory from '../components/BugHistory';
import EndScreen from '../components/EndScreen';

const PARTYKIT_HOST = 'localhost:1999';

export default function Game() {
    const { roomId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const playerName = searchParams.get('name') || 'Player';

    const [gameState, setGameState] = useState(null);
    const [fixFeedback, setFixFeedback] = useState({}); // { bugId: { fixed, explanation, submittedBy } }
    const [submitting, setSubmitting] = useState({}); // { bugId: true }
    const wsRef = useRef(null);

    useEffect(() => {
        const ws = new PartySocket({
            host: PARTYKIT_HOST,
            room: roomId,
        });

        ws.addEventListener('open', () => {
            ws.send(JSON.stringify({ type: 'join', payload: { name: playerName } }));
        });

        ws.addEventListener('message', (evt) => {
            const msg = JSON.parse(evt.data);
            if (msg.type === 'state') {
                setGameState(msg.payload);
            } else if (msg.type === 'fix_result') {
                const { bugId, fixed, explanation, submittedBy } = msg.payload;
                setFixFeedback(prev => ({ ...prev, [bugId]: { fixed, explanation, submittedBy } }));
                setSubmitting(prev => ({ ...prev, [bugId]: false }));
                // Clear feedback after 4 seconds
                setTimeout(() => {
                    setFixFeedback(prev => {
                        const copy = { ...prev };
                        delete copy[bugId];
                        return copy;
                    });
                }, 4000);
            } else if (msg.type === 'error') {
                alert(msg.payload);
            }
        });

        wsRef.current = ws;

        return () => {
            ws.close();
        };
    }, [roomId, playerName]);

    const handleStartGame = useCallback(() => {
        wsRef.current?.send(JSON.stringify({ type: 'start_game' }));
    }, []);

    const handleSubmitFix = useCallback((bugId, code) => {
        setSubmitting(prev => ({ ...prev, [bugId]: true }));
        wsRef.current?.send(JSON.stringify({ type: 'submit_fix', payload: { bugId, code } }));
    }, []);

    const handlePlayAgain = useCallback(() => {
        navigate('/');
    }, [navigate]);

    // Loading state
    if (!gameState) {
        return (
            <div className="waiting-room">
                <h1>Connecting...</h1>
                <p style={{ color: 'var(--text-muted)' }}>Establishing link to room {roomId}</p>
            </div>
        );
    }

    // Waiting room
    if (gameState.status === 'waiting') {
        const players = Object.entries(gameState.players);
        return (
            <div className="waiting-room">
                <h1>🎮 Game Dev Tycoon</h1>

                <div className="room-code-display">
                    <span className="room-code-label">Room Code:</span>
                    <span className="room-code-value">{roomId}</span>
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Share this code with friends to join &middot; Up to 4 players
                </p>

                <div className="waiting-players">
                    {players.map(([id, player], i) => (
                        <div className="waiting-player-card" key={id}>
                            <div className={`player-avatar avatar-${i}`}>
                                {player.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="player-name">{player.name}</span>
                        </div>
                    ))}
                    {Array.from({ length: 4 - players.length }).map((_, i) => (
                        <div className="waiting-player-card" key={`empty-${i}`} style={{ opacity: 0.3 }}>
                            <div className="player-avatar" style={{ background: 'var(--surface)' }}>?</div>
                            <span className="player-name" style={{ color: 'var(--text-muted)' }}>Waiting...</span>
                        </div>
                    ))}
                </div>

                <button
                    className="btn btn-primary"
                    onClick={handleStartGame}
                    disabled={players.length < 1}
                    id="start-game-btn"
                    style={{ marginTop: '1rem', fontSize: '1rem', padding: '1rem 3rem' }}
                >
                    🚀 Start Game
                </button>
            </div>
        );
    }

    // Format timer
    const mins = Math.floor(gameState.timeRemaining / 60);
    const secs = gameState.timeRemaining % 60;
    const timerStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    const timerClass = gameState.timeRemaining <= 30 ? 'critical' : gameState.timeRemaining <= 60 ? 'warning' : '';

    return (
        <div className="game-container">
            {/* Header bar */}
            <div className="game-header">
                <h1>🎮 Game Dev Tycoon</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <span style={{ fontFamily: 'var(--font-code)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        Room: {roomId}
                    </span>
                    <div className={`timer-display ${timerClass}`}>{timerStr}</div>
                </div>
            </div>

            {/* Left sidebar — Dashboard */}
            <div className="dashboard">
                <Dashboard
                    progress={gameState.progress}
                    players={gameState.players}
                    timeRemaining={gameState.timeRemaining}
                />
                <BugHistory history={gameState.bugHistory} />
            </div>

            {/* Right area — Bug panel */}
            <div className="bug-area">
                <BugQueue activeBugs={gameState.activeBugs} maxBugs={2} />

                {gameState.activeBugs.length === 0 ? (
                    <div className="no-bugs-state">
                        <div className="no-bugs-icon">✨</div>
                        <div className="no-bugs-text">All Clear</div>
                        <div className="no-bugs-subtext">No active bugs — enjoy the calm before the storm</div>
                    </div>
                ) : (
                    <div className="bug-cards-container">
                        {gameState.activeBugs.map((bug) => (
                            <BugCard
                                key={bug.id}
                                bug={bug}
                                onSubmit={handleSubmitFix}
                                feedback={fixFeedback[bug.id]}
                                isSubmitting={submitting[bug.id]}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* End screen overlay */}
            {gameState.status === 'ended' && (
                <EndScreen
                    score={gameState.score}
                    bugHistory={gameState.bugHistory}
                    totalSpawned={gameState.totalBugsSpawned}
                    totalResolved={gameState.totalBugsResolved}
                    onPlayAgain={handlePlayAgain}
                />
            )}
        </div>
    );
}
