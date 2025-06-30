import React, { useState, useEffect } from "react";
import "./App.css";

/**
 * Modern Tic Tac Toe App - Player vs Player, integrates backend REST API.
 * Features: Start new game, play, real-time board update, turn display, end notifications,
 * tabs for leaderboard/history, minimal modern design.
 * Backend API endpoints: POST /games, GET /games/{id}, POST /games/{id}/move, GET /leaderboard
 */

// Backend API root URL (change if backend runs elsewhere)
const API_BASE = process.env.REACT_APP_API_BASE || "https://vscode-internal-246-beta.beta01.cloud.kavia.ai:3001";

// Helper to fetch leaderboard
async function fetchLeaderboard() {
  const resp = await fetch(`${API_BASE}/leaderboard`);
  if (!resp.ok) throw new Error("Failed to fetch leaderboard");
  return await resp.json();
}

// Helper to create a new game
async function startNewGame() {
  const resp = await fetch(`${API_BASE}/games`, { method: "POST" });
  if (!resp.ok) throw new Error("Failed to create game");
  return await resp.json();
}

// Helper to fetch a given game
async function fetchGame(gameId) {
  const resp = await fetch(`${API_BASE}/games/${gameId}`);
  if (!resp.ok) throw new Error("Game not found");
  return await resp.json();
}

// Helper to submit move
async function submitMove(gameId, row, col) {
  const resp = await fetch(`${API_BASE}/games/${gameId}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ row, col })
  });
  if (!resp.ok) throw new Error("Invalid move");
  return await resp.json();
}

// PUBLIC_INTERFACE
function App() {
  // Tab view: "game", "leaderboard", "history"
  const [activeTab, setActiveTab] = useState("game");
  // Board/game state
  const [gameId, setGameId] = useState(null);
  const [board, setBoard] = useState(null); // 2D array or null
  const [currentTurn, setCurrentTurn] = useState(null); // "X" or "O"
  const [winner, setWinner] = useState(null); // "X","O", "draw", null
  // For poll updates, simulate real-time
  const [updateFlag, setUpdateFlag] = useState(0);

  // For new game spinner and errors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Leaderboard/history data
  const [leaderboard, setLeaderboard] = useState([]);
  const [history, setHistory] = useState([]);

  // Theme
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  // Switcher
  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  // Load leaderboard/history for respective tabs
  useEffect(() => {
    if (activeTab === "leaderboard") {
      fetchLeaderboard()
        .then(setLeaderboard)
        .catch(() => setLeaderboard([]));
    }
    if (activeTab === "history") {
      // Placeholder: Implement backend for game history API (if any)
      // For now, reuse leaderboard structure or leave empty
      setHistory([]); // To be filled if /history endpoint exists
    }
  }, [activeTab]);

  // Auto poll game for real-time updates every 2.5s
  useEffect(() => {
    let poll;
    if (gameId) {
      poll = setInterval(() => setUpdateFlag((u) => u + 1), 2500);
    }
    return () => { if (poll) clearInterval(poll); }
  }, [gameId]);

  // Fetch game state on updateFlag
  useEffect(() => {
    if (!gameId) return;
    fetchGame(gameId)
      .then(data => {
        setBoard(data.board);
        setCurrentTurn(data.current_turn);
        setWinner(data.winner);
      })
      .catch(() => setError("Failed to fetch game state."));
  }, [gameId, updateFlag]);

  // Start a new game
  const handleNewGame = async () => {
    setError(null);
    setLoading(true);
    try {
      const game = await startNewGame();
      setGameId(game.id);
      setBoard(game.board);
      setCurrentTurn(game.current_turn);
      setWinner(null);
    } catch (e) {
      setError("Unable to start a new game.");
    }
    setLoading(false);
  };

  // Handle a move click
  const handleMove = async (row, col) => {
    if (!gameId || !board || board[row][col] !== null || winner) return;
    try {
      await submitMove(gameId, row, col);
      setUpdateFlag(u => u + 1); // Immediately trigger refresh
    } catch (e) {
      setError("Move failed: " + (e.message || "unknown error"));
    }
  };

  // Render a single cell
  function renderCell(rowIdx, colIdx) {
    const val = board?.[rowIdx]?.[colIdx];
    return (
      <button
        key={`${rowIdx}-${colIdx}`}
        className="ttt-cell"
        onClick={() => handleMove(rowIdx, colIdx)}
        disabled={!!winner || !!val}
        aria-label={val ? `Cell ${val}` : `Cell empty at ${rowIdx},${colIdx}`}
      >
        {val}
      </button>
    );
  }

  // PUBLIC_INTERFACE
  function Board() {
    if (!board) return <div className="info-message">No game active. Click &#34;New Game&#34;.</div>;
    return (
      <div className="ttt-board">
        {board.map((row, rowIdx) =>
          <div className="ttt-row" key={rowIdx}>
            {row.map((_, colIdx) => renderCell(rowIdx, colIdx))}
          </div>
        )}
      </div>
    );
  }

  // Main content tabs
  function renderMainContent() {
    if (activeTab === "leaderboard") {
      return (
        <div className="leaderboard-container">
          <h2>Leaderboard</h2>
          <table className="lb-table">
            <thead><tr><th>Player</th><th>Wins</th></tr></thead>
            <tbody>
              {leaderboard.length === 0 ?
                <tr><td colSpan={2}>No data.</td></tr>
                : leaderboard.map((entry, i) =>
                  <tr key={i}><td>{entry.player}</td><td>{entry.wins}</td></tr>
                )
              }
            </tbody>
          </table>
        </div>
      );
    }
    if (activeTab === "history") {
      // Placeholder, API dependent
      return (
        <div className="history-container">
          <h2>Game History</h2>
          <div className="info-message">History view not implemented. (No backend API).</div>
        </div>
      );
    }
    // Game tab
    return (
      <div className="game-container">
        <div className="controls-bar">
          <button className="main-btn" onClick={handleNewGame} disabled={loading}>
            {loading ? "Starting..." : "New Game"}
          </button>
          {gameId && <span className="game-id">Game ID: {gameId}</span>}
        </div>
        <Board />
        <div className="info-area">
          {!!winner ?
            <div className="notif">
              {winner === "draw"
                ? <span>It's a <b>Draw</b>!</span>
                : <span>Player <b>{winner}</b> wins!</span>
              }
            </div>
            : currentTurn &&
              <div className="notif">Current Turn: <b>{currentTurn}</b></div>
          }
          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    );
  }

  // PUBLIC_INTERFACE
  return (
    <div className="App">
      <header className="App-header">
        <button className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
        <h1 className="main-title">Tic Tac Toe</h1>
        <nav className="main-nav">
          <button className={activeTab === "game" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("game")}>Game</button>
          <button className={activeTab === "leaderboard" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("leaderboard")}>Leaderboard</button>
          <button className={activeTab === "history" ? "tab-btn active" : "tab-btn"} onClick={() => setActiveTab("history")}>History</button>
        </nav>
        <div className="app-content">
          {renderMainContent()}
        </div>
      </header>
    </div>
  );
}

export default App;
