// Ikon SVG inline bergaya garis (line/stroke), memakai currentColor.
// Semua ikon berukuran viewBox 24×24, diekspor sebagai komponen React.

const I = (props, d) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {d}
  </svg>
);

export const IconSoundOn = (p) =>
  I(p, <>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </>);

export const IconSoundOff = (p) =>
  I(p, <>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </>);

export const IconRain = (p) =>
  I(p, <>
    <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
    <line x1="8" y1="16" x2="8" y2="20" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="16" y1="16" x2="16" y2="20" />
  </>);

export const IconSun = (p) =>
  I(p, <>
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </>);

export const IconHint = (p) =>
  I(p, <>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="12" />
    <line x1="11" y1="14" x2="11.01" y2="14" strokeWidth="3" />
  </>);

export const IconPause = (p) =>
  I(p, <>
    <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
    <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
  </>);

export const IconMap = (p) =>
  I(p, <>
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </>);

export const IconDialog = (p) =>
  I(p, <>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </>);

export const IconEvidence = (p) =>
  I(p, <>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </>);

export const IconNotebook = (p) =>
  I(p, <>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </>);

export const IconBoard = (p) =>
  I(p, <>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="15.5" r="1.5" fill="currentColor" stroke="none" />
    <line x1="9.5" y1="9.5" x2="11" y2="14" />
    <line x1="14.5" y1="9.5" x2="13" y2="14" />
  </>);

export const IconMagnify = (p) =>
  I(p, <>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </>);

export const IconLock = (p) =>
  I(p, <>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </>);

export const IconArrowLeft = (p) =>
  I(p, <>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </>);

export const IconArrowRight = (p) =>
  I(p, <>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </>);

export const IconClose = (p) =>
  I(p, <>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </>);

export const IconTimer = (p) =>
  I(p, <>
    <circle cx="12" cy="13" r="8" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="13" x2="15" y2="15" />
    <line x1="12" y1="1" x2="12" y2="4" />
    <line x1="9" y1="1" x2="15" y2="1" />
  </>);

export const IconAlert = (p) =>
  I(p, <>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3" />
  </>);

export const IconAsk = (p) =>
  I(p, <>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3" />
  </>);

export const IconSympathy = (p) =>
  I(p, <>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </>);

export const IconPressure = (p) =>
  I(p, <>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </>);

export const IconLink = (p) =>
  I(p, <>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </>);

export const IconCheck = (p) =>
  I(p, <>
    <polyline points="20 6 9 17 4 12" />
  </>);

export const IconSwap = (p) =>
  I(p, <>
    <polyline points="7 4 3 8 7 12" />
    <line x1="3" y1="8" x2="21" y2="8" />
    <polyline points="17 12 21 16 17 20" />
    <line x1="21" y1="16" x2="3" y2="16" />
  </>);
