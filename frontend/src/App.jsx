import { useState, useEffect, useRef } from 'react'
import StatusBar from './components/StatusBar'
import CameraGrid from './components/CameraGrid'
import AlertPanel from './components/AlertPanel'

export default function App() {
  const [cameras, setCameras] = useState([])
  const [alerts, setAlerts] = useState([])
  const [alertMap, setAlertMap] = useState({})   // camera_id -> true if recent alert
  const wsRef = useRef(null)

  // Load camera list from backend
  useEffect(() => {
    fetch('/api/cameras')
      .then(r => r.json())
      .then(setCameras)
      .catch(() => {
        // Dev fallback: simulate cameras if backend not up yet
        setCameras(Array.from({ length: 9 }, (_, i) => ({
          id: `cam-${i + 1}`,
          name: `Camera ${String(i + 1).padStart(2, '0')}`,
          location: ['Main Gate', 'Parking Lot A', 'North Perimeter', 'Server Room', 'Loading Bay',
                     'South Entrance', 'Rooftop', 'Corridor B', 'Visitor Lobby'][i] || `Zone ${i+1}`,
          status: Math.random() > 0.15 ? 'online' : 'offline',
        })))
      })
  }, [])

  // Load existing event log
  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(setAlerts)
      .catch(() => {})
  }, [])

  // WebSocket for real-time alerts
  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${window.location.host}/ws/alerts`)
    wsRef.current = ws

    ws.onmessage = (e) => {
      const alert = JSON.parse(e.data)
      setAlerts(prev => [alert, ...prev].slice(0, 200))

      // Highlight camera tile briefly
      const camId = alert.camera_id
      setAlertMap(prev => ({ ...prev, [camId]: true }))
      setTimeout(() => setAlertMap(prev => {
        const next = { ...prev }
        delete next[camId]
        return next
      }), 8000)
    }

    ws.onerror = () => {}
    ws.onclose = () => {}
    return () => ws.close()
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <StatusBar cameras={cameras} alerts={alerts} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* Camera grid - takes up most of the space */}
        <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
          <CameraGrid cameras={cameras} alertMap={alertMap} />
        </div>
        {/* Alert panel - fixed width sidebar */}
        <div style={{ width: 280, flexShrink: 0, overflow: 'hidden' }}>
          <AlertPanel
            alerts={alerts}
            onClear={() => setAlerts([])}
          />
        </div>
      </div>
    </div>
  )
}
