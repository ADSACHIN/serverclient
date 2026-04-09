import { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'

const CHUNK_SIZE = 64 * 1024
const socket = io(import.meta.env.VITE_BACKEND_URL, {
  transports: ["websocket"],
  reconnection: true,
  timeout: 20000
});
async function sha256(buffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getFileIcon(type) {
  if (!type) return '📄'
  if (type.startsWith('image/')) return '🖼️'
  if (type.startsWith('video/')) return '🎬'
  if (type.startsWith('audio/')) return '🎵'
  if (type.includes('pdf')) return '📕'
  if (type.includes('zip') || type.includes('tar') || type.includes('gz')) return '📦'
  if (type.includes('word') || type.includes('document')) return '📝'
  if (type.includes('sheet') || type.includes('excel')) return '📊'
  return '📄'
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0a0f;
    --surface: #111118;
    --surface2: #18181f;
    --surface3: #1f1f28;
    --border: rgba(255,255,255,0.07);
    --border-hover: rgba(255,255,255,0.13);
    --accent: #6c63ff;
    --accent-dim: rgba(108,99,255,0.15);
    --accent-glow: rgba(108,99,255,0.3);
    --green: #22c55e;
    --green-dim: rgba(34,197,94,0.12);
    --red: #ef4444;
    --red-dim: rgba(239,68,68,0.12);
    --text-primary: #f0f0f5;
    --text-secondary: #8b8b99;
    --text-muted: #4a4a58;
    --font: 'Syne', sans-serif;
    --mono: 'DM Mono', monospace;
    --radius: 14px;
    --radius-sm: 8px;
  }

  body {
    background: var(--bg);
    color: var(--text-primary);
    font-family: var(--font);
    min-height: 100vh;
  }

  .app {
    display: grid;
    grid-template-rows: auto 1fr auto;
    height: 100vh;
    max-width: 860px;
    margin: 0 auto;
    padding: 0 16px;
  }

  /* Header */
  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 20px 0 16px;
    border-bottom: 1px solid var(--border);
  }
  .header-logo {
    width: 36px;
    height: 36px;
    background: var(--accent);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
  }
  .header-title {
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.3px;
  }
  .header-sub {
    font-size: 12px;
    color: var(--text-muted);
    font-family: var(--mono);
    margin-top: 1px;
  }
  .header-badge {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--green-dim);
    border: 1px solid rgba(34,197,94,0.2);
    border-radius: 20px;
    padding: 4px 10px;
    font-size: 11px;
    color: var(--green);
    font-family: var(--mono);
  }
  .header-badge::before {
    content: '';
    width: 6px;
    height: 6px;
    background: var(--green);
    border-radius: 50%;
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* Messages area */
  .messages {
    overflow-y: auto;
    padding: 16px 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    scrollbar-width: thin;
    scrollbar-color: var(--surface3) transparent;
  }
  .messages:empty::after {
    content: 'No messages yet. Start a conversation or share a file.';
    color: var(--text-muted);
    font-size: 13px;
    font-family: var(--mono);
    text-align: center;
    margin-top: 40px;
    display: block;
  }

  /* Message bubbles */
  .msg {
    display: flex;
    gap: 10px;
    animation: fadeUp 0.25s ease;
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .msg-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--surface3);
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 600;
    color: var(--accent);
    flex-shrink: 0;
    margin-top: 2px;
  }
  .msg-body { flex: 1; min-width: 0; }
  .msg-meta {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 4px;
  }
  .msg-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }
  .msg-time {
    font-size: 10px;
    color: var(--text-muted);
    font-family: var(--mono);
  }

  /* Text message */
  .msg-text {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 4px 12px 12px 12px;
    padding: 10px 14px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-primary);
    display: inline-block;
    max-width: 100%;
    word-break: break-word;
  }

  /* File message */
  .msg-file {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 4px 12px 12px 12px;
    padding: 14px;
    max-width: 420px;
  }
  .file-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
  }
  .file-icon {
    font-size: 28px;
    flex-shrink: 0;
  }
  .file-name {
    font-size: 14px;
    font-weight: 600;
    word-break: break-all;
  }
  .file-size {
    font-size: 11px;
    color: var(--text-secondary);
    font-family: var(--mono);
    margin-top: 2px;
  }
  .integrity-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-family: var(--mono);
    font-weight: 500;
    margin-bottom: 10px;
  }
  .integrity-badge.ok {
    background: var(--green-dim);
    border: 1px solid rgba(34,197,94,0.2);
    color: var(--green);
  }
  .integrity-badge.fail {
    background: var(--red-dim);
    border: 1px solid rgba(239,68,68,0.2);
    color: var(--red);
  }
  .hash-detail {
    font-family: var(--mono);
    font-size: 10px;
    color: var(--text-muted);
    background: var(--surface3);
    border-radius: 6px;
    padding: 6px 10px;
    margin-bottom: 10px;
    overflow: hidden;
  }
  .hash-row { display: flex; gap: 6px; margin-bottom: 2px; }
  .hash-label { color: var(--text-muted); flex-shrink: 0; }
  .hash-val {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-secondary);
  }
  .download-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--accent-dim);
    border: 1px solid rgba(108,99,255,0.25);
    color: var(--accent);
    border-radius: 8px;
    padding: 7px 14px;
    font-size: 12px;
    font-family: var(--font);
    font-weight: 600;
    text-decoration: none;
    transition: background 0.2s, border-color 0.2s;
    cursor: pointer;
  }
  .download-btn:hover {
    background: rgba(108,99,255,0.25);
    border-color: rgba(108,99,255,0.4);
  }

  /* Progress */
  .progress-card {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 16px;
    animation: fadeUp 0.2s ease;
  }
  .progress-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .progress-name {
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 70%;
  }
  .progress-pct {
    font-size: 12px;
    font-family: var(--mono);
    color: var(--accent);
  }
  .progress-bar-track {
    height: 4px;
    background: var(--surface3);
    border-radius: 4px;
    overflow: hidden;
  }
  .progress-bar-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 4px;
    transition: width 0.2s ease;
    box-shadow: 0 0 8px var(--accent-glow);
  }

  /* Composer */
  .composer {
    border-top: 1px solid var(--border);
    padding: 14px 0 20px;
  }
  .composer-name {
    margin-bottom: 10px;
  }
  .input-label {
    font-size: 10px;
    font-family: var(--mono);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 4px;
  }
  .input-field {
    width: 100%;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 10px 12px;
    font-size: 14px;
    font-family: var(--font);
    color: var(--text-primary);
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .input-field::placeholder { color: var(--text-muted); }
  .input-field:focus {
    border-color: rgba(108,99,255,0.4);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }
  .composer-row {
    display: flex;
    gap: 8px;
    align-items: flex-end;
  }
  .composer-row .input-field { flex: 1; }

  .file-attach-btn {
    position: relative;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 10px 14px;
    font-size: 18px;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
    flex-shrink: 0;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .file-attach-btn:hover {
    border-color: var(--border-hover);
    background: var(--surface3);
  }
  .file-attach-btn.has-file {
    border-color: rgba(108,99,255,0.4);
    background: var(--accent-dim);
  }
  .file-attach-btn input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
    width: 100%;
    height: 100%;
  }

  .file-preview {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--surface3);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 7px 10px;
    font-size: 12px;
    font-family: var(--mono);
    color: var(--text-secondary);
    margin-top: 8px;
    animation: fadeUp 0.2s ease;
  }
  .file-preview-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .file-preview-remove {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 14px;
    padding: 0 2px;
    line-height: 1;
    transition: color 0.2s;
  }
  .file-preview-remove:hover { color: var(--red); }

  .send-btn {
    background: var(--accent);
    border: none;
    border-radius: var(--radius-sm);
    padding: 10px 20px;
    font-size: 14px;
    font-family: var(--font);
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    flex-shrink: 0;
    transition: opacity 0.2s, transform 0.1s;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .send-btn:hover { opacity: 0.9; }
  .send-btn:active { transform: scale(0.97); }
  .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
`

export default function App() {
  const [data, setData] = useState({ name: '', message: '', file: null })
  const [messages, setMessages] = useState([])
  const [progress, setProgress] = useState(null)
  const [sending, setSending] = useState(false)
  const incomingFiles = useRef({})
  const messagesEndRef = useRef(null)

  useEffect(() => {

  socket.on("connect", () => {
    console.log("CONNECTED:", socket.id);
  });

  socket.on("chat message", (msg) => {
    setMessages(prev => [
      ...prev,
      { ...msg, type: "text", ts: new Date() }
    ]);
  });

  /*
    FILE START
  */

  socket.on("file:start", ({
    transferId,
    fileName,
    fileType,
    totalChunks,
    hash,
    senderName
  }) => {

    console.log("FILE START RECEIVED");

    incomingFiles.current[transferId] = {
      fileName,
      fileType,
      totalChunks,
      hash,
      senderName,
      chunks: []
    };

  });

  /*
    FILE CHUNK
  */

  socket.on("file:chunk", async ({
    transferId,
    index,
    data
  }) => {

    console.log("CHUNK RECEIVED:", index);

    const file = incomingFiles.current[transferId];

    if (!file) {
      console.log("NO FILE CONTEXT");
      return;
    }

    file.chunks[index] = data;

    const received =
      file.chunks.filter(Boolean).length;

    console.log(
      "Received:",
      received,
      "Total:",
      file.totalChunks
    );

    setProgress({
      name: file.fileName,
      pct: Math.round(
        (received / file.totalChunks) * 100
      )
    });

    /*
      IMPORTANT FIX
    */

    if (received >= file.totalChunks) {

      console.log("ALL CHUNKS RECEIVED");

      const binaryChunks =
        file.chunks.map(b64 => {
          const binary = atob(b64);
          return Uint8Array.from(
            binary,
            c => c.charCodeAt(0)
          );
        });

      const totalLen =
        binaryChunks.reduce(
          (s, c) => s + c.length,
          0
        );

      const assembled =
        new Uint8Array(totalLen);

      let offset = 0;

      for (const chunk of binaryChunks) {
        assembled.set(chunk, offset);
        offset += chunk.length;
      }

      const receivedHash =
        await sha256(
          assembled.buffer
        );

      const verified =
        receivedHash === file.hash;

      const url =
        URL.createObjectURL(
          new Blob(
            [assembled],
            { type: file.fileType }
          )
        );

      setMessages(prev => [
        ...prev,
        {
          type: "file",
          name: file.senderName || "Anonymous",
          fileName: file.fileName,
          fileType: file.fileType,
          fileSize: totalLen,
          url,
          verified,
          senderHash: file.hash,
          receivedHash,
          ts: new Date()
        }
      ]);

      delete incomingFiles.current[transferId];

      setProgress(null);

    }

  });

  return () => {

    socket.off("connect");
    socket.off("chat message");
    socket.off("file:start");
    socket.off("file:chunk");

  };

}, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, progress])

  const handleSubmit = async () => {
    if (!data.name.trim()) return
    if (!data.message.trim() && !data.file) return
    setSending(true)

    if (data.file) {
      const buffer = await data.file.arrayBuffer()
      const hash = await sha256(buffer)
      const transferId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const totalChunks = Math.ceil(buffer.byteLength / CHUNK_SIZE)

      socket.emit('file:start', {
        transferId, fileName: data.file.name, fileType: data.file.type,
        totalChunks, hash, senderName: data.name
      })

      for (let i = 0; i < totalChunks; i++) {
        const slice = buffer.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
        const b64 = btoa(String.fromCharCode(...new Uint8Array(slice)))
        socket.emit('file:chunk', { transferId, index: i, data: b64 })
        setProgress({ name: data.file.name, pct: Math.round(((i + 1) / totalChunks) * 100) })
        if (i % 10 === 0) await new Promise(r => setTimeout(r, 0))
      }
    } else {
      socket.emit('chat message', { name: data.name, message: data.message, ts: new Date() })
    }

    setData(d => ({ ...d, message: '', file: null, name: '' }))
    setSending(false)
  }

  const handleKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }

  const fmt = ts => ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
  const initials = name => name ? name.trim().slice(0, 2).toUpperCase() : '?'

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        {/* Header */}
        <header className="header">
          <div className="header-logo">⚡</div>
          <div>
            <div className="header-title">FileDrop</div>
            <div className="header-sub">end-to-end verified transfer</div>
          </div>
          <div className="header-badge">connected</div>
        </header>

        {/* Messages */}
        <div className="messages">
          {messages.map((msg, i) => (
            <div key={i} className="msg">
              <div className="msg-avatar">{initials(msg.name)}</div>
              <div className="msg-body">
                <div className="msg-meta">
                  <span className="msg-name">{msg.name || 'Anonymous'}</span>
                  <span className="msg-time">{fmt(msg.ts)}</span>
                </div>

                {msg.type === 'text' ? (
                  <div className="msg-text">{msg.message}</div>
                ) : (
                  <div className="msg-file">
                    <div className="file-row">
                      <div className="file-icon">{getFileIcon(msg.fileType)}</div>
                      <div>
                        <div className="file-name">{msg.fileName}</div>
                        <div className="file-size">{formatBytes(msg.fileSize)}</div>
                      </div>
                    </div>
                    <div className={`integrity-badge ${msg.verified ? 'ok' : 'fail'}`}>
                      {msg.verified ? '✓ Integrity verified' : '✗ Hash mismatch'}
                    </div>
                    <div className="hash-detail">
                      <div className="hash-row">
                        <span className="hash-label">sent    </span>
                        <span className="hash-val">{msg.senderHash}</span>
                      </div>
                      <div className="hash-row">
                        <span className="hash-label">received</span>
                        <span className="hash-val">{msg.receivedHash}</span>
                      </div>
                    </div>
                    <a className="download-btn" href={msg.url} download={msg.fileName}>
                      ↓ Download
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}

          {progress && (
            <div className="progress-card">
              <div className="progress-top">
                <span className="progress-name">⬆ {progress.name}</span>
                <span className="progress-pct">{progress.pct}%</span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${progress.pct}%` }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div className="composer">
          <div className="composer-name">
            <div className="input-label">Your name</div>
            <input
              className="input-field"
              placeholder="Enter your name"
              value={data.name}
              onChange={e => setData({ ...data, name: e.target.value })}
            />
          </div>
          <div className="composer-row">
            <div style={{ flex: 1 }}>
              <div className="input-label">Message</div>
              <input
                className="input-field"
                placeholder="Type a message or attach a file…"
                value={data.message}
                onChange={e => setData({ ...data, message: e.target.value })}
                onKeyDown={handleKey}
                disabled={!!data.file}
              />
              {data.file && (
                <div className="file-preview">
                  <span>{getFileIcon(data.file.type)}</span>
                  <span className="file-preview-name">{data.file.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{formatBytes(data.file.size)}</span>
                  <button className="file-preview-remove" onClick={() => setData({ ...data, file: null })}>✕</button>
                </div>
              )}
            </div>
            <div>
              <div className="input-label" style={{ opacity: 0 }}>_</div>
              <label className={`file-attach-btn ${data.file ? 'has-file' : ''}`} title="Attach file">
                📎
                <input type="file" onChange={e => setData({ ...data, file: e.target.files[0], message: '' })} />
              </label>
            </div>
            <div>
              <div className="input-label" style={{ opacity: 0 }}>_</div>
              <button
                className="send-btn"
                onClick={handleSubmit}
                disabled={sending || !data.name.trim() || (!data.message.trim() && !data.file)}
              >
                {sending ? '…' : '↑ Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}