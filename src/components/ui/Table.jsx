export default function Table({ columns, data, onRowClick, emptyMessage = 'No records found.' }) {
  if (!data?.length) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 px-6 py-12 text-center shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
        <p className="text-sm font-medium text-slate-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_-20px_rgba(15,23,42,0.25)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-100/80">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/90 bg-white">
            {data.map((row, index) => (
              <tr
                key={row.id ?? index}
                onClick={() => onRowClick?.(row)}
                className={`group transition-colors duration-150 ${
                  onRowClick
                    ? 'cursor-pointer hover:bg-gradient-to-r hover:from-teal-50/60 hover:to-transparent'
                    : ''
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-5 py-4 text-sm text-slate-700">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
