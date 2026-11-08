const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export const CalendarIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
    <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    <path d="m9 15 2 2 4-4" />
  </svg>
);
export const ClockIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.2 2" />
  </svg>
);
export const PinIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);
export const TicketIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M3 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v1.5A1.5 1.5 0 0 0 4.5 19h15a1.5 1.5 0 0 0 1.5-1.5V16a2 2 0 0 1 0-4v0a2 2 0 0 0 0-4V6.5A1.5 1.5 0 0 0 19.5 5h-15A1.5 1.5 0 0 0 3 6.5Z" />
    <path d="M14 5v2M14 11v2M14 17v2" />
  </svg>
);
export const PhoneIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
  </svg>
);
export const MailIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m3.5 7 8.5 6 8.5-6" />
  </svg>
);
export const DumbbellIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
  </svg>
);
export const TargetIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" />
  </svg>
);
export const BoltIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M13 2 4.5 13.5H11L10 22l9-12h-6.5Z" />
  </svg>
);
export const MountainIcon = (p) => (
  <svg {...base} {...p}>
    <path d="m2.5 19 6.5-11 4 6.5 2.5-3.5 6 8Z" />
    <path d="m7.2 11.5 1.8 1.5 1.8-1.5" />
  </svg>
);
export const CheckIcon = (p) => (
  <svg {...base} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
export const DownloadIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M4 20h16" />
  </svg>
);
export const LockIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </svg>
);
