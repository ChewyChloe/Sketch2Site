// 桌面／手機 switch for previews: always on the toolbar, never hidden in a menu.
export function DeviceToggle({ mobile, onChange, className = "" }: { mobile: boolean; onChange: (mobile: boolean) => void; className?: string }) {
  return (
    <div className={"device-toggle " + className} role="group" aria-label="預覽寬度">
      <button type="button" aria-pressed={!mobile} onClick={() => onChange(false)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M9 20h6M12 16v4" /></svg>
        桌面
      </button>
      <button type="button" aria-pressed={mobile} onClick={() => onChange(true)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></svg>
        手機
      </button>
    </div>
  );
}
