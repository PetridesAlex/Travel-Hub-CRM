export default function FormAnalyticsCharts({ analytics }) {
  if (!analytics) return null

  const maxTrend = Math.max(...(analytics.trends?.map((t) => t.count) || [1]), 1)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Sent', value: analytics.sent },
          { label: 'Responses', value: analytics.totalResponses },
          { label: 'Completion rate', value: `${analytics.completionRate}%` },
          { label: 'Avg rating', value: analytics.avgRating ?? '—' },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      {analytics.npsScore != null && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">NPS Score</p>
          <p className="mt-2 text-3xl font-bold text-teal-700">{analytics.npsScore}</p>
        </div>
      )}

      {analytics.trends?.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Responses over time</h3>
          <div className="flex items-end gap-2 h-40">
            {analytics.trends.map((t) => (
              <div key={t.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-teal-500 to-cyan-400"
                  style={{ height: `${(t.count / maxTrend) * 100}%`, minHeight: t.count ? '4px' : 0 }}
                  title={`${t.count} on ${t.date}`}
                />
                <span className="text-[10px] text-slate-400 rotate-0 truncate w-full text-center">
                  {t.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
