import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'
import Icon from '../components/Icon'
import { toast } from '../components/Toast'

const HOUR_START = 9   // 9am
const HOUR_END   = 17  // 5pm
const TOTAL_MINS = (HOUR_END - HOUR_START) * 60

const STATUS_COLORS = {
  confirmed:   { bg: 'rgba(45,212,191,.13)', border: '#2dd4bf', text: '#2dd4bf' },
  rescheduled: { bg: 'rgba(96,165,250,.14)', border: '#3b82f6', text: '#60a5fa' },
  cancelled:   { bg: 'rgba(239,68,68,.14)',  border: '#ef4444', text: '#f87171' }
}

const DAYS   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAYS_F = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const TZ     = 'Europe/London'

function londonParts(isoStr) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false
  })
  const parts = fmt.formatToParts(new Date(isoStr))
  const get = type => parts.find(p => p.type === type)?.value
  return {
    year: parseInt(get('year')), month: parseInt(get('month')),
    day: parseInt(get('day')),   hour: parseInt(get('hour')),
    minute: parseInt(get('minute')), weekday: get('weekday')
  }
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
function pad2(n) { return String(n).padStart(2, '0') }
function firstOfMonth(date) { const d = new Date(date); d.setDate(1); d.setHours(0, 0, 0, 0); return d }

