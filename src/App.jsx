import { Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import Home from './pages/Home'
import Game from './pages/Game'

export default function App() {
    return (
        <>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/game/:roomId" element={<Game />} />
            </Routes>
            <Analytics />
        </>
    )
}
