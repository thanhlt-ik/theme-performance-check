const SETTINGS_ROWS = [
  { label: 'Notification preferences', desc: 'Cảnh báo khi điểm số giảm dưới ngưỡng' },
  { label: 'API keys', desc: 'Quản lý key PageSpeed Insights API' },
  { label: 'Team members', desc: 'Phân quyền truy cập dashboard' },
  { label: 'Theme defaults', desc: 'Đặt light/dark mode mặc định cho team' },
];

export default function SettingsPage() {
  return (
    <div className="flex-1 p-4 pt-6 sm:p-8 sm:pt-6 max-w-[640px]">
      <h2 className="text-xl font-bold text-foreground">Settings</h2>
      <p className="mt-1 mb-6 text-[13px] text-muted-foreground">
        Trang này chưa có chức năng — các mục dưới đây sắp ra mắt.
      </p>

      <div className="flex flex-col gap-px rounded-[10px] border border-border overflow-hidden">
        {SETTINGS_ROWS.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 bg-card px-4 py-3.5 opacity-55"
          >
            <div>
              <div className="text-[13px] font-semibold text-foreground">{row.label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{row.desc}</div>
            </div>
            <div className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-faint">
              Sắp có
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
