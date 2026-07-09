import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

export default function ExpandedFeed({ camera, onClose }) {
  const [ts, setTs] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setTs(Date.now()), 1000)
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { clearInterval(t); window.removeEventListener('keydown', onKey) }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24,
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 1200, background: 'var(--bg-card)',
        border: '1px solid var(--border-bright)', borderRadius: 6, overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', padding: '10px 14px',
          background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)'
        }}>
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 12, color: 'var(--text-primary)', flex: 1 }}>
            {camera.name}
          </span>
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--text-muted)', marginRight: 16 }}>
            {camera.location}
          </span>
          <button onClick={onClose} style={{
            background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 3,
            padding: '4px 7px', color: 'var(--text-secondary)'
          }}>
            <X size={13} />
          </button>
        </div>

        {/* Feed */}
        <div style={{ position: 'relative', background: '#000', aspectRatio: '16/9' }}>
          <img
            src={`/stream/${camera.id}?t=${ts}`}
            alt={camera.name}
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
          <div style={{
            position: 'absolute', bottom: 10, right: 14,
            fontFamily: 'var(--font-data)', fontSize: 11, color: 'rgba(255,255,255,0.6)',
            background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: 3,
          }}>
            {new Date().toLocaleString()}
          </div>
        </div>
      </div>
      <p style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>Press ESC to close</p>
    </div>
  )
}
