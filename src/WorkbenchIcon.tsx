export function WorkbenchIcon({
  name,
}: {
  name:
    | "browse"
    | "select"
    | "pen"
    | "undo"
    | "redo"
    | "clear"
    | "grip"
    | "text"
    | "heading"
    | "image"
    | "card"
    | "button"
    | "check"
    | "search";
}) {
  const paths = {
    text: <path d="M4 5h16M4 10h16M4 15h11M4 20h8" />,
    heading: <path d="M5 4v16M19 4v16M5 12h14" />,
    image: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8" cy="9" r="1.5" />
        <path d="m3 17 5-5 4 4 4-6 5 7" />
      </>
    ),
    card: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M7 9h10M7 13h7M7 17h5" />
      </>
    ),
    button: (
      <>
        <rect x="2" y="6" width="20" height="12" rx="3" />
        <path d="M7 12h10m-3-3 3 3-3 3" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    search: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 5 5" />
      </>
    ),
    browse: <path d="m6 3 12 9-7 1-3 7Z" />,
    select: (
      <>
        <rect x="4" y="4" width="16" height="16" strokeDasharray="3 2" />
        <path d="M9 9h6v6H9z" />
      </>
    ),
    pen: <path d="m4 20 4-1L20 7l-3-3L5 16Zm10-13 3 3" />,
    undo: <path d="m9 5-5 5 5 5M4 10h9a6 6 0 0 1 6 6v3" />,
    redo: <path d="m15 5 5 5-5 5m5-5h-9a6 6 0 0 0-6 6v3" />,
    clear: (
      <>
        <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" />
        <path d="M10 10v7m4-7v7" />
      </>
    ),
    grip: (
      <>
        {[7, 12, 17].flatMap((y) =>
          [9, 15].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1" />),
        )}
      </>
    ),
  };
  return (
    <svg
      className="workbench-icon"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
