import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'
import Icon from '../components/Icon'
import { toast } from '../components/Toast'

const TZ = 'Europe/London'

function londonToISO(dateStr, timeStr) {
  const fakeUTC = new Date(`${dateStr}T${timeStr}:00.000Z`)
  const londonMs = new Date(fakeUTC.toLocaleString('en-US', { timeZone: TZ })).getTime()
  const utcMs    = new Date(fakeUTC.toLocaleString('en-US', { timeZone: 'UTC' })).getTime()
  return new Date(fakeUTC.getTime() - (londonMs - utcMs)).toISOString()
}

// Split a UTC ISO into London date (YYYY-MM-DD) + time (HH:MM) for inputs
function isoToLondonInputs(iso) {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(new Date(iso))
  const g = t => p.find(x => x.type === t)?.value
  return { date: `${g('year')}-${g('month')}-${g('day')}`, time: `${g('hour')}:${g('minute')}` }
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
}

const STATUS_BADGE = { confirmed: 'badge-green', rescheduled: 'badge-blue', cancelled: 'badge-red' }
const FILTERS = ['all', 'upcoming', 'confirmed', 'rescheduled', 'cancelled']

export default function Appointments({ profile }) {
  const isAdmin = profile?.role === 'admin'
  const [appts,    setAppts]    = useState([])
  const [services, setServices] = useState([])
  const [dentists, setDentists] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('upcoming')
  const [search,   setSearch]   = useState('')
  const [edit,     setEdit]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('dental_appointments').select('*').order('start_time', { ascending: false })
    setAppts(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    supabase.from('dental_services').select('name,duration_minutes').eq('active', true).order('sort_order').then(({ data }) => setServices(data || []))
    supabase.from('dental_dentists').select('name').eq('active', true).then(({ data }) => setDentists((data || []).map(d => d.name)))
  }, [load])

  const now = Date.now()
  const filtered = appts.filter(a => {
    if (filter === 'upcoming')      { if (new Date(a.start_time).getTime() < now || a.status === 'cancelled') return false }
    else if (filter !== 'all')      { if (a.status !== filter) return false }
    if (search.trim()) {
      const q = search.toLowerCase()
      const hay = `${a.patient_name} ${a.patient_phone} ${a.patient_email} ${a.service_name} ${a.dentist_name}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  async function setStatus(a, status) {
    const { error } = await supabase.from('dental_appointments').update({ status, updated_at: new Date().toISOString() }).eq('id', a.id)
    if (error) return toast.error(error.message)
    toast.success(`Marked ${status}`)
    load()
  }

  async function remove(a) {
    if (!confirm(`Delete the appointment for ${a.patient_name}? This cannot be undone.`)) return
    const { error } = await supabase.from('dental_appointments').delete().eq('id', a.id)
    if (error) return toast.error(error.message)
    toast.success('Appointment deleted')
    load()
  }

  const counts = {
    upcoming:    appts.filter(a => new Date(a.start_time).getTime() >= now && a.status !== 'cancelled').length,
    confirmed:   appts.filter(a => a.status === 'confirmed').length,
    cancelled:   appts.filter(a => a.status === 'cancelled').length,
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Appointments</h1>
          <div className="topbar-sub">
            {counts.upcoming} upcoming · {counts.confirmed} confirmed · {counts.cancelled} cancelled
          </div>
        </div>
      </div>

      <div className="page">
        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div className="segment">
            {FILTERS.map(f => (
              <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <input type="text" placeholder="Search patient, phone, service…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 280, maxWidth: '100%' }} />
        </div>

        {loading ? (
          <div className="empty-state"><div className="e-icon"><Icon name="loader" size={28} className="spin" /></div>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><div className="e-icon"><Icon name="clipboard" size={30} /></div>No appointments match this view</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Patient</th>
                  <th>Service</th>
                  <th>Dentist</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600 }}>{fmtDate(a.start_time)}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtTime(a.start_time)} – {fmtTime(a.end_time)}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{a.patient_name || 'Unknown'}
                        {a.patient_type && <span className="badge badge-gray" style={{ marginLeft: 6, fontSize: 10 }}>{a.patient_type}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.patient_phone || a.patient_email || '—'}</div>
                    </td>
                    <td>{a.service_name || '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{a.dentist_name || '—'}</td>
                    <td><span className={`badge ${STATUS_BADGE[a.status] || 'badge-gray'}`}>{a.status}</span></td>
                    <td>
                      <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEdit(a)}>Edit</button>
                        {a.status !== 'confirmed' && (
                          <button className="btn btn-ghost btn-sm" onClick={() => setStatus(a, 'confirmed')}>Confirm</button>
                        )}
                        {a.status !== 'cancelled' && (
                          <button className="btn btn-danger btn-sm" onClick={() => setStatus(a, 'cancelled')}>Cancel</button>
                        )}
                        {isAdmin && <button className="btn btn-danger btn-sm" onClick={() => remove(a)} title="Delete"><Icon name="trash" size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {edit && (
        <EditModal
          appt={edit}
          services={services}
          dentists={dentists}
          onClose={() => setEdit(null)}
          onSaved={() => { setEdit(null); load() }}
        />
      )}
    </>
  )
}

function EditModal({ appt, services, dentists, onClose, onSaved }) {
  const startIn = isoToLondonInputs(appt.start_time)
  const durMins = Math.round((new Date(appt.end_time) - new Date(appt.start_time)) / 60000)
  const [form, setForm] = useState({
    patient_name:  appt.patient_name  || '',
    patient_phone: appt.patient_phone || '',
    patient_email: appt.patient_email || '',
    patient_type:  appt.patient_type  || 'new',
    service_name:  appt.service_name  || '',
    dentist_name:  appt.dentist_name  || '',
    status:        appt.status        || 'confirmed',
    date:          startIn.date,
    time:          startIn.time,
    duration:      durMins || 30,
    notes:         appt.notes || '',
  })
  const [saving, setSaving] = useState(false)

  function set(key, val) {
    setForm(f => {
      const next = { ...f, [key]: val }
      if (key === 'service_name') {
        const svc = services.find(s => s.name === val)
        if (svc) next.duration = svc.duration_minutes || f.duration
      }
      return next
    })
  }

  async function save(e) {
    e.preventDefault()
    if (!form.patient_name.trim()) return toast.error('Patient name is required')
    setSaving(true)
    const startISO = londonToISO(form.date, form.time)
    const endISO   = new Date(new Date(startISO).getTime() + Number(form.duration) * 60000).toISOString()

    const { error } = await supabase.from('dental_appointments').update({
      patient_name:  form.patient_name.trim(),
      patient_phone: form.patient_phone.trim() || null,
      patient_email: form.patient_email.trim() || null,
      patient_type:  form.patient_type,
      service_name:  form.service_name || null,
      dentist_name:  form.dentist_name || null,
      status:        form.status,
      start_time:    startISO,
      end_time:      endISO,
      notes:         form.notes.trim() || null,
      updated_at:    new Date().toISOString(),
    }).eq('id', appt.id)

    setSaving(false)
    if (error) return toast.error('Failed to save: ' + error.message)
    toast.success('Appointment updated')
    onSaved()
  }

  const inputStyle = { width: '100%', boxSizing: 'border-box' }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500, width: '95vw' }}>
        <div className="modal-header">
          <h2>Edit Appointment</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={save}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Patient</div>
            <input style={inputStyle} placeholder="Full name *" value={form.patient_name} onChange={e => set('patient_name', e.target.value)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input style={inputStyle} placeholder="Phone" value={form.patient_phone} onChange={e => set('patient_phone', e.target.value)} />
              <input style={inputStyle} placeholder="Email" value={form.patient_email} onChange={e => set('patient_email', e.target.value)} />
            </div>
            <select style={inputStyle} value={form.patient_type} onChange={e => set('patient_type', e.target.value)}>
              <option value="new">New patient</option>
              <option value="returning">Returning patient</option>
            </select>

            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Appointment</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <select style={inputStyle} value={form.service_name} onChange={e => set('service_name', e.target.value)}>
                <option value="">— Service —</option>
                {services.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
              <select style={inputStyle} value={form.dentist_name} onChange={e => set('dentist_name', e.target.value)}>
                <option value="">— Any dentist —</option>
                {dentists.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px', gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Date (London)</div>
                <input style={inputStyle} type="date" value={form.date} onChange={e => set('date', e.target.value)} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Time (London)</div>
                <input style={inputStyle} type="time" value={form.time} step="300" onChange={e => set('time', e.target.value)} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Mins</div>
                <input style={inputStyle} type="number" value={form.duration} min="10" max="180" step="5" onChange={e => set('duration', e.target.value)} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Status</div>
              <select style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="confirmed">Confirmed</option>
                <option value="rescheduled">Rescheduled</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 56 }} placeholder="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-gold" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
