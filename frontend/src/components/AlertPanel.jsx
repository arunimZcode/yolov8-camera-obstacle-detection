import { useState } from 'react'
import { Bell, User, Car, PawPrint, AlertTriangle, Shield, Filter, Trash2 } from 'lucide-react'

const EVENT_ICONS = {
  'Human Detected':    { icon: User,          color: '#22c55e' },
  'Vehicle Detected':  { icon: Car,           color: '#3b82f6' },
  'Animal Detected':   { icon: PawPrint,      color: '#f59e0b' },
  'Intrusion':         { icon: Shield,        color: '#ef4444' },
  'Camera Tamper':     { icon: AlertTriangle, color: '#ef4444' },
  'Motion Detected':   { icon: Bell,          color: '#a855f7' },
}

const FILTERS = ['All', 'Human', 'Vehicle', 'Animal', 'Intrusion']

function timeAgo(iso) {
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs/60)}m ago`
  return `${Math.floor(secs/3600)}h ago`
}

function confBar(conf) {
  const pct = Math.round(conf * 100)
  const color = pct > 80 ? '#22c55e' : pct > 60 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ flex: 1, height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontFamily: 'var(--font-data)', fontSize: 10, color, minWidth: 28 }}>{pct}%</span>
    </div>
  )
}

export default function AlertPanel({ alerts, onClear }) {
  const [filter, setFilter] = useState('All')
  const [expanded, setExpanded] = useState(null)

  const filtered = alerts.filter(a => {
    if (filter === 'All') return true
    return a.event_type.toLowerCase().includes(filter.toLowerCase())
  })

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg-panel)', borderLeft: '1px solid var(--border)', overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0
      }}>
        <Bell size={13} color="var(--accent-amber)" />
        <span style={{ fontWeight: 600, fontSize: 12, flex: 1 }}>ALERTS</span>
        {alerts.length > 0 && (
          <span style={{
            background: 'var(--accent-amber)', color: '#000', fontSize: 10,
            fontWeight: 700, padding: '1px 6px', borderRadius: 10, fontFamily: 'var(--font-data)'
          }}>
            {alerts.length}
          </span>
        )}
        <button onClick={onClear} title="Clear all" style={{
          background: 'transparent', color: 'var(--text-muted)', padding: 4,
          borderRadius: 3, border: '1px solid transparent',
        }}>
          <Trash2 size={12} />
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{
        display: 'flex', gap: 2, padding: '6px 8px',
        borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap'
      }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '2px 8px', borderRadius: 3, fontSize: 10, fontFamily: 'var(--font-data)',
            background: filter === f ? 'var(--bg-hover)' : 'transparent',
            color: filter === f ? 'var(--text-primary)' : 'var(--text-muted)',
            border: `1px solid ${filter === f ? 'var(--border-bright)' : 'transparent'}`,
          }}>
            {f}
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
        {filtered.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '60%', gap: 8
          }}>
            <Shield size={24} color="var(--text-muted)" />
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>No alerts</span>
          </div>
        ) : (
          filtered.map((alert, i) => {
            const meta = EVENT_ICONS[alert.event_type] || { icon: Bell, color: 'var(--text-secondary)' }
            const IconComp = meta.icon
            const isOpen = expanded === i

            return (
              <div key={i}
                onClick={() => setExpanded(isOpen ? null : i)}
                style={{
                  background: isOpen ? 'var(--bg-hover)' : 'var(--bg-card)',
                  border: `1px solid ${isOpen ? 'var(--border-bright)' : 'var(--border)'}`,
                  borderRadius: 4, marginBottom: 4, cursor: 'pointer',
                  transition: 'all 0.15s', overflow: 'hidden',
                  borderLeft: `3px solid ${meta.color}`,
                }}
              >
                {/* Alert summary row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px' }}>
                  <IconComp size={12} color={meta.color} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {alert.event_type}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-data)', marginTop: 1 }}>
                      {alert.camera}
                    </div>
                  </div>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-data)', flexShrink: 0 }}>
                    {timeAgo(alert.timestamp)}
                  </span>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ padding: '0 9px 9px', borderTop: '1px solid var(--border)' }}>
                    {alert.snapshot && (
                      <img src={`/api/snapshot/${alert.snapshot}`} alt="snapshot"
                        style={{ width: '100%', borderRadius: 3, marginBottom: 7, marginTop: 7, maxHeight: 140, objectFit: 'cover' }}
                        onError={e => e.target.style.display = 'none'}
                      />
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', marginTop: 6 }}>
                      {[
                        ['Class', alert.detected_class],
                        ['Time', new Date(alert.timestamp).toLocaleTimeString()],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>{k}</div>
                          <div style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--text-primary)' }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 7 }}>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 3 }}>CONFIDENCE</div>
                      {confBar(alert.confidence)}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
