import type { Metric } from '@/lib/content'

export function MetricCard({ metric }: { readonly metric: Metric }) {
  return (
    <li className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {metric.achievement}
        {metric.method ? (
          <span className="block text-xs text-slate-500">vía {metric.method}</span>
        ) : null}
      </p>
      <p className="mt-1 text-lg font-semibold text-accent-700 dark:text-accent-500">
        {metric.metric}
      </p>
    </li>
  )
}

export function MetricList({ metrics }: { readonly metrics: readonly Metric[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {metrics.map((metric) => (
        <MetricCard key={`${metric.achievement}-${metric.metric}`} metric={metric} />
      ))}
    </ul>
  )
}
