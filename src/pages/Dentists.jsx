import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import Icon from '../components/Icon'
import { toast } from '../components/Toast'

const EMPTY = { name: '', email: '', role: 'dentist', specialty: '', active: true }

export default function Dentists({ isAdmin }) {
  const [dentists, setDentists] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null)
  const [form,     setForm]     = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('dental_dentists').select('*').order('created_at')
    setDentists(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openAdd()   { setForm(EMPTY);    setModal('add') }
  function openEdit(d) { setForm({ ...d });  setModal(d) }
  function close()     { setModal(null) }
  function field(k)    { return e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })) }

  async function save() {
    if (!form.name.trim() || !form.email.trim()) return toast.error('Name and email are required')
    setSaving(true)

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      specialty: form.specialty.trim() || null,
      active: form.active,
    }

    if (modal === 'add') {
      const { error: err } = await supabase.from('dental_dentists').insert(payload)
      setSaving(false)
      if (err) return toast.error(err.message)
      toast.success('Dentist added. Invite them in Supabase Auth so they can sign in.')
    } else {
      const { error: err } = await supabase.from('dental_dentists').update(payload).eq('id', form.id)
      setSaving(false)
      if (err) return toast.error(err.message)
      toast.success('Dentist updated')
    }
    close(); load()
  }

  async function remove(d) {
    if (!confirm(`Remove ${d.name}? This cannot be undone.`)) return
    const { error: err } = await supabase.from('dental_dentists').delete().eq('id', d.id)
    if (err) return toast.error(err.message)
    toast.success('Dentist removed')
    load()
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Dentists</h1>
          <div className="topbar-sub">Manage clinical staff, specialties and roles</div>
        </div>
      </div>
      <div className="page">
        <div className="page-header">
          <span className="page-title">{dentists.length} team member{dentists.length !== 1 ? 's' : ''}</span>
          {isAdmin && <button className="btn btn-gold" onClick={openAdd}>+ Add dentist</button>}
        </div>

        {loading ? (
          <div className="empty-state"><div className="e-icon"><Icon name="loader" size={28} className="spin" /></div>Loading…</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Specialty</th>
                  <th>Role</th>
                  <th>Status</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {dentists.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 28, height: 28, background: 'var(--gold)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: 'var(--on-accent)', flexShrink: 0 }}>
                          {d.name.replace(/^Dr\.?\s*/i, '').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500 }}>{d.name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{d.email}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{d.specialty || '—'}</td>
                    <td>
                      <span className={`badge ${d.role === 'admin' ? 'badge-gold' : 'badge-gray'}`}>{d.role}</span>
                    </td>
                    <td>
                      <span className={`badge ${d.active ? 'badge-green' : 'badge-gray'}`}>
                        {d.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td>
                        <div className="flex-gap">
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(d)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => remove(d)}>Remove</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isAdmin && (
          <div className="card" style={{ marginTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="key" size={16} /> How to give staff login access</div>
            <ol style={{ fontSize: 13, color: 'var(--text-muted)', paddingLeft: 18, lineHeight: 2 }}>
              <li>Add the dentist above with their email address</li>
              <li>Go to your <strong style={{ color: 'var(--text)' }}>Supabase dashboard</strong> → Authentication → Users</li>
              <li>Click <strong style={{ color: 'var(--text)' }}>Invite user</strong> and enter their email</li>
              <li>They'll receive an email to set their password</li>
              <li>Once they sign in, their <code style={{ background: 'var(--surface3)', padding: '1px 5px', borderRadius: 3, fontSize: 12 }}>user_id</code> links automatically</li>
            </ol>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
          <div className="modal">
            <div className="modal-header">
              <h2>{modal === 'add' ? 'Add Dentist' : 'Edit Dentist'}</h2>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <div className="form-grid cols-1" style={{ gap: 14 }}>
              <div className="form-group">
                <label>Full name</label>
                <input type="text" value={form.name} onChange={field('name')} placeholder="e.g. Dr. Sarah Khan" autoFocus />
              </div>
              <div className="form-group">
                <label>Email address</label>
                <input type="email" value={form.email} onChange={field('email')} placeholder="dentist@smiledental.co.uk" />
              </div>
              <div className="form-group">
                <label>Specialty</label>
                <input type="text" value={form.specialty} onChange={field('specialty')} placeholder="e.g. Orthodontics" />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={form.role} onChange={field('role')}>
                  <option value="dentist">Dentist</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <label className="toggle">
                  <input type="checkbox" checked={form.active} onChange={field('active')} />
                  <span className="toggle-slider" />
                </label>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Active</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={close}>Cancel</button>
              <button className="btn btn-gold" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