function dateStringFromParts(p) {
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`
}

function londonDateStringFromISO(iso) {
  return dateStringFromParts(londonParts(iso))
}

function addDaysLondonDate(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const noonUTC = new Date(Date.UTC(y, m - 1, d + n, 12, 0, 0))
  return londonDateStringFromISO(noonUTC.toISOString())
}

function getWeekStartDate(date) {
  const p = londonParts(date.toISOString())
  const weekdayMap = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }
  return addDaysLondonDate(dateStringFromParts(p), -(weekdayMap[p.weekday] ?? 0))
}

function displayDate(value) {
  return typeof value === 'string' ? new Date(londonToISO(value, '12:00')) : value
}

function fmt(date) {
  return displayDate(date).toLocaleDateString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short' })
}

function fmtFull(date) {
  return displayDate(date).toLocaleDateString('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' })
}

function timeLabel(h) {
  const suffix = h >= 12 ? 'pm' : 'am'
  const display = h > 12 ? h - 12 : h
  return `${display}${suffix}`
}

function fmtTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
}

function minsFromDayStart(isoStr) {
  const { hour, minute } = londonParts(isoStr)
  return hour * 60 + minute - HOUR_START * 60
}

function dayIndex(isoStr) {
  const weekdayMap = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }
  return weekdayMap[londonParts(isoStr).weekday] ?? 0
}

function isSameLondonDate(dateStr, refDate) {
  return dateStr === londonDateStringFromISO(refDate.toISOString())
}

function londonToISO(dateStr, timeStr) {
  const fakeUTC = new Date(`${dateStr}T${timeStr}:00.000Z`)
  const londonMs = new Date(fakeUTC.toLocaleString('en-US', { timeZone: TZ })).getTime()
  const utcMs    = new Date(fakeUTC.toLocaleString('en-US', { timeZone: 'UTC' })).getTime()
  return new Date(fakeUTC.getTime() - (londonMs - utcMs)).toISOString()
}

function todayLondon() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ })
}

export default function Calendar({ profile }) {
  const [dentists,    setDentists]    = useState([])
  const [services,    setServices]    = useState([])
  const [selected,    setSelected]    = useState('all')
  const [weekStart,   setWeekStart]   = useState(() => getWeekStartDate(new Date()))
  const [appts,       setAppts]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [detail,      setDetail]      = useState(null)
  const [view,        setView]        = useState('week')
  const [selectedDay, setSelectedDay] = useState(0)
  const [monthCursor, setMonthCursor] = useState(() => firstOfMonth(new Date()))
  const [monthSelDay, setMonthSelDay] = useState(null)
  const [showNew,     setShowNew]     = useState(false)

  useEffect(() => {
    supabase.from('dental_dentists').select('name').eq('active', true).then(({ data }) => {
      const names = (data || []).map(b => b.name)
      setDentists(names)
      if (profile?.role !== 'admin' && profile?.name) setSelected(profile.name)
    })
    supabase.from('dental_services').select('name,price,duration_minutes').eq('active', true).order('sort_order').then(({ data }) => {
      setServices(data || [])
    })
  }, [profile])

  const load = useCallback(async () => {
    setLoading(true)
    let start, end
    if (view === 'month') {
      const y = monthCursor.getFullYear(), m = monthCursor.getMonth()
      const ny = m === 11 ? y + 1 : y, nm = m === 11 ? 0 : m + 1
      start = londonToISO(`${y}-${pad2(m + 1)}-01`, '00:00')
      end   = londonToISO(`${ny}-${pad2(nm + 1)}-01`, '00:00')
    } else {
      start = londonToISO(weekStart, '00:00')
      end   = londonToISO(addDaysLondonDate(weekStart, 7), '00:00')
    }
    let q = supabase.from('dental_appointments')
      .select('*')
      .gte('start_time', start)
      .lt('start_time',  end)
      .order('start_time')

    if (selected !== 'all') q = q.eq('dentist_name', selected)

    const { data } = await q
    setAppts(data || [])
    setLoading(false)
  }, [view, weekStart, monthCursor, selected])

  useEffect(() => { load() }, [load])

  const weekDays = Array.from({ length: 7 }, (_, i) => addDaysLondonDate(weekStart, i))
  const today    = new Date()

  const apptsByDay = Array.from({ length: 7 }, () => [])
  appts.forEach(a => {
    const d = dayIndex(a.start_time)
    if (d >= 0 && d < 7) apptsByDay[d].push(a)
  })

  const isMonth = view === 'month'
  const apptsByDate = {}
  if (isMonth) appts.forEach(a => { const day = londonParts(a.start_time).day; (apptsByDate[day] = apptsByDate[day] || []).push(a) })

  function prev() { if (isMonth) setMonthCursor(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)); else setWeekStart(d => addDaysLondonDate(d, -7)) }
  function next() { if (isMonth) setMonthCursor(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)); else setWeekStart(d => addDaysLondonDate(d, 7)) }
  function goToday() {
    const now = new Date()
    if (isMonth) { setMonthCursor(firstOfMonth(now)); setMonthSelDay(null) }
    else {
      const p = londonParts(now.toISOString())
      const weekdayMap = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }
      setWeekStart(getWeekStartDate(now))
      setSelectedDay(weekdayMap[p.weekday] ?? 0)
    }
  }

  const confirmedCount = appts.filter(a => a.status === 'confirmed').length
  const cancelledCount = appts.filter(a => a.status === 'cancelled').length

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Calendar</h1>
          <div className="topbar-sub">
            {isMonth ? `${MONTHS[monthCursor.getMonth()]} ${monthCursor.getFullYear()}` : `${fmt(weekStart)} – ${fmt(addDaysLondonDate(weekStart, 6))}`} &nbsp;·&nbsp;
            <span style={{ color: 'var(--gold)' }}>{confirmedCount} confirmed</span>
            {cancelledCount > 0 && <span style={{ color: 'var(--text-dim)' }}>, {cancelledCount} cancelled</span>}
          </div>
        </div>
      </div>

      <div className="page" style={{ paddingBottom: 40 }}>
        {/* Controls bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={prev}>← Prev</button>
          <button className="btn btn-ghost btn-sm" onClick={goToday}>Today</button>
          <button className="btn btn-ghost btn-sm" onClick={next}>Next →</button>

          <div style={{ flex: 1 }} />

          <button className="btn btn-gold btn-sm" onClick={() => setShowNew(true)}>+ New Appointment</button>

          <div className="segment">
            {['week', 'day', 'month'].map(v => (
              <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          <select value={selected} onChange={e => setSelected(e.target.value)}
            style={{ padding: '6px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13, width: 'auto' }}>
            <option value="all">All Dentists</option>
            {dentists.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {/* Day selector (day view) */}
        {view === 'day' && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto' }}>
            {weekDays.map((d, i) => {
              const isToday = isSameLondonDate(d, today)
              const isSelected = i === selectedDay
              const count = apptsByDay[i].filter(a => a.status !== 'cancelled').length
              const dayPart = londonParts(londonToISO(d, '12:00')).day
              return (
                <button key={i} onClick={() => setSelectedDay(i)}
                  style={{ flex: '1 0 60px', padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, transition: 'all .15s',
                    background: isSelected ? 'var(--gold)' : isToday ? 'var(--surface3)' : 'var(--surface2)',
                    color: isSelected ? 'var(--on-accent)' : isToday ? 'var(--text)' : 'var(--text-muted)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{DAYS[i]}</div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>{dayPart}</div>
                  {count > 0 && <div style={{ marginTop: 3, width: 6, height: 6, borderRadius: '50%', background: isSelected ? 'var(--on-accent)' : 'var(--gold)', margin: '4px auto 0' }} />}
                </button>
              )
            })}
          </div>
        )}

        {loading ? (
          <div className="empty-state"><div className="e-icon"><Icon name="loader" size={28} className="spin" /></div>Loading…</div>
        ) : view === 'week' ? (
          <WeekGrid weekDays={weekDays} apptsByDay={apptsByDay} today={today} onSelect={setDetail} />
        ) : view === 'day' ? (
          <DayList appts={apptsByDay[selectedDay]} day={weekDays[selectedDay]} onSelect={setDetail} />
        ) : (
          <MonthGrid monthCursor={monthCursor} apptsByDate={apptsByDate} today={today}
            selectedDay={monthSelDay} onSelectDay={setMonthSelDay} onSelect={setDetail} onPrev={prev} onNext={next} />
        )}
      </div>

      {/* New Appointment modal */}
      {showNew && (
        <NewBookingModal
          dentists={dentists}
          services={services}
          defaultDentist={selected !== 'all' ? selected : dentists[0] || ''}
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); load() }}
        />
      )}

      {/* Appointment detail modal */}
      {detail && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetail(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16 }}>Appointment Details</h2>
              <button className="modal-close" onClick={() => setDetail(null)}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', padding: '2px 8px', borderRadius: 4,
                  background: STATUS_COLORS[detail.status]?.bg, color: STATUS_COLORS[detail.status]?.text,
                  border: `1px solid ${STATUS_COLORS[detail.status]?.border}` }}>
                  {detail.status}
                </span>
                {detail.booking_id && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{detail.booking_id}</span>}
              </div>
              {[
                ['Patient',  detail.patient_name],
                ['Type',     detail.patient_type],
                ['Phone',    detail.patient_phone],
                ['Email',    detail.patient_email],
                ['Service',  detail.service_name],
                ['Dentist',  detail.dentist_name],
                ['Date',     new Date(detail.start_time).toLocaleDateString('en-GB', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })],
                ['Time',     fmtTime(detail.start_time) + ' – ' + fmtTime(detail.end_time) + ' (London)'],
                ['Notes',    detail.notes || '—'],
              ].map(([label, val]) => val && (
                <div key={label} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 8, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-dim)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px', paddingTop: 1 }}>{label}</span>
                  <span style={{ color: 'var(--text)' }}>{val}</span>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── New Appointment Modal ────────────────────────────────────────────────────
function NewBookingModal({ dentists, services, defaultDentist, onClose, onSaved }) {
  const [form, setForm] = useState({
    patient_name:  '',
    patient_phone: '',
    patient_email: '',
    patient_type:  'new',
    service_name:  services[0]?.name  || '',
    dentist_name:  defaultDentist,
    date:          todayLondon(),
    time:          '10:00',
    duration:      services[0]?.duration_minutes || 30,
    notes:         '',
  })
  const [saving, setSaving] = useState(false)

  function set(key, val) {
    setForm(f => {
      const next = { ...f, [key]: val }
      if (key === 'service_name') {
        const svc = services.find(s => s.name === val)
        if (svc) next.duration = svc.duration_minutes || 30
      }
      return next
    })
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.patient_name.trim()) return toast.error('Patient name is required')
    if (!form.service_name)        return toast.error('Please select a service')

    setSaving(true)
    const startISO = londonToISO(form.date, form.time)
    const endISO   = new Date(new Date(startISO).getTime() + Number(form.duration) * 60000).toISOString()

    const { error } = await supabase.from('dental_appointments').insert({
      booking_id:    'DENT-MANUAL-' + Date.now(),
      patient_name:  form.patient_name.trim(),
      patient_phone: form.patient_phone.trim() || null,
      patient_email: form.patient_email.trim() || null,
      patient_type:  form.patient_type,
      service_name:  form.service_name,
      dentist_name:  form.dentist_name || null,
      start_time:    startISO,
      end_time:      endISO,
      status:        'confirmed',
      notes:         form.notes.trim() || null,
    })

    setSaving(false)
    if (error) { toast.error('Failed to save: ' + error.message); return }
    toast.success('Appointment added!')
    onSaved()
  }

  const inputStyle = {
    width: '100%', padding: '8px 10px', background: 'var(--surface2)',
    border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)',
    fontSize: 13, boxSizing: 'border-box'
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480, width: '95vw' }}>
        <div className="modal-header">
          <h2 style={{ fontSize: 16 }}>New Appointment</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0 8px' }}>

            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: -6 }}>Patient</div>
            <input style={inputStyle} placeholder="Full name *" value={form.patient_name}
              onChange={e => set('patient_name', e.target.value)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input style={inputStyle} placeholder="Phone" type="tel" value={form.patient_phone}
                onChange={e => set('patient_phone', e.target.value)} />
              <input style={inputStyle} placeholder="Email" type="email" value={form.patient_email}
                onChange={e => set('patient_email', e.target.value)} />
            </div>
            <select style={inputStyle} value={form.patient_type} onChange={e => set('patient_type', e.target.value)}>
              <option value="new">New patient</option>
              <option value="returning">Returning patient</option>
            </select>

            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: -6 }}>Appointment</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <select style={inputStyle} value={form.service_name} onChange={e => set('service_name', e.target.value)}>
                <option value="">— Service —</option>
                {services.map(s => <option key={s.name} value={s.name}>{s.name} {s.price ? `(${s.price})` : ''}</option>)}
              </select>
              <select style={inputStyle} value={form.dentist_name} onChange={e => set('dentist_name', e.target.value)}>
                <option value="">— Any dentist —</option>
                {dentists.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Date (London)</div>
                <input style={inputStyle} type="date" value={form.date}
                  onChange={e => set('date', e.target.value)} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Time (London)</div>
                <input style={inputStyle} type="time" value={form.time} min="09:00" max="17:00" step="900"
                  onChange={e => set('time', e.target.value)} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Mins</div>
                <input style={inputStyle} type="number" value={form.duration} min="10" max="180" step="5"
                  onChange={e => set('duration', e.target.value)} />
              </div>
            </div>

            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
              placeholder="Notes (optional)" value={form.notes}
              onChange={e => set('notes', e.target.value)} />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-gold" disabled={saving}>
              {saving ? 'Saving…' : 'Save Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Month Grid ───────────────────────────────────────────────────────────────
function MonthGrid({ monthCursor, apptsByDate, today, selectedDay, onSelectDay, onSelect, onPrev, onNext }) {
  const y = monthCursor.getFullYear(), m = monthCursor.getMonth()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const firstWeekday = (new Date(y, m, 1).getDay() + 6) % 7 // Mon = 0
  const tp = londonParts(today.toISOString())
  const isCurrentMonth = tp.year === y && tp.month === m + 1

  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{MONTHS[m]} {y}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={onPrev} aria-label="Previous month"><Icon name="chevronLeft" size={16} /></button>
          <button className="btn btn-ghost btn-sm" onClick={onNext} aria-label="Next month"><Icon name="chevronRight" size={16} /></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 8 }}>
        {DAYS.map(d => <div key={d} style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600, paddingLeft: 4 }}>{d}</div>)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const isToday = isCurrentMonth && tp.day === d
          const isSelected = selectedDay === d
          const list = (apptsByDate[d] || []).filter(a => a.status !== 'cancelled')
          return (
            <div key={i} onClick={() => onSelectDay(isSelected ? null : d)}
              style={{
                minHeight: 104, background: 'var(--surface2)', borderRadius: 10,
                border: isSelected ? '1.5px solid var(--gold)' : '1px solid var(--border)',
                padding: '8px 9px', cursor: 'pointer', overflow: 'hidden', transition: 'border-color .15s'
              }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 22, height: 22, borderRadius: 6, padding: '0 5px', fontSize: 13, fontWeight: 700,
                background: isToday ? 'var(--gold)' : 'transparent',
                color: isToday ? 'var(--on-accent)' : 'var(--text-muted)'
              }}>{d}</div>
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {list.slice(0, 3).map(a => (
                  <div key={a.id} onClick={(e) => { e.stopPropagation(); onSelect(a) }}
                    title={`${fmtTime(a.start_time)} ${a.service_name || ''} — ${a.patient_name || ''}`}
                    style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.35 }}>
                    {fmtTime(a.start_time)} {a.service_name}
                  </div>
                ))}
                {list.length > 3 && <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>+{list.length - 3} more</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Week Grid ────────────────────────────────────────────────────────────────
const HOUR_PX = 64  // pixel height per hour row

// Assign side-by-side columns to overlapping appointments
function groupDay(appts) {
  const sorted = [...appts].sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
  const colEnds = []
  const placed = sorted.map(a => {
    const s = new Date(a.start_time).getTime()
    const e = new Date(a.end_time).getTime()
    let col = colEnds.findIndex(end => end <= s)
    if (col === -1) { col = colEnds.length; colEnds.push(e) } else colEnds[col] = e
    return { a, col }
  })
  return placed.map(p => {
    const s = new Date(p.a.start_time).getTime()
    const e = new Date(p.a.end_time).getTime()
    const totalCols = placed.reduce((m, q) => {
      const qs = new Date(q.a.start_time).getTime()
      const qe = new Date(q.a.end_time).getTime()
      return qs < e && qe > s ? Math.max(m, q.col + 1) : m
    }, 1)
    return { ...p, totalCols }
  })
}

function WeekGrid({ weekDays, apptsByDay, today, onSelect }) {
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)

  // Current-time indicator
  const { hour: nowH, minute: nowM } = londonParts(new Date().toISOString())
  const nowMins  = nowH * 60 + nowM - HOUR_START * 60
  const showNow  = nowMins >= 0 && nowMins < TOTAL_MINS
  const todayIdx = weekDays.findIndex(d => isSameLondonDate(d, today))

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>

      {/* Day header */}
      <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div />
        {weekDays.map((d, i) => {
          const isToday = isSameLondonDate(d, today)
          const dayPart = londonParts(londonToISO(d, '12:00')).day
          return (
            <div key={i} style={{ padding: '10px 6px', textAlign: 'center', borderLeft: '1px solid var(--border)', background: isToday ? 'var(--gold-dim)' : 'transparent' }}>
              <div style={{ fontSize: 11, color: isToday ? 'var(--gold)' : 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.7px' }}>{DAYS[i]}</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: isToday ? 'var(--gold)' : 'var(--text)', marginTop: 2 }}>{dayPart}</div>
            </div>
          )
        })}
      </div>

      {/* Scrollable time body */}
      <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 230px)', position: 'relative' }}>

        {/* Hour rows + grid lines */}
        <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)' }}>
          {hours.map(h => (
            <div key={h} style={{ display: 'contents' }}>
              <div style={{ height: HOUR_PX, padding: '4px 8px 0', boxSizing: 'border-box', fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, userSelect: 'none' }}>
                {timeLabel(h)}
              </div>
              {Array.from({ length: 7 }, (_, ci) => (
                <div key={ci} style={{ height: HOUR_PX, borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--border)', position: 'relative', boxSizing: 'border-box' }}>
                  {/* Half-hour dashed line */}
                  <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '1px dashed rgba(42,53,60,.7)', pointerEvents: 'none' }} />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Appointment blocks */}
        {apptsByDay.map((dayAppts, dayIdx) =>
          groupDay(dayAppts).map(({ a, col, totalCols }) => {
            const minsIn  = Math.max(0, minsFromDayStart(a.start_time))
            const durMins = Math.max(15, (new Date(a.end_time) - new Date(a.start_time)) / 60000)
            const topPx   = (minsIn / 60) * HOUR_PX
            const hPx     = Math.max(26, (durMins / 60) * HOUR_PX - 3)
            const c       = STATUS_COLORS[a.status] || STATUS_COLORS.confirmed
            const compact = hPx < 44
            const cW = `(100% - 52px) / 7 / ${totalCols}`
            const lOff = `52px + ${dayIdx} * ((100% - 52px) / 7) + ${col} * (${cW}) + 2px`
            return (
              <div key={a.id} onClick={() => onSelect(a)}
                style={{
                  position: 'absolute', top: topPx, height: hPx,
                  left: `calc(${lOff})`, width: `calc(${cW} - 4px)`,
                  background: c.bg, border: `1px solid ${c.border}`, borderLeft: `3px solid ${c.border}`,
                  borderRadius: 5, padding: compact ? '2px 5px' : '4px 6px',
                  cursor: 'pointer', overflow: 'hidden', zIndex: 2, boxSizing: 'border-box',
                  transition: 'filter .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.25)'}
                onMouseLeave={e => e.currentTarget.style.filter = ''}
              >
                {compact ? (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', overflow: 'hidden' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: c.text, flexShrink: 0 }}>{fmtTime(a.start_time)}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.patient_name}</span>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, color: c.text, lineHeight: 1.2 }}>{fmtTime(a.start_time)}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.patient_name || '—'}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.service_name}</div>
                  </>
                )}
              </div>
            )
          })
        )}

        {/* Live current-time indicator */}
        {showNow && todayIdx !== -1 && (
          <div style={{
            position: 'absolute',
            top: (nowMins / 60) * HOUR_PX,
            left: `calc(52px + ${todayIdx} * ((100% - 52px) / 7))`,
            width: `calc((100% - 52px) / 7)`,
            height: 2, background: 'var(--red)', zIndex: 4, pointerEvents: 'none',
          }}>
            <div style={{ position: 'absolute', left: -1, top: -4, width: 10, height: 10, borderRadius: '50%', background: 'var(--red)' }} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Day List ─────────────────────────────────────────────────────────────────
function DayList({ appts, day, onSelect }) {
  if (!appts || appts.length === 0) {
    return (
      <div className="empty-state">
        <div className="e-icon"><Icon name="calendar" size={30} /></div>
        No appointments on {fmtFull(day)}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 4 }}>
        {fmtFull(day)} · {appts.filter(a => a.status !== 'cancelled').length} appointment{appts.length !== 1 ? 's' : ''}
      </div>
      {appts.map(a => {
        const col  = STATUS_COLORS[a.status] || STATUS_COLORS.confirmed
        const time = fmtTime(a.start_time)
        const end  = fmtTime(a.end_time)
        const dur  = Math.round((new Date(a.end_time) - new Date(a.start_time)) / 60000)
        return (
          <div key={a.id} onClick={() => onSelect(a)}
            style={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderLeft: `4px solid ${col.border}`,
              borderRadius: 8, padding: '14px 16px', cursor: 'pointer', transition: 'background .15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ textAlign: 'right', minWidth: 52, flexShrink: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: col.text }}>{time}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{end}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{a.patient_name || 'Unknown'}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', padding: '1px 6px', borderRadius: 3,
                    background: col.bg, color: col.text, border: `1px solid ${col.border}` }}>{a.status}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{a.service_name} · {dur} min</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                  {a.dentist_name && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="shield" size={12} /> {a.dentist_name}</span>}
                  {a.patient_phone && <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="phone" size={12} /> {a.patient_phone}</span>}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
