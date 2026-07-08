import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'
import Icon from '../components/Icon'

const TZ = 'Europe/London'
function ago(iso) {
  if (!iso) return 'never'
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}
const fmt = iso => iso ? new Date(iso).toLocaleString('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

const EVENT_ICON = { webhook: 'phone', booking: 'checkCircle', reschedule: 'swap', cancel: 'xCircle', reminder: 'bell', urgent: 'alert', error: 'alert', dayoff: 'moon' }

export default function AutomationHealth() {
  const [events, setEvents] = useState([])
  const [supaOk, setSupaOk] = useState(true)
  const [lastBooking, setLastBooking] = useState(null)
  const [lastCall, setLastCall] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [ev, appt, call] = await Promise.all([
      supabase.from('dental_automation_events').select('*').order('created_at', { ascending: false }).limit(40),
      supabase.from('dental_appointments').select('created_at').order('created_at', { ascending: false }).limit(1),
      supabase.from('dental_call_logs').select('created_at').order('created_at', { ascending: false }).limit(1),
    ])
    setSupaOk(!ev.error)
    setEvents(ev.data || [])
    setLastBooking(appt.data?.[0]?.created_at || null)
    setLastCall(call.data?.[0]?.created_at || null)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()

    const channel = supabase
      .channel('automation-health-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dental_automation_events' }, ({ new: row }) => {
        setEvents(prev => [row, ...prev].slice(0, 40))
        setSupaOk(true)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dental_appointments' }, ({ new: row }) => {
        setLastBooking(row.created_at)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dental_call_logs' }, ({ new: row }) => {
        setLastCall(row.created_at)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [load])

  const lastOf = type => events.find(e => e.event_type === type)?.created_at || null
  const weekAgo = Date.now() - 7 * 86400 * 1000
  const recentErrors = events.filter(e => e.status === 'error' && new Date(e.created_at).getTime() > weekAgo)
  // Calendar/Gmail health: degraded if a recent error mentions them
  const calErr = recentErrors.find(e => /calendar/i.test(e.detail || ''))
  const gmailErr = recentErrors.find(e => /gmail|email/i.test(e.detail || ''))

  const lastWebhook = lastOf('webhook') || lastCall

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Automation Health</h1>
          <div className="topbar-sub">Live status of the AI receptionist pipeline
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 12 }} onClick={load}><Icon name="refresh" size={13} style={{ marginRight: 5 }} />Refresh</button>
          </div>
        </div>
      </div>

      <div className="page">
        {/* Connection statuses */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
          <StatusCard title="Supabase Database" ok={supaOk} okText="Connected" badText="Unreachable" sub={supaOk ? 'Read/write OK' : 'Check project'} />
          <StatusCard title="Google Calendar" ok={!calErr} okText="Operational" badText="Needs attention" sub={calErr ? calErr.detail : 'Bookings syncing'} />
          <StatusCard title="Gmail (Confirmations)" ok={!gmailErr} okText="Operational" badText="Needs attention" sub={gmailErr ? gmailErr.detail : 'Emails sending'} />
          <StatusCard title="Vapi Voice Webhook" ok={!!lastWebhook} okText="Receiving" badText="No calls yet" sub={lastWebhook ? `Last call ${ago(lastWebhook)}` : 'Waiting for first call'} />
        </div>

        {/* Metrics */}
        <div className="stats-grid" style={{ marginBottom: 18 }}>
          <div className="stat-card">
            <div className="stat-label">Last Booking Run</div>
            <div className="stat-value" style={{ fontSize: 20 }}>{lastBooking ? ago(lastBooking) : '—'}</div>
            <div className="stat-sub">{fmt(lastBooking)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Last Reminder Sent</div>
            <div className="stat-value" style={{ fontSize: 20 }}>{lastOf('reminder') ? ago(lastOf('reminder')) : '—'}</div>
            <div className="stat-sub">{fmt(lastOf('reminder'))}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Last Urgent Booking</div>
            <div className="stat-value" style={{ fontSize: 20 }}>{lastOf('urgent') ? ago(lastOf('urgent')) : '—'}</div>
            <div className="stat-sub">{fmt(lastOf('urgent'))}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Failed Automations (7d)</div>
            <div className="stat-value" style={{ color: recentErrors.length ? 'var(--red)' : 'var(--gold)' }}>{recentErrors.length}</div>
            <div className="stat-sub">{recentErrors.length ? 'needs review' : 'all healthy'}</div>
          </div>
        </div>

        {/* Event feed */}
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="activity" size={17} /> Recent Automation Events</div>
          {loading ? (
            <div className="empty-state"><div className="e-icon"><Icon name="loader" size={28} className="spin" /></div>Loading…</div>
          ) : events.length === 0 ? (
            <div className="empty-state"><div className="e-icon"><Icon name="inbox" size={30} /></div>No events logged yet. Events appear as the AI receptionist runs.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {events.map(e => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ width: 22, display: 'flex', justifyContent: 'center', color: e.status === 'error' ? 'var(--red)' : 'var(--text-muted)' }}><Icon name={EVENT_ICON[e.event_type] || 'activity'} size={16} /></span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>{e.detail || e.event_type}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{e.event_type} · {fmt(e.created_at)}</div>
                  </div>
                  <span className={`badge ${e.status === 'error' ? 'badge-red' : 'badge-green'}`}>{e.status}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', width: 60, textAlign: 'right' }}>{ago(e.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function StatusCard({ title, ok, okText, badText, sub }) {
  const color = ok ? 'var(--green)' : 'var(--red)'
  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color, marginBottom: 2 }}>{ok ? okText : badText}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>
    </div>
  )
}
