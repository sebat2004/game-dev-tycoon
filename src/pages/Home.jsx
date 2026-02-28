import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)]
    }
    return code
}

export default function Home() {
    const navigate = useNavigate()
    const [joinCode, setJoinCode] = useState('')
    const [playerName, setPlayerName] = useState('')

    const handleCreate = () => {
        const roomId = generateRoomCode()
        const name = playerName.trim() || 'Player 1'
        navigate(`/game/${roomId}?name=${encodeURIComponent(name)}`)
    }

    const handleJoin = () => {
        if (!joinCode.trim()) return
        const name = playerName.trim() || 'Player'
        navigate(
            `/game/${joinCode.trim().toUpperCase()}?name=${encodeURIComponent(name)}`
        )
    }

    return (
        <div className="home-container">
            <div style={{ fontSize: '4rem', marginBottom: '-0.5rem' }}>🎮</div>
            <h1 className="home-title">Game Dev Tycoon</h1>
            <p className="home-subtitle">
                Team up with friends. Squash bugs. Ship the game. A co-op coding
                challenge where every second counts.
            </p>

            <div className="home-actions">
                <input
                    type="text"
                    placeholder="Your name..."
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    style={{ textTransform: 'none', letterSpacing: '1px' }}
                    maxLength={20}
                />

                <button
                    className="btn btn-primary"
                    onClick={handleCreate}
                    id="create-room-btn"
                >
                    ⚡ Create Room
                </button>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        color: 'var(--text-muted)',
                        fontSize: '0.8rem',
                    }}
                >
                    <hr
                        style={{
                            flex: 1,
                            border: 'none',
                            borderTop: '1px solid var(--border)',
                            width: '60px',
                        }}
                    />
                    <span>OR</span>
                    <hr
                        style={{
                            flex: 1,
                            border: 'none',
                            borderTop: '1px solid var(--border)',
                            width: '60px',
                        }}
                    />
                </div>

                <div className="join-section">
                    <input
                        type="text"
                        placeholder="Room Code"
                        value={joinCode}
                        onChange={(e) =>
                            setJoinCode(e.target.value.toUpperCase())
                        }
                        maxLength={6}
                    />
                    <button
                        className="btn btn-secondary"
                        onClick={handleJoin}
                        disabled={!joinCode.trim()}
                        id="join-room-btn"
                    >
                        Join Room
                    </button>
                </div>
            </div>
        </div>
    )
}
