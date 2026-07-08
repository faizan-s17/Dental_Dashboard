import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import Icon from '../components/Icon'
import { toast } from '../components/Toast'

export default function ClinicSettings({ isAdmin }) {
  const [form,   setForm]   = useState(null)
  const [id,     setId]     = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('dental_clinic_config').select('*').single().then(({ data }) => {
      if (data) { setId(data.id); setForm(data) }
    })
  }, [])

  function field(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }

  async function save() {
    if (!form.name.trim()) return toast.error('Clinic name is required')
    setSaving(true)
    const { error: err } = await supabase.from('dental_clinic_config').update({
      name: form.name,
      address: form.address,
      phone: form.phone,
      clinic_email: form.clinic_email,
      dentist_email: form.dentist_email,
      timezone: form.timezone,
      break_start: form.break_start,
      break_end: form.break_end,
      parking: form.parking,
      cancellation: form.cancellation,
      payment: form.payment,
      insurance: form.insurance,
      hours_text: form.hours_text,
      updated_at: new Date().toISOString()
    }).eq('id', id)
    setSaving(false)
    if (err) return toast.error(err.message)
    toast.success('Clinic settings saved')
  }

  if (!form) return (
    <>
      <div className="topbar"><div><h1>Clinic Settings</h1></div></div>
      <div className="page"><div className="empty-state"><div className="e-icon"><Icon name="loader" size={28} className="spin" /></div>Loading…</div></div>
    </>
  )

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Clinic Settings</h1>
          <div className="topbar-sub">Details, contact info and policies used by the AI receptionist</div>
        </div>
      </div>

      <div className="page">
        {/* Basic info */}
        <div className="card gap-20">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="pin" size={17} /> Basic Information</div>
          <div className="form-grid" style={{ gap: 16 }}>
            <div className="form-group">
              <label>Clinic name</label>
              <input type="text" value={form.name || ''} onChange={field('name')} disabled={!isAdmin} />
            </div>
            <div className="form-group">
              <label>Phone number</label>
              <input type="text" value={form.phone || ''} onChange={field('phone')} disabled={!isAdmin} />
            </div>
            <div className="form-group full">
              <label>Address</label>
              <input type="text" value={form.address || ''} onChange={field('address')} disabled={!isAdmin} />
            </div>
            <div className="form-group">
              <label>Clinic email (admin notifications)</label>
              <input type="email" value={form.clinic_email || ''} onChange={field('clinic_email')} disabled={!isAdmin} />
            </div>
            <div className="form-group">
              <label>Lead dentist email (day-off requests)</label>
              <input type="email" value={form.dentist_email || ''} onChange={field('dentist_email')} disabled={!isAdmin} />
            </div>
            <div className="form-group">
              <label>Timezone</label>
              <select value={form.timezone} onChange={field('timezone')} disabled={!isAdmin}>
                <option value="Europe/London">Europe/London (UK)</option>
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="America/New_York">America/New_York</option>
                <option value="America/Chicago">America/Chicago</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="Asia/Dubai">Asia/Dubai</option>
                <option value="Asia/Karachi">Asia/Karachi</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
              </select>
            </div>
            <div className="form-group">
              <label>Lunch break start</label>
              <input type="time" value={form.break_start || ''} onChange={field('break_start')} disabled={!isAdmin} />
            </div>
            <div className="form-group">
              <label>Lunch break end</label>
              <input type="time" value={form.break_end || ''} onChange={field('break_end')} disabled={!isAdmin} />
            </div>
          </div>
        </div>

        <div className="divider" />

        {/* Policies */}
        <div className="card gap-20">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="clipboard" size={17} /> Policies &amp; FAQ Info</div>
          <div className="form-grid cols-1" style={{ gap: 14 }}>
            <div className="form-group">
              <label>Insurance accepted (for FAQ responses)</label>
              <textarea value={form.insurance || ''} onChange={field('insurance')} disabled={!isAdmin} rows={2} />
            </div>
            <div className="form-group">
              <label>Parking info (shown in confirmation emails)</label>
              <textarea value={form.parking || ''} onChange={field('parking')} disabled={!isAdmin} rows={2} />
            </div>
            <div className="form-group">
              <label>Cancellation policy (shown in emails)</label>
              <textarea value={form.cancellation || ''} onChange={field('cancellation')} disabled={!isAdmin} rows={2} />
            </div>
            <div className="form-group">
              <label>Payment methods (for FAQ responses)</label>
              <textarea value={form.payment || ''} onChange={field('payment')} disabled={!isAdmin} rows={2} />
            </div>
            <div className="form-group">
              <label>Hours text (for voice AI responses)</label>
              <textarea value={form.hours_text || ''} onChange={field('hours_text')} disabled={!isAdmin} rows={2} />
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="save-bar" style={{ borderTop: 'none', paddingLeft: 0, marginTop: 20 }}>
            <button className="btn btn-ghost" onClick={() => window.location.reload()}>Discard</button>
            <button className="btn btn-gold" onClick={save} disabled={saving}>{saving ? 'Saving…' : '✓ Save settings'}</button>
          </div>
        )}
      </div>
    </>
  )
}
