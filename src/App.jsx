import { useEffect, useLayoutEffect, useState } from 'react'
import { supabase } from './supabase'
import { ToothMark } from './components/Icon'
import { ToastContainer } from './components/Toast'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Overview from './pages/Overview'
import Calendar from './pages/Calendar'
import PatientsHub from './pages/PatientsHub'
import ClinicHub from './pages/ClinicHub'
import SettingsHub from './pages/SettingsHub'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [profState, setProfState] = useState('loading') // loading | found | not_found
  const [page, setPage] = useState('overview')
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggleTheme() { setTheme(t => t === 'dark' ? 'light' : 'dark') }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session === undefined) return
    if (!session?.user) { setProfile(null); setProfState('loading'); return }

    async function loadProfile() {
      const user = session.user
      let { data } = await supabase.from('dental_dentists').select('*').eq('email', user.email).single()

      if (data) {
        if (!data.user_id) {
          await supabase.from('dental_dentists').update({ user_id: user.id }).eq('id', data.id)
          data = { ...data, user_id: user.id }
        }
        setProfile(data)
        setProfState('found')
      } else {
        setProfState('not_found')
      }
    }
    loadProfile()
  }, [session])

  // ── Loading splash ──
  if (session === undefined || (session && profState === 'loading')) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <div className="brand-mark" style={{ width: 52, height: 52, fontSize: 26, borderRadius: 13 }}><ToothMark size={28} /></div>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</span>
      </div>
    )
  }

  // ── Not logged in ──
  if (!session) return <><Login /><ToastContainer /></>

  // ── No dentist profile found ──
  if (profState === 'not_found') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center', padding: 24 }}>
        <div className="brand-mark" style={{ width: 56, height: 56, fontSize: 28, borderRadius: 14 }}><ToothMark size={30} /></div>
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Access not set up</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 340 }}>
            Your account (<strong style={{ color: 'var(--text)' }}>{session.user.email}</strong>) isn't linked to a staff profile yet. Ask the admin to add your email in the Dentists section.
          </p>
        </div>
        <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    )
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="layout">
      <Sidebar page={page} setPage={setPage} profile={profile} theme={theme} toggleTheme={toggleTheme} />
      <main className="main">
        {page === 'overview'  && <Overview    profile={profile} />}
        {page === 'calendar'  && <Calendar    profile={profile} />}
        {page === 'patients'  && <PatientsHub profile={profile} />}
        {page === 'clinic'    && <ClinicHub   isAdmin={isAdmin} />}
        {page === 'settings'  && <SettingsHub isAdmin={isAdmin} />}
      </main>
      <ToastContainer />
    </div>
  )
}
