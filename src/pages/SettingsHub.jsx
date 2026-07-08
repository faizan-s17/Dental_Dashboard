import { useState } from 'react'
import ClinicSettings from './ClinicSettings'
import OpeningHours from './OpeningHours'
import AutomationHealth from './AutomationHealth'

const TABS = [
  { id: 'info',       label: 'Clinic Info' },
  { id: 'hours',      label: 'Opening Hours' },
  { id: 'automation', label: 'Automation' },
]

export default function SettingsHub({ isAdmin }) {
  const [tab, setTab] = useState('info')
  return (
    <>
      <div className="topbar">
        <h1>Settings</h1>
        <div className="topbar-sub">Clinic info · opening hours · automation health</div>
      </div>
      <div className="sub-nav">
        {TABS.map(t => (
          <button key={t.id} className={`sub-nav-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="embedded-page">
        {tab === 'info'       && <ClinicSettings isAdmin={isAdmin} />}
        {tab === 'hours'      && <OpeningHours   isAdmin={isAdmin} />}
        {tab === 'automation' && <AutomationHealth />}
      </div>
    </>
  )
}
