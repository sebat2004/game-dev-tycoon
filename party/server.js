// PartyKit Server — Game Dev Tycoon
// Manages rooms, game state, bug spawning, and Claude API calls

const CLAUDE_MODEL = 'claude-sonnet-4-20250514'
const GAME_DURATION = 300 // 5 minutes in seconds
const MAX_ACTIVE_BUGS = 2
const MIN_SPAWN_INTERVAL = 10 // seconds
const MAX_SPAWN_INTERVAL = 20 // seconds
const PENALTY_PER_BUG = 2 // % lost per unresolved bug

function randomSpawnDelay() {
    return (
        (Math.floor(
            Math.random() * (MAX_SPAWN_INTERVAL - MIN_SPAWN_INTERVAL + 1)
        ) +
            MIN_SPAWN_INTERVAL) *
        1000
    )
}

function generateBugId() {
    return 'bug_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)
}

async function callClaude(apiKey, systemPrompt, userPrompt) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: CLAUDE_MODEL,
            max_tokens: 2048,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
        }),
    })
    const data = await res.json()
    if (data.content && data.content[0]) {
        return data.content[0].text
    }
    throw new Error('Claude API error: ' + JSON.stringify(data))
}

const BUG_GENERATION_PROMPT = `You are a Python coding challenge generator for a game. Generate a short Python code snippet (10-15 lines) that contains exactly ONE bug. The bug should be solvable in under 60 seconds by a competent programmer.

Rules:
- The bug should be VERY simple.
- The code should be a small self-contained function or class
- Include a clear docstring explaining what the code SHOULD do
- The bug should be subtle but logical (off-by-one, wrong operator, missing edge case, wrong variable, etc.)
- Do NOT reveal what the bug is
- Output ONLY the Python code, no explanations before or after
- Make sure the code is interesting and varied (sorting, string manipulation, math, data structures, etc.)
- Do NOT include test cases or print statements outside the function`

const BUG_VALIDATION_PROMPT = `You are a Python code validator for a bug-fixing game. You will receive:
1. The ORIGINAL buggy code
2. The PLAYER'S attempted fix

Determine if the player has correctly fixed the bug. The fix must:
- Solve the bug in the original code
- Not introduce new bugs
- Keep the same function signature and general structure

Respond with ONLY a JSON object like:
{"fixed": true, "explanation": "Brief explanation of what was fixed"}
or
{"fixed": false, "explanation": "Brief explanation of why the fix is incorrect"}

Do NOT include any text before or after the JSON.`

export default class GameServer {
    constructor(room) {
        this.room = room
        this.state = {
            status: 'waiting', // waiting | playing | ended
            players: {}, // { connectionId: { name, joinedAt } }
            timeRemaining: GAME_DURATION,
            progress: 0,
            activeBugs: [], // { id, code, title, spawnedAt }
            bugHistory: [], // { id, code, title, status: 'resolved'|'unresolved'|'expired', resolvedBy, fixedCode }
            score: 100,
            totalBugsSpawned: 0,
            totalBugsResolved: 0,
        }
        this.timerInterval = null
        this.spawnTimeout = null
        this.bugGenerationQueue = []
    }

    onConnect(connection, ctx) {
        // Send current state to the new connection
        connection.send(JSON.stringify({ type: 'state', payload: this.state }))
    }

    onClose(connection) {
        if (this.state.players[connection.id]) {
            delete this.state.players[connection.id]
            this.broadcast()
        }
    }

    async onMessage(message, sender) {
        let msg
        try {
            msg = JSON.parse(message)
        } catch {
            return
        }

        switch (msg.type) {
            case 'join':
                if (Object.keys(this.state.players).length >= 4) {
                    sender.send(
                        JSON.stringify({
                            type: 'error',
                            payload: 'Room is full (max 4 players)',
                        })
                    )
                    return
                }
                this.state.players[sender.id] = {
                    name:
                        msg.payload?.name ||
                        `Player ${Object.keys(this.state.players).length + 1}`,
                    joinedAt: Date.now(),
                }
                this.broadcast()
                break

            case 'start_game':
                if (this.state.status !== 'waiting') return
                this.startGame()
                break

            case 'submit_fix':
                await this.handleSubmitFix(msg.payload, sender)
                break
            case 'cursor':
                // Attach player name and broadcast to everyone except sender
                this.room.broadcast(
                    JSON.stringify({
                        type: 'cursor',
                        payload: {
                            id: sender.id,
                            name: this.state.players[sender.id]?.name,
                            x: msg.payload.x,
                            y: msg.payload.y,
                        },
                    }),
                    [sender.id] // exclude sender
                )
                break

            default:
                break
        }
    }

    startGame() {
        this.state.status = 'playing'
        this.state.timeRemaining = GAME_DURATION
        this.state.progress = 0
        this.state.activeBugs = []
        this.state.bugHistory = []
        this.state.score = 100
        this.state.totalBugsSpawned = 0
        this.state.totalBugsResolved = 0
        this.broadcast()

        // Start game timer — ticks every second
        this.timerInterval = setInterval(() => {
            this.state.timeRemaining -= 1
            this.state.progress = Math.min(
                100,
                ((GAME_DURATION - this.state.timeRemaining) / GAME_DURATION) *
                    100
            )

            if (this.state.timeRemaining <= 0) {
                this.endGame()
                return
            }
            this.broadcast()
        }, 1000)

        // Schedule first bug spawn
        this.scheduleNextBug()
    }

