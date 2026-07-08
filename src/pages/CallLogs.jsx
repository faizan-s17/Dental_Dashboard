import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'
import Icon from '../components/Icon'

const TZ = 'Europe/London'
const fmtDateTime = iso => new Date(iso).toLocaleString('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const dur = s => s == null ? '—' : `${Math.floor(s/60)}m ${s%60}s`

const FILTERS = ['all', 'booked', 'no booking', 'urgent', 'handoff']
const URGENCY_BADGE = { high: 'badge-red', urgent: 'badge-red', normal: 'badge-gray', low: 'badge-gray' }

export default function CallLogs() {
  const [calls,   setCalls]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')
  const [search,  setSearch]  = useState('')
  const [detail,  setDetail]  = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('dental_call_logs').select('*').order('created_at', { ascending: false })
    setCalls(data || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = calls.filter(c => {
    if (filter === 'booked'     && !c.booked) return false
    if (filter === 'no booking' &&  c.booked) return false
    if (filter === 'urgent'     && !(c.urgency && c.urgency !== 'normal' && c.urgency !== 'low')) return false
    if (filter === 'handoff'    && !c.handoff_needed) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!`${c.patient_name} ${c.caller_number} ${c.intent} ${c.service_requested}`.toLowerCase().includes(q)) return false
    }
    return true
  })

  const total = calls.length
  const booked = calls.filter(c => c.booked).length
  const handoffs = calls.filter(c => c.handoff_needed).length
  const bookRate = total ? Math.round((booked / total) * 100) : 0

  return (
    <>
      <div className="topbar">
        <div>
          <h1>AI Call Logs</h1>
          <div className="topbar-sub">{total} calls · {booked} booked ({bookRate}% conversion) · {handoffs} handoff{handoffs !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <div className="page">
        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom: 18 }}>
          <div className="stat-card"><div className="stat-label">Total Calls</div><div className="stat-value">{total}</div><div className="stat-sub">handled by AI</div></div>
          <div className="stat-card"><div className="stat-label">Booked</div><div className="stat-value">{booked}</div><div className="stat-sub">{bookRate}% conversion</div></div>
          <div className="stat-card"><div className="stat-label">Staff Handoffs</div><div className="stat-value">{handoffs}</div><div className="stat-sub">needed a human</div></div>
          <div className="stat-card"><div className="stat-label">Urgent Calls</div><div className="stat-value">{calls.filter(c => c.urgency && c.urgency !== 'normal' && c.urgency !== 'low').length}</div><div className="stat-sub">flagged urgent</div></div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div className="segment">
            {FILTERS.map(f => <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>)}
          </div>
          <div style={{ flex: 1 }} />
          <input type="text" placeholder="Search caller, intent, service…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 280, maxWidth: '100%' }} />
        </div>

        {loading ? (
          <div className="empty-state"><div className="e-icon"><Icon name="loader" size={28} className="spin" /></div>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><div className="e-icon"><Icon name="phone" size={30} /></div>No calls match this view</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>When</th><th>Caller</th><th>Intent</th><th>Service</th><th>Duration</th><th>Urgency</th><th>Result</th></tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setDetail(c)}>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{fmtDateTime(c.created_at)}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{c.patient_name || 'Unknown'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.caller_number}</div>
                    </td>
                    <td>{(c.intent || '—').replace(/_/g, ' ')}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.service_requested || '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{dur(c.duration_seconds)}</td>
                    <td>{c.urgency && c.urgency !== 'normal' ? <span className={`badge ${URGENCY_BADGE[c.urgency] || 'badge-gray'}`}>{c.urgency}</span> : <span style={{ color: 'var(--text-dim)' }}>normal</span>}</td>
                    <td>
                      <div className="flex-gap">
                        <span className={`badge ${c.booked ? 'badge-green' : 'badge-gray'}`}>{c.booked ? 'Booked' : 'No booking'}</span>
                        {c.handoff_needed && <span className="badge badge-red">Handoff</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detail && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetail(null)}>
          <div className="modal" style={{ maxWidth: 560, width: '95vw' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16 }}>Call · {detail.patient_name || 'Unknown'}</h2>
              <button className="modal-close" onClick={() => setDetail(null)}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <Field label="Caller number" value={detail.caller_number} />
              <Field label="When" value={fmtDateTime(detail.created_at)} />
              <Field label="Duration" value={dur(detail.duration_seconds)} />
              <Field label="Intent" value={(detail.intent || '—').replace(/_/g, ' ')} />
              <Field label="Service requested" value={detail.service_requested} />
              <Field label="Urgency" value={detail.urgency} />
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <span className={`badge ${detail.booked ? 'badge-green' : 'badge-gray'}`}>{detail.booked ? '✓ Booked' + (detail.booking_id ? ' · ' + detail.booking_id : '') : 'No booking'}</span>
              {detail.handoff_needed && <span className="badge badge-red">Staff handoff needed</span>}
              {detail.recording_url && <a className="badge badge-blue" href={detail.recording_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>▶ Recording</a>}
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 7 }}><Icon name="chat" size={15} /> Transcript</div>
            <pre style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', fontSize: 12.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--text)', maxHeight: 320, overflowY: 'auto' }}>
              {detail.transcript || 'No transcript available for this call.'}
            </pre>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13 }}>{value || '—'}</div>
    </div>
  )
}
