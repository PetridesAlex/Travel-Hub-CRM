export default function Table({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No records found.',
  getRowClassName,
  variant = 'default',
  caption,
  captionCount,
  headerTone = 'light',
}) {
  const isPremium = variant === 'premium'
  const isLightHeader = isPremium && headerTone === 'light'

  if (!data?.length) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 px-6 py-12 text-center shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
        <p className="text-sm font-medium text-slate-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={`relative max-w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_-20px_rgba(15,23,42,0.2)] ${isPremium ? 'ring-1 ring-teal-100/50' : ''}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-px bg-gradient-to-r from-transparent via-teal-400/60 to-transparent" />

      {isPremium && (caption || captionCount != null) && (
        <div
          className={
            isLightHeader
              ? 'relative flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 bg-gradient-to-r from-teal-50/90 via-white to-violet-50/90 px-4 py-3.5 sm:px-5'
              : 'relative flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-gradient-to-r from-teal-700 via-teal-800 to-violet-800 px-4 py-3.5 sm:px-5'
          }
        >
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-teal-400 via-violet-400 to-rose-400 opacity-80" />
          {caption && (
            <p className={`text-sm font-bold tracking-tight ${isLightHeader ? 'text-slate-800' : 'text-white'}`}>
              {caption}
            </p>
          )}
          {captionCount != null && (
            <span
              className={
                isLightHeader
                  ? 'rounded-full border border-teal-200/80 bg-white px-3 py-1 text-xs font-bold tabular-nums text-teal-800 shadow-sm'
                  : 'rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-bold tabular-nums text-white'
              }
            >
              {captionCount}
            </span>
          )}
        </div>
      )}

      <div className="-mx-px max-w-full overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-0">
          <thead className={isPremium ? 'sticky top-0 z-20' : undefined}>
            <tr
              className={
                isPremium
                  ? isLightHeader
                    ? 'border-b-2 border-teal-300/80 bg-gradient-to-r from-white via-teal-50/50 to-violet-50/40 shadow-sm'
                    : 'border-b border-teal-600/30 bg-gradient-to-r from-teal-700 via-teal-800 to-violet-800 shadow-md shadow-teal-900/15'
                  : 'border-b border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-100/80'
              }
            >
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={
                    col.headerClassName
                    || (isPremium
                      ? 'border-r border-slate-200/60 px-3 py-4 text-left last:border-r-0 sm:px-4 sm:py-4 lg:px-5'
                      : 'px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:px-5 sm:py-3.5')
                  }
                >
                  {col.headerRender ? col.headerRender() : (
                    isPremium ? (
                      <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-700">{col.label}</span>
                    ) : col.label
                  )}
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
                      ? 'border-b border-slate-100/90 last:border-b-0 odd:bg-slate-50/30 hover:bg-gradient-to-r hover:from-teal-50/50 hover:via-white hover:to-violet-50/40'
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
