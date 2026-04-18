import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

const API_BASE = import.meta.env.VITE_BACKEND_URL;
const POLL_INTERVAL = 2000; // ms

export default function App() {
  console.log("Calling backend api", API_BASE);
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const pollRef = useRef(null);

  // ── Fetch messages ──────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (!roomId) return;
    try {
      const res = await fetch(`${API_BASE}/messages/${encodeURIComponent(roomId)}`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setMessages(data);
    } catch {
      // silently ignore poll errors
    }
  }, [roomId]);

  // ── Polling ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!joined) return;
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [joined, fetchMessages]);

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleJoin = () => {
    if (!username.trim() || !roomId.trim()) {
      setError('Please enter both a username and a room ID.');
      return;
    }
    setError('');
    setMessages([]);
    setJoined(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleLeave = () => {
    setJoined(false);
    setMessages([]);
    clearInterval(pollRef.current);
  };

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, username, content }),
      });
      if (!res.ok) throw new Error('send failed');
      setDraft('');
      await fetchMessages();
    } catch {
      setError('Failed to send message. Is the backend running?');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // ── Render: Join Screen ─────────────────────────────────────────────────────
  if (!joined) {
    return (
      <div className="root">
        <div className="join-card">
          <div className="join-logo">
            <span className="logo-icon">💬</span>
            <h1 className="join-title">ChatRoom</h1>
            <p className="join-subtitle">Connect with anyone, anywhere</p>
          </div>

          {error && <p className="error-banner">{error}</p>}

          <div className="field">
            <label htmlFor="username-input">Your name</label>
            <input
              id="username-input"
              type="text"
              placeholder="e.g. Alice"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
          </div>

          <div className="field">
            <label htmlFor="room-input">Room ID</label>
            <input
              id="room-input"
              type="text"
              placeholder="e.g. room-42"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
          </div>

          <button id="join-btn" className="btn btn-primary" onClick={handleJoin}>
            Join Room →
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Chat Screen ─────────────────────────────────────────────────────
  return (
    <div className="root">
      <div className="chat-wrapper">
        {/* Header */}
        <header className="chat-header">
          <div className="header-left">
            <span className="room-dot" />
            <div>
              <span className="room-label">Room</span>
              <span className="room-name">{roomId}</span>
            </div>
          </div>
          <div className="header-right">
            <span className="you-badge">@{username}</span>
            <button id="leave-btn" className="btn btn-ghost" onClick={handleLeave}>
              Leave
            </button>
          </div>
        </header>

        {/* Messages */}
        <main className="messages-area" id="messages-area">
          {messages.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🌟</span>
              <p>Be the first to say hello!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.username === username;
              return (
                <div
                  key={msg.id}
                  className={`message-row ${isMine ? 'mine' : 'theirs'}`}
                >
                  {!isMine && (
                    <div className="avatar">{msg.username[0].toUpperCase()}</div>
                  )}
                  <div className="bubble-group">
                    {!isMine && (
                      <span className="sender-name">{msg.username}</span>
                    )}
                    <div className="bubble">
                      <p className="bubble-text">{msg.content}</p>
                      <span className="bubble-time">{formatTime(msg.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </main>

        {/* Error */}
        {error && (
          <div className="inline-error">
            ⚠️ {error}
            <button onClick={() => setError('')}>✕</button>
          </div>
        )}

        {/* Input */}
        <footer className="chat-footer">
          <textarea
            id="message-input"
            ref={inputRef}
            className="message-input"
            placeholder="Type a message… (Enter to send)"
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            id="send-btn"
            className={`btn btn-send ${sending ? 'sending' : ''}`}
            onClick={handleSend}
            disabled={sending || !draft.trim()}
          >
            {sending ? '…' : '➤'}
          </button>
        </footer>
      </div>
    </div>
  );
}
