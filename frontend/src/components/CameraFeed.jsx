import { useState, useEffect } from 'react'
import { Wifi, WifiOff, Maximize2, AlertTriangle } from 'lucide-react'

export default function CameraFeed({ camera, onExpand, hasAlert }) {
  const [imgError, setImgError] = useState(false)
  const [ts, setTs] = useState(Date.now())

  // Bust cache every 2s to keep the MJPEG frame fresh for browsers that cache aggressively
  useEffect(() => {
    const t = setInterval(() => setTs(Date.now()), 2000)
    return () => clearInterval(t)
  }, [])

  const isOnline = camera.status === 'online'

  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--bg-card)',
        border: `1px solid ${hasAlert ? 'var(--accent-amber)' : 'var(--border)'}`,
        borderRadius: 4,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.3s',
        boxShadow: hasAlert ? '0 0 12px rgba(245,158,11,0.25)' : 'none',
      }}
    >
      {/* Video area */}
      <div style={{ position: 'relative', flex: 1, background: '#000', minHeight: 0 }}>
        {isOnline && !imgError ? (
          <img
            src={`/stream/${camera.id}?t=${ts}`}
            alt={camera.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexDirection: 'column', gap: 6,
            background: 'repeating-linear-gradient(45deg,#0a0a0a 0,#0a0a0a 2px,#111 2px,#111 8px)'
          }}>
            <WifiOff size={18} color="var(--text-muted)" />
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-data)' }}>
              {imgError ? 'NO SIGNAL' : 'OFFLINE'}
            </span>
          </div>
        )}

        {/* Alert flash overlay */}
        {hasAlert && (
          <div style={{
            position: 'absolute', inset: 0, border: '2px solid var(--accent-amber)',
            borderRadius: 3, animation: 'pulse 1s infinite', pointerEvents: 'none'
          }} />
        )}

        {/* Expand button */}
        <button
          onClick={() => onExpand(camera)}
          style={{
            position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)',
            border: '1px solid var(--border)', borderRadius: 3, padding: '3px 5px',
            color: 'var(--text-secondary)', opacity: 0, transition: 'opacity 0.2s',
          }}
          className="expand-btn"
        >
          <Maximize2 size={11} />
        </button>

        {/* Alert badge */}
        {hasAlert && (
          <div style={{
            position: 'absolute', top: 4, left: 4, background: 'var(--accent-amber)',
            color: '#000', fontSize: 9, fontWeight: 700, padding: '2px 5px',
            borderRadius: 2, letterSpacing: '0.05em', fontFamily: 'var(--font-data)'
          }}>
            ALERT
          </div>
        )}

        {/* Timestamp overlay */}
        <div style={{
          position: 'absolute', bottom: 4, right: 4,
          fontFamily: 'var(--font-data)', fontSize: 9, color: 'rgba(255,255,255,0.5)',
          background: 'rgba(0,0,0,0.5)', padding: '1px 4px', borderRadius: 2,
        }}>
          {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Camera label bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '4px 7px',
        background: 'var(--bg-panel)', borderTop: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          background: isOnline ? 'var(--accent-green)' : 'var(--accent-red)',
          boxShadow: isOnline ? '0 0 5px var(--accent-green)' : 'none',
        }} />
        <span style={{
          fontSize: 10, fontFamily: 'var(--font-data)', color: 'var(--text-secondary)',
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>
          {camera.name}
        </span>
        {hasAlert && <AlertTriangle size={10} color="var(--accent-amber)" />}
      </div>

      <style>{`
        div:hover .expand-btn { opacity: 1 !important; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>
    </div>
  )
}
