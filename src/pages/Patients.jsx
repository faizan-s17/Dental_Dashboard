import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'
import Icon from '../components/Icon'
import { toast } from '../components/Toast'

const TZ = 'Europe/London'
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const fmtDateTime = iso => iso ? new Date(iso).toLocaleString('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

function ageFrom(dob) {
  if (!dob) return null
  const d = new Date(dob); const now = new Date()
  let a = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--
  return a
}

const EMPTY = { name: '', phone: '', email: '', dob: '', patient_type: 'new', treatment_interest: '', notes: '' }

export default function Patients({ profile }) {
  const isAdmin = profile?.role === 'admin'
  const [patients, setPatients] = useState([])
  const [appts,    setAppts]    = useState([])
  const [calls,    setCalls]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [detail,   setDetail]   = useState(null)
  const [modal,    setModal]    = useState(null) // 'add' | patient | null
  const [form,     setForm]     = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [p, a, c] = await Promise.all([
      supabase.from('dental_patients').select('*').order('name'),
      supabase.from('dental_appointments').select('*').order('start_time'),
      supabase.from('dental_call_logs').select('*').order('created_at', { ascending: false }),
    ])
    setPatients(p.data || []); setAppts(a.data || []); setCalls(c.data || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const now = Date.now()
  function enrich(pt) {
    const mine = appts.filter(a => (pt.phone && a.patient_phone === pt.phone) || (pt.email && a.patient_email === pt.email) || a.patient_name === pt.name)
    const active = mine.filter(a => a.status !== 'cancelled')
    const past   = active.filter(a => new Date(a.start_time).getTime() < now)
    const future = active.filter(a => new Date(a.start_time).getTime() >= now)
    const myCalls = calls.filter(c => (pt.phone && c.caller_number === pt.phone) || c.patient_name === pt.name)
    return {
      visits: past.length,
      lastAppt: past.length ? past[past.length - 1] : null,
      nextAppt: future.length ? future[0] : null,
      calls: myCalls,
      appts: mine,
    }
  }

  const filtered = patients.filter(p => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return `${p.name} ${p.phone} ${p.email} ${p.treatment_interest}`.toLowerCase().includes(q)
  })

  function openAdd()  { setForm(EMPTY); setModal('add') }
  function openEdit(p){ setForm({ ...p, dob: p.dob || '', treatment_interest: p.treatment_interest || '', notes: p.notes || '' }); setModal(p) }
  function fld(k)     { return e => setForm(f => ({ ...f, [k]: e.target.value })) }

  async function save() {
    if (!form.name.trim()) return toast.error('Name is required')
    setSaving(true)
    const payload = {
      name: form.name.trim(), phone: form.phone.trim() || null, email: form.email.trim() || null,
      dob: form.dob || null, patient_type: form.patient_type,
      treatment_interest: form.treatment_interest.trim() || null, notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    }
    const res = modal === 'add'
      ? await supabase.from('dental_patients').insert(payload)
      : await supabase.from('dental_patients').update(payload).eq('id', form.id)
    setSaving(false)
    if (res.error) return toast.error(res.error.message)
    toast.success(modal === 'add' ? 'Patient added' : 'Patient updated')
    setModal(null); load()
  }

  async function remove(p) {
    if (!confirm(`Delete patient ${p.name}? (Appointments are not affected.)`)) return
    const { error } = await supabase.from('dental_patients').delete().eq('id', p.id)
    if (error) return toast.error(error.message)
    toast.success('Patient deleted'); setDetail(null); load()
  }

  function exportCSV() {
    const headers = ['Name','Phone','Email','Date of Birth','Type','Treatment Interest','Notes','Visits','Last Visit','Next Visit']
    const rows = filtered.map(p => {
      const e = enrich(p)
      return [
        p.name, p.phone || '', p.email || '',
        p.dob ? fmtDate(p.dob) : '',
        p.patient_type === 'returning' ? 'Existing' : 'New',
        p.treatment_interest || '',
        (p.notes || '').replace(/\n/g, ' '),
        e.visits,
        e.lastAppt ? fmtDate(e.lastAppt.start_time) : '',
        e.nextAppt ? fmtDate(e.nextAppt.start_time) : '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`)
    })
    const csv = [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\n')
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })),
      download: `patients-${new Date().toISOString().slice(0, 10)}.csv`,
    })
    a.click(); URL.revokeObjectURL(a.href)
  }

  function exportPDF() {
    const rows = filtered.map(p => {
      const e = enrich(p)
      const esc = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      return `<tr>
        <td>${esc(p.name)}</td><td>${esc(p.phone)}</td><td>${esc(p.email)}</td>
        <td>${p.dob ? fmtDate(p.dob) : '—'}</td>
        <td>${p.patient_type === 'returning' ? 'Existing' : 'New'}</td>
        <td>${esc(p.treatment_interest)}</td>
        <td style="text-align:center">${e.visits}</td>
        <td>${e.lastAppt ? fmtDate(e.lastAppt.start_time) : '—'}</td>
        <td>${e.nextAppt ? fmtDate(e.nextAppt.start_time) : '—'}</td>
      </tr>`
    }).join('')
    const w = window.open('', '_blank')
    w.document.write(`<!DOCTYPE html><html><head><title>Patient Records</title><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;font-size:11px;padding:28px;color:#111}
      .header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #2dd4bf}
      h1{font-size:20px;font-weight:700;color:#0f2027}
      .meta{font-size:11px;color:#666;margin-top:4px}
      .badge{display:inline-block;font-size:10px;font-weight:700;padding:1px 6px;border-radius:3px;text-transform:uppercase}
      table{border-collapse:collapse;width:100%;margin-top:4px}
      th{background:#0f2027;color:#2dd4bf;text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.6px;white-space:nowrap}
      td{padding:7px 10px;border-bottom:1px solid #e8e8e8;vertical-align:top;font-size:11px}
      tr:nth-child(even) td{background:#f7f9fa}
      @media print{body{padding:16px}thead{display:table-header-group}}
    </style></head><body>
    <div class="header">
      <div>
        <h1>Smile Dental Clinic — Patient Records</h1>
        <div class="meta">Exported ${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })} · ${filtered.length} record${filtered.length !== 1 ? 's' : ''}</div>
      </div>
    </div>
    <table>
      <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>DOB</th><th>Type</th><th>Treatment Interest</th><th>Visits</th><th>Last Visit</th><th>Next Visit</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    </body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 400)
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Patients</h1>
          <div className="topbar-sub">{patients.length} patient record{patients.length !== 1 ? 's' : ''} · click a row for full history</div>
        </div>
      </div>

      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <input type="text" placeholder="Search name, phone, treatment…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 300, maxWidth: '100%' }} />
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost btn-sm" onClick={exportCSV} title="Download CSV">↓ CSV</button>
            <button className="btn btn-ghost btn-sm" onClick={exportPDF} title="Print / Save PDF">↓ PDF</button>
            <button className="btn btn-gold" onClick={openAdd}>+ Add patient</button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><div className="e-icon"><Icon name="loader" size={28} className="spin" /></div>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><div className="e-icon"><Icon name="user" size={30} /></div>No patients found</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Patient</th><th>Contact</th><th>Type</th><th>Visits</th><th>Last visit</th><th>Next visit</th></tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const e = enrich(p)
                  return (
                    <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => setDetail({ patient: p, ...e })}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 28, height: 28, background: 'var(--gold)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: 'var(--on-accent)', flexShrink: 0 }}>{p.name.charAt(0).toUpperCase()}</div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{p.name}</div>
                            {p.treatment_interest && <div style={{ fontSize: 11, color: 'var(--gold)' }}>★ {p.treatment_interest}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        <div>{p.phone || '—'}</div>
                        <div style={{ fontSize: 12 }}>{p.email || ''}</div>
                      </td>
                      <td><span className={`badge ${p.patient_type === 'returning' ? 'badge-blue' : 'badge-gray'}`}>{p.patient_type === 'returning' ? 'Existing' : 'New'}</span></td>
                      <td style={{ fontWeight: 600, color: 'var(--gold)' }}>{e.visits}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{e.lastAppt ? fmtDate(e.lastAppt.start_time) : '—'}</td>
                      <td>{e.nextAppt ? <span style={{ color: 'var(--green)' }}>{fmtDate(e.nextAppt.start_time)}</span> : <span style={{ color: 'var(--text-dim)' }}>—</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Patient detail */}
      {detail && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetail(null)}>
          <div className="modal" style={{ maxWidth: 560, width: '95vw' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, background: 'var(--gold)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 17, color: 'var(--on-accent)' }}>{detail.patient.name.charAt(0).toUpperCase()}</div>
                <div>
                  <h2 style={{ fontSize: 16 }}>{detail.patient.name}</h2>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    <span className={`badge ${detail.patient.patient_type === 'returning' ? 'badge-blue' : 'badge-gray'}`} style={{ marginRight: 6 }}>{detail.patient.patient_type === 'returning' ? 'Existing' : 'New'}</span>
                    {detail.visits} visit{detail.visits !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setDetail(null)}>×</button>
            </div>

            {/* Profile grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <Field label="Phone" value={detail.patient.phone} />
              <Field label="Email" value={detail.patient.email} />
              <Field label="Date of birth" value={detail.patient.dob ? `${fmtDate(detail.patient.dob)} (${ageFrom(detail.patient.dob)})` : null} />
              <Field label="Treatment interest" value={detail.patient.treatment_interest} />
              <Field label="Last appointment" value={detail.lastAppt ? fmtDateTime(detail.lastAppt.start_time) : null} />
              <Field label="Next appointment" value={detail.nextAppt ? fmtDateTime(detail.nextAppt.start_time) : null} accent={!!detail.nextAppt} />
            </div>
            {detail.patient.notes && (
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Notes</div>
                <div style={{ fontSize: 13 }}>{detail.patient.notes}</div>
              </div>
            )}

            {/* Appointment history */}
            <Section title={<><Icon name="clipboard" size={14} /> Appointment history ({detail.appts.length})</>}>
              {detail.appts.length === 0 ? <Muted>No appointments on record.</Muted> :
                detail.appts.slice().reverse().map(a => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: 13 }}>{a.service_name || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDateTime(a.start_time)}{a.dentist_name ? ` · ${a.dentist_name}` : ''}</div>
                    </div>
                    <span className={`badge ${a.status === 'confirmed' ? 'badge-green' : a.status === 'cancelled' ? 'badge-red' : 'badge-blue'}`}>{a.status}</span>
                  </div>
                ))}
            </Section>

            {/* Call history + urgency */}
            <Section title={<><Icon name="phone" size={14} /> Call history ({detail.calls.length})</>}>
              {detail.calls.length === 0 ? <Muted>No AI calls linked to this patient.</Muted> :
                detail.calls.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: 13 }}>{(c.intent || 'call').replace(/_/g, ' ')}{c.service_requested ? ` · ${c.service_requested}` : ''}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDateTime(c.created_at)} · {c.duration_seconds ? Math.floor(c.duration_seconds/60)+'m '+(c.duration_seconds%60)+'s' : '—'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {c.urgency && c.urgency !== 'normal' && <span className="badge badge-red">{c.urgency}</span>}
                      <span className={`badge ${c.booked ? 'badge-green' : 'badge-gray'}`}>{c.booked ? 'booked' : 'no booking'}</span>
                    </div>
                  </div>
                ))}
            </Section>

            <div className="modal-footer">
              {isAdmin && <button className="btn btn-danger" onClick={() => remove(detail.patient)} style={{ marginRight: 'auto' }}>Delete</button>}
              <button className="btn btn-ghost" onClick={() => setDetail(null)}>Close</button>
              <button className="btn btn-gold" onClick={() => { openEdit(detail.patient); setDetail(null) }}>Edit profile</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / edit patient */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{modal === 'add' ? 'Add Patient' : 'Edit Patient'}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="form-grid" style={{ gap: 14 }}>
              <div className="form-group full"><label>Full name</label><input type="text" value={form.name} onChange={fld('name')} autoFocus /></div>
              <div className="form-group"><label>Phone</label><input type="text" value={form.phone} onChange={fld('phone')} /></div>
              <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={fld('email')} /></div>
              <div className="form-group"><label>Date of birth</label><input type="date" value={form.dob} onChange={fld('dob')} /></div>
              <div className="form-group"><label>Patient type</label>
                <select value={form.patient_type} onChange={fld('patient_type')}><option value="new">New</option><option value="returning">Existing</option></select>
              </div>
              <div className="form-group full"><label>Treatment interest</label><input type="text" value={form.treatment_interest} onChange={fld('treatment_interest')} placeholder="e.g. Invisalign, Whitening" /></div>
              <div className="form-group full"><label>Notes</label><textarea value={form.notes} onChange={fld('notes')} rows={3} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-gold" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Field({ label, value, accent }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: accent ? 'var(--green)' : 'var(--text)' }}>{value || '—'}</div>
    </div>
  )
}
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)', marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  )
}
function Muted({ children }) { return <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '4px 0' }}>{children}</div> }
