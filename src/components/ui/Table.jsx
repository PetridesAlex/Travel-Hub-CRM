export default function Table({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No records found.',
  getRowClassName,
  variant = 'default',
}) {
  const isPremium = variant === 'premium'

  if (!data?.length) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 px-6 py-12 text-center shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
        <p className="text-sm font-medium text-slate-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={`relative max-w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_-20px_rgba(15,23,42,0.25)] ${isPremium ? 'ring-1 ring-slate-900/[0.04]' : ''}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />
      {isPremium && (
        <div className="pointer-events-none absolute inset-x-0 top-[53px] z-10 h-px bg-gradient-to-r from-teal-500/30 via-violet-500/30 to-rose-500/30 sm:top-[57px]" />
      )}
      <div className="-mx-px max-w-full overflow-x-auto">
        <table className="w-full min-w-0 border-separate border-spacing-0">
          <thead className={isPremium ? 'sticky top-0 z-20' : undefined}>
            <tr className={
              isPremium
                ? 'bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 shadow-lg shadow-slate-900/20'
                : 'border-b border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-100/80'
            }>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={
                    col.headerClassName
                    || (isPremium
                      ? 'border-r border-white/[0.06] px-3 py-3 text-left last:border-r-0 first:rounded-tl-2xl last:rounded-tr-2xl sm:px-4 sm:py-4 lg:px-5'
                      : 'px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:px-5 sm:py-3.5')
                  }
                >
                  {col.headerRender ? col.headerRender() : col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={isPremium ? 'bg-white' : 'divide-y divide-slate-100/90 bg-white'}>
            {data.map((row, index) => {
              const rowClass = getRowClassName?.(row, index) || ''
              return (
                <tr
                  key={row.id ?? index}
                  onClick={() => onRowClick?.(row)}
                  className={`group transition-all duration-200 ${
                    isPremium
                      ? 'border-b border-slate-100/90 last:border-b-0 odd:bg-slate-50/20 hover:bg-gradient-to-r hover:from-teal-50/40 hover:via-white hover:to-violet-50/30'
                      : ''
                  } ${
                    onRowClick
                      ? 'cursor-pointer hover:bg-gradient-to-r hover:from-teal-50/60 hover:to-transparent'
                      : ''
                  } ${rowClass}`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={col.cellClassName || (isPremium ? 'px-3 py-3 align-middle text-sm text-slate-700 sm:px-4 sm:py-4 lg:px-5' : 'px-3 py-4 text-sm text-slate-700 sm:px-5')}
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
