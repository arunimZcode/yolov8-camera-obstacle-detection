import { useState, useEffect } from 'react'
import { Activity, Camera, AlertTriangle, Eye, Cpu } from 'lucide-react'

export default function StatusBar({ cameras, alerts }) {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const online = cameras.filter(c => c.status === 'online').length
  const recentAlerts = alerts.filter(a => Date.now() - new Date(a.timestamp) < 60000).length

  const stats = [
    { icon: Camera, label: 'CAMERAS', value: `${online}/${cameras.length}`, color: online === cameras.length ? 'var(--accent-green)' : 'var(--accent-amber)' },
    { icon: AlertTriangle, label: 'ALERTS (1m)', value: recentAlerts, color: recentAlerts > 0 ? 'var(--accent-amber)' : 'var(--text-muted)' },
    { icon: Eye, label: 'DETECTIONS', value: alerts.length, color: 'var(--accent-blue)' },
    { icon: Activity, label: 'SYSTEM', value: 'LIVE', color: 'var(--accent-green)' },
  ]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0,
      background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)',
      height: 44, flexShrink: 0, overflow: 'hidden',
    }}>
      {/* Logo / brand */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 18px', borderRight: '1px solid var(--border)', height: '100%'
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-amber)',
          boxShadow: '0 0 8px var(--accent-amber)', animation: 'livePulse 2s infinite'
        }} />
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-primary)' }}>
          VIGIL<span style={{ color: 'var(--accent-amber)' }}>AI</span>
        </span>
      </div>

      {/* Stats */}
      {stats.map(({ icon: Icon, label, value, color }) => (
        <div key={label} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px',
          borderRight: '1px solid var(--border)', height: '100%'
        }}>
          <Icon size={12} color={color} />
          <div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>{label}</div>
            <div style={{ fontSize: 13, fontFamily: 'var(--font-data)', fontWeight: 600, color }}>{value}</div>
          </div>
        </div>
      ))}

      <div style={{ flex: 1 }} />

      {/* Clock */}
      <div style={{ padding: '0 18px', textAlign: 'right' }}>
        <div style={{ fontFamily: 'var(--font-data)', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
          {time.toLocaleTimeString()}
        </div>
        <div style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--text-muted)' }}>
          {time.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      <style>{`@keyframes livePulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }`}</style>
    </div>
  )
}
