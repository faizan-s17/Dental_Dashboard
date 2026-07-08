import { supabase } from '../supabase'
import { toast } from './Toast'

const Svg = ({ children, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)

const ICONS = {
  overview: <Svg><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" /><path d="M9.5 21v-6h5v6" /></Svg>,
  calendar: <Svg><rect x="3.5" y="4.5" width="17" height="16" rx="2" /><path d="M8 3v3M16 3v3M3.5 9h17" /></Svg>,
  patients: <Svg><circle cx="12" cy="8.5" r="3.7" /><path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" /></Svg>,
  clinic:   <Svg><path d="M12 3l7 3v5.5c0 4.2-3 6.9-7 8-4-1.1-7-3.8-7-8V6z" /></Svg>,
  settings: <Svg><path d="M4 21v-6M4 11V3M12 21v-8M12 9V3M20 21v-4M20 13V3" /><path d="M2 15h4M10 9h4M18 17h4" /></Svg>,
}

const NAV = [
  { id: 'overview',  label: 'Overview' },
  { id: 'calendar',  label: 'Calendar' },
  { id: 'patients',  label: 'Patients' },
  { id: 'clinic',    label: 'Clinic' },
  { id: 'settings',  label: 'Settings' },
]

const ToothMark = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
    <path d="M12 2.4c-1.6 0-2.4.9-3.9.9C6.2 3.3 4 4.6 4 7.9c0 2.6.9 4.3 1.5 7.1.5 2.3.5 5 1.9 5 1.2 0 1.2-1.9 1.7-4 .3-1.3.5-2.2 1.9-2.2s1.6.9 1.9 2.2c.5 2.1.5 4 1.7 4 1.4 0 1.4-2.7 1.9-5 .6-2.8 1.5-4.5 1.5-7.1 0-3.3-2.2-4.6-4.1-4.6-1.5 0-2.3-.9-3.9-.9z" />
  </svg>
)

export default function Sidebar({ page, setPage, profile }) {
  const initials = profile?.name ? profile.name.replace(/^Dr\.?\s*/i, '').charAt(0).toUpperCase() : '?'

  async function logout() {
    await supabase.auth.signOut()
    toast.success('Signed out')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark"><ToothMark /></div>
        <div className="sidebar-brand-text">
          <strong>Smile Dental Clinic</strong>
          <span>STAFF DASHBOARD</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {NAV.map(n => (
          <div
            key={n.id}
            className={`nav-item ${page === n.id ? 'active' : ''}`}
            onClick={() => setPage(n.id)}
          >
            <span className="nav-icon">{ICONS[n.id]}</span>
            {n.label}
          </div>
        ))}
      </nav>

      <div className="sidebar-user">
        <div className="sidebar-avatar">{initials}</div>
        <div className="sidebar-user-info">
          <strong>{profile?.name || 'Staff'}</strong>
          <span>{profile?.role === 'admin' ? 'Admin' : (profile?.specialty || 'Dentist')}</span>
        </div>
        <button className="logout-btn" onClick={logout} title="Sign out" aria-label="Sign out">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" /><path d="M18 16l4-4-4-4" /><path d="M22 12H10" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