    scheduleNextBug() {
        if (this.state.status !== 'playing') return
        const delay = randomSpawnDelay()
        this.spawnTimeout = setTimeout(() => this.spawnBug(), delay)
    }

    async spawnBug() {
        if (this.state.status !== 'playing') return

        // Only spawn if under max active bugs
        if (this.state.activeBugs.length < MAX_ACTIVE_BUGS) {
            try {
                const topics = [
                    'Write a function that reverses a linked list',
                    'Write a function that finds the second largest number in a list',
                    'Write a class that implements a basic stack with push, pop, and peek',
                    'Write a function that checks if a string is a valid palindrome ignoring spaces and case',
                    'Write a function that merges two sorted lists into one sorted list',
                    'Write a function that computes the nth Fibonacci number using memoization',
                    'Write a function that finds all prime numbers up to n using Sieve of Eratosthenes',
                    'Write a function that rotates a matrix 90 degrees clockwise',
                    'Write a function that finds the longest common substring of two strings',
                    'Write a function that implements binary search on a sorted array',
                    'Write a function that converts a Roman numeral string to an integer',
                    'Write a function that validates balanced parentheses in a string',
                    'Write a function that removes duplicates from a sorted linked list',
                    'Write a function that computes the power set of a given set',
                    'Write a function that finds the majority element in an array',
                ]
                const topic = topics[Math.floor(Math.random() * topics.length)]

                const code = await callClaude(
                    this.room.env.CLAUDE_API_KEY,
                    BUG_GENERATION_PROMPT,
                    `Generate a buggy Python code snippet for this task: ${topic}`
                )

                const bugId = generateBugId()
                const bug = {
                    id: bugId,
                    code: code.trim(),
                    title: topic
                        .replace('Write a function that ', '')
                        .replace('Write a class that ', ''),
                    spawnedAt: Date.now(),
                }

                this.state.activeBugs.push(bug)
                this.state.totalBugsSpawned += 1
                this.broadcast()
            } catch (err) {
                console.error('Bug generation failed:', err)
            }
        }

        // Schedule next bug regardless
        this.scheduleNextBug()
    }

    async handleSubmitFix(payload, sender) {
        if (this.state.status !== 'playing') return
        const { bugId, code } = payload || {}
        const bugIndex = this.state.activeBugs.findIndex((b) => b.id === bugId)
        if (bugIndex === -1) {
            sender.send(
                JSON.stringify({
                    type: 'fix_result',
                    payload: {
                        bugId,
                        fixed: false,
                        explanation: 'Bug not found or already resolved.',
                    },
                })
            )
            return
        }

        const bug = this.state.activeBugs[bugIndex]

        try {
            const resultStr = await callClaude(
                this.room.env.CLAUDE_API_KEY,
                BUG_VALIDATION_PROMPT,
                `ORIGINAL BUGGY CODE:\n\`\`\`python\n${bug.code}\n\`\`\`\n\nPLAYER'S FIX:\n\`\`\`python\n${code}\n\`\`\``
            )

            let result
            try {
                // Extract JSON from response
                const jsonMatch = resultStr.match(/\{[\s\S]*\}/)
                result = jsonMatch
                    ? JSON.parse(jsonMatch[0])
                    : {
                          fixed: false,
                          explanation: 'Could not parse validation result.',
                      }
            } catch {
                result = {
                    fixed: false,
                    explanation: 'Could not parse validation result.',
                }
            }

            if (result.fixed) {
                // Remove from active, add to history as resolved
                this.state.activeBugs.splice(bugIndex, 1)
                this.state.bugHistory.push({
                    id: bug.id,
                    code: bug.code,
                    title: bug.title,
                    status: 'resolved',
                    resolvedBy:
                        this.state.players[sender.id]?.name || sender.id,
                    fixedCode: code,
                })
                this.state.totalBugsResolved += 1
            }

            // Send result to all players
            this.room.broadcast(
                JSON.stringify({
                    type: 'fix_result',
                    payload: {
                        bugId,
                        ...result,
                        submittedBy:
                            this.state.players[sender.id]?.name || sender.id,
                    },
                })
            )
            this.broadcast()
        } catch (err) {
            console.error('Fix validation failed:', err)
            sender.send(
                JSON.stringify({
                    type: 'fix_result',
                    payload: {
                        bugId,
                        fixed: false,
                        explanation: 'Validation service error.',
                    },
                })
            )
        }
    }

    endGame() {
        this.state.status = 'ended'
        clearInterval(this.timerInterval)
        clearTimeout(this.spawnTimeout)

        // Move remaining active bugs to history as unresolved
        for (const bug of this.state.activeBugs) {
            this.state.bugHistory.push({
                id: bug.id,
                code: bug.code,
                title: bug.title,
                status: 'unresolved',
                resolvedBy: null,
                fixedCode: null,
            })
        }
        this.state.activeBugs = []

        // Calculate score
        const unresolvedCount = this.state.bugHistory.filter(
            (b) => b.status === 'unresolved'
        ).length
        this.state.score = Math.max(0, 100 - unresolvedCount * PENALTY_PER_BUG)
        this.state.progress = 100

        this.broadcast()
    }

    broadcast() {
        this.room.broadcast(
            JSON.stringify({ type: 'state', payload: this.state })
        )
    }
}
