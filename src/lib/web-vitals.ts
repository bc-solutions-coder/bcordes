import type { Metric } from 'web-vitals'

function sendMetric(metric: Metric) {
  if (import.meta.env.DEV) {
    console.debug('[web-vitals]', metric.name, metric.value.toFixed(1), metric)
    return
  }

  // Production: beacon to your analytics endpoint when ready
  // navigator.sendBeacon('/api/vitals', JSON.stringify(metric))
}

export function reportWebVitals() {
  import('web-vitals').then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
    onCLS(sendMetric)
    onFCP(sendMetric)
    onINP(sendMetric)
    onLCP(sendMetric)
    onTTFB(sendMetric)
  })
}
