import { useState } from 'react'
import Patients from './Patients'
import CallLogs from './CallLogs'

const TABS = [
  { id: 'patients', label: 'Patients' },
  { id: 'calls',    label: 'AI Call Logs' },
]

export default function PatientsHub({ profile }) {
  const [tab, setTab] = useState('patients')
  return (
    <>
      <div className="topbar">
        <h1>Patients</h1>
        <div className="topbar-sub">Patient records · AI call logs</div>
      </div>
      <div className="sub-nav">
        {TABS.map(t => (
          <button key={t.id} className={`sub-nav-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="embedded-page">
        {tab === 'patients' && <Patients profile={profile} />}
        {tab === 'calls'    && <CallLogs />}
      </div>
    </>
  )
}
