import { useState } from 'react'
import { Grid2X2, LayoutGrid, Maximize } from 'lucide-react'
import CameraFeed from './CameraFeed'
import ExpandedFeed from './ExpandedFeed'

const LAYOUTS = [
  { label: '4', cols: 2 },
  { label: '9', cols: 3 },
  { label: '16', cols: 4 },
  { label: '25', cols: 5 },
  { label: '36', cols: 6 },
  { label: '50', cols: 7 },
]

export default function CameraGrid({ cameras, alertMap }) {
  const [layout, setLayout] = useState(LAYOUTS[1])
  const [expanded, setExpanded] = useState(null)

  const visible = cameras.slice(0, parseInt(layout.label))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)', flexShrink: 0
      }}>
        <LayoutGrid size={13} color="var(--text-muted)" />
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 4 }}>LAYOUT</span>
        {LAYOUTS.map(l => (
          <button key={l.label} onClick={() => setLayout(l)} style={{
            padding: '3px 8px', borderRadius: 3, fontSize: 11, fontFamily: 'var(--font-data)',
            background: layout.label === l.label ? 'var(--accent-amber)' : 'var(--bg-card)',
            color: layout.label === l.label ? '#000' : 'var(--text-secondary)',
            border: `1px solid ${layout.label === l.label ? 'var(--accent-amber)' : 'var(--border)'}`,
            fontWeight: layout.label === l.label ? 700 : 400,
            transition: 'all 0.15s',
          }}>
            {l.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--text-muted)' }}>
          {cameras.filter(c => c.status === 'online').length}/{cameras.length} ONLINE
        </span>
      </div>

      {/* Grid */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
        gap: 3,
        padding: 3,
        overflow: 'hidden',
        minHeight: 0,
      }}>
        {visible.map(cam => (
          <CameraFeed
            key={cam.id}
            camera={cam}
            hasAlert={!!alertMap[cam.id]}
            onExpand={setExpanded}
          />
        ))}
      </div>

      {expanded && (
        <ExpandedFeed camera={expanded} onClose={() => setExpanded(null)} />
      )}
    </div>
  )
}
