export function WorkbenchIcon({
  name,
}: {
  name: "browse" | "select" | "pen" | "undo" | "redo" | "clear" | "grip";
}) {
  const paths = {
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
