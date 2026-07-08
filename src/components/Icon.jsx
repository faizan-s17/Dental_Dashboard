// Shared inline line-icon set (stroke = currentColor, so icons inherit text color)
const PATHS = {
  calendar:  <><rect x="3.5" y="4.5" width="17" height="16" rx="2" /><path d="M8 3v3M16 3v3M3.5 9h17" /></>,
  clipboard: <><rect x="5" y="5" width="14" height="15" rx="2" /><rect x="9" y="3" width="6" height="3.5" rx="1" /><path d="M8.5 11h7M8.5 14.5h4" /></>,
  pin:       <><path d="M12 21s6.5-5.5 6.5-10a6.5 6.5 0 0 0-13 0c0 4.5 6.5 10 6.5 10z" /><circle cx="12" cy="11" r="2.3" /></>,
  shield:    <><path d="M12 3l7 3v5.5c0 4.2-3 6.9-7 8-4-1.1-7-3.8-7-8V6z" /><path d="M9 12l2.2 2.2L15.5 10" /></>,
  tag:       <><path d="M20.6 13.4 12 22l-9-9V4a1 1 0 0 1 1-1h9z" /><circle cx="7.5" cy="7.5" r="1.4" /></>,
  key:       <><circle cx="8" cy="15" r="4" /><path d="M10.8 12.2 20 3" /><path d="M16 7l3 3M14.5 8.5l2.5 2.5" /></>,
  user:      <><circle cx="12" cy="8.5" r="3.7" /><path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" /></>,
  phone:     <path d="M21 16.5v2.6a1.8 1.8 0 0 1-2 1.8 17.8 17.8 0 0 1-7.7-2.8 17.4 17.4 0 0 1-5.4-5.4A17.8 17.8 0 0 1 3.1 5a1.8 1.8 0 0 1 1.8-2h2.6a1.8 1.8 0 0 1 1.8 1.5c.1.8.3 1.6.6 2.3a1.8 1.8 0 0 1-.4 1.9l-1.1 1.1a14.4 14.4 0 0 0 5.4 5.4l1.1-1.1a1.8 1.8 0 0 1 1.9-.4c.7.3 1.5.5 2.3.6a1.8 1.8 0 0 1 1.5 1.8z" />,
  chat:      <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />,
  activity:  <path d="M3 12h4l2.5 7 5-14 2.5 7H21" />,
  inbox:     <><path d="M4 13h4l1.5 2.5h5L16 13h4" /><path d="M6 5h12l3 8v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5z" /></>,
  trash:     <><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M6.5 7l1 12.5a1 1 0 0 0 1 .9h7a1 1 0 0 0 1-.9L18.5 7" /></>,
  refresh:   <><path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1" /><path d="M20.5 4v4.5H16" /></>,
  bell:      <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" /><path d="M10.5 20a1.5 1.5 0 0 0 3 0" /></>,
  alert:     <><path d="M12 4 3 20h18z" /><path d="M12 10v4M12 17.4v.1" /></>,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="M8.3 12.4l2.6 2.6 4.7-5.2" /></>,
  xCircle:   <><circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" /></>,
  swap:      <><path d="M4 8h13l-3.2-3.2M20 16H7l3.2 3.2" /></>,
  moon:      <path d="M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5z" />,
  check:     <path d="M5 12.5l4.5 4.5L19 6.5" />,
  loader:    <><circle cx="12" cy="12" r="8" opacity="0.25" /><path d="M20 12a8 8 0 0 0-8-8" /></>,
  chevronLeft:  <path d="M15 6l-6 6 6 6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
}

export default function Icon({ name, size = 16, className = '', style, strokeWidth = 1.7 }) {
  const children = PATHS[name]
  if (!children) return null
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0, verticalAlign: '-0.18em', ...style }}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

// White tooth mark used on the teal brand square
export const ToothMark = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
    <path d="M12 2.4c-1.6 0-2.4.9-3.9.9C6.2 3.3 4 4.6 4 7.9c0 2.6.9 4.3 1.5 7.1.5 2.3.5 5 1.9 5 1.2 0 1.2-1.9 1.7-4 .3-1.3.5-2.2 1.9-2.2s1.6.9 1.9 2.2c.5 2.1.5 4 1.7 4 1.4 0 1.4-2.7 1.9-5 .6-2.8 1.5-4.5 1.5-7.1 0-3.3-2.2-4.6-4.1-4.6-1.5 0-2.3-.9-3.9-.9z" />
  </svg>
)
