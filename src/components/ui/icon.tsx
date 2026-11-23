import type { SVGProps } from "react";

// Paths exported from the Figma "Icon/*" components (24×24, 2px stroke). Colour follows currentColor.
const paths = {
  "chevron-right": <path d="M9 6L15 12L9 18" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />,
  "chevron-left": <path d="M15 18L9 12L15 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  search: (
    <>
      <path d="M17.5 11C17.5 14.5899 14.5899 17.5 11 17.5C7.41015 17.5 4.5 14.5899 4.5 11C4.5 7.41015 7.41015 4.5 11 4.5C14.5899 4.5 17.5 7.41015 17.5 11Z" strokeWidth="2" />
      <path d="M16 16L20 20" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  clear: (
    <>
      <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" strokeWidth="2" />
      <path d="M9.5 9.5L14.5 14.5M14.5 9.5L9.5 14.5" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  close: <path d="M6 6L18 18M18 6L6 18" strokeWidth="2" strokeLinecap="round" />,
  chart: <path d="M5 20V11M12 20V5M19 20V14" strokeWidth="2" strokeLinecap="round" />,
  grid: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" strokeWidth="2" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" strokeWidth="2" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" strokeWidth="2" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" strokeWidth="2" />
    </>
  ),
  check: <path d="M5 12.5L9.5 17L19 7.5" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />,
  alert: (
    <>
      <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" strokeWidth="2" />
      <path d="M12 7.5V13M12 16.5V16.51" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  plus: <path d="M12 5V19M5 12H19" strokeWidth="2" strokeLinecap="round" />,
  minus: <path d="M5 12H19" strokeWidth="2" strokeLinecap="round" />,
  share: (
    <path
      d="M12 4V15M16.5 8.5L12 4L7.5 8.5M5 14V18.5C5 18.8978 5.15804 19.2794 5.43934 19.5607C5.72064 19.842 6.10218 20 6.5 20H17.5C17.8978 20 18.2794 19.842 18.5607 19.5607C18.842 19.2794 19 18.8978 19 18.5V14"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  home: (
    <path
      d="M4 11L12 4L20 11V19.5C20 19.8978 19.842 20.2794 19.5607 20.5607C19.2794 20.842 18.8978 21 18.5 21H15V15H9V21H5.5C5.10218 21 4.72064 20.842 4.43934 20.5607C4.15804 20.2794 4 19.8978 4 19.5V11Z"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  ),
  wallet: (
    <>
      <rect x="3.5" y="6" width="17" height="13" rx="2.5" strokeWidth="2" />
      <path d="M16 12.5H17.5M3.5 9.5H20.5" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.5" strokeWidth="2" />
      <path
        d="M3 19.5C3.8 16.3 6.2 14.5 9 14.5C11.8 14.5 14.2 16.3 15 19.5M15.5 5.2C16.1825 5.44119 16.7734 5.88806 17.1914 6.47907C17.6094 7.07007 17.8338 7.77613 17.8338 8.5C17.8338 9.22387 17.6094 9.92993 17.1914 10.5209C16.7734 11.1119 16.1825 11.5588 15.5 11.8M18 14.8C19.4 15.6 20.4 17.2 21 19.5"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" strokeWidth="2" />
      <path d="M12 3V5.5M12 18.5V21M3 12H5.5M18.5 12H21M5.6 5.6L7.4 7.4M16.6 16.6L18.4 18.4M5.6 18.4L7.4 16.6M16.6 7.4L18.4 5.6" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  list: <path d="M9 6.5H20M9 12H20M9 17.5H20M4.5 6.5H4.51M4.5 12H4.51M4.5 17.5H4.51" strokeWidth="2.2" strokeLinecap="round" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" strokeWidth="2" />
      <path d="M3.5 10H20.5M8 3V7M16 3V7" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  ticket: (
    <path
      d="M3.5 8.5V6.5C3.5 5.67 4.17 5 5 5H19C19.83 5 20.5 5.67 20.5 6.5V8.5C18.57 8.5 17 10.07 17 12C17 13.93 18.57 15.5 20.5 15.5V17.5C20.5 18.33 19.83 19 19 19H5C4.17 19 3.5 18.33 3.5 17.5V15.5C5.43 15.5 7 13.93 7 12C7 10.07 5.43 8.5 3.5 8.5Z"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  ),
  more: (
    <g fill="currentColor" stroke="none">
      <circle cx="5.5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18.5" cy="12" r="1.6" />
    </g>
  ),
  grip: <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" strokeWidth="3" strokeLinecap="round" />,
  "arrow-up": <path d="M12 19V5M18 11l-6-6-6 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  "arrow-down": <path d="M12 5v14M18 13l-6 6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  "sign-out": (
    <path
      d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M16 8l4 4-4 4M20 12H10"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  trash: (
    <path
      d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
} as const;

export type IconName = keyof typeof paths;

type IconProps = Omit<SVGProps<SVGSVGElement>, "name"> & { name: IconName; size?: number; label?: string };

export function Icon({ name, size = 24, label, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
