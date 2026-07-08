import { useState } from 'react'
import Dentists from './Dentists'
import Services from './Services'

const TABS = [
  { id: 'dentists', label: 'Dentists' },
  { id: 'services', label: 'Services & Prices' },
]

export default function ClinicHub({ isAdmin }) {
  const [tab, setTab] = useState('dentists')
  return (
    <>
      <div className="topbar">
        <h1>Clinic</h1>
        <div className="topbar-sub">Dentist team · services and pricing</div>
      </div>
      <div className="sub-nav">
        {TABS.map(t => (
          <button key={t.id} className={`sub-nav-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="embedded-page">
        {tab === 'dentists' && <Dentists isAdmin={isAdmin} />}
        {tab === 'services' && <Services isAdmin={isAdmin} />}
      </div>
    </>
  )
}
