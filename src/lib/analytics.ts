// Simple analytics facade. Replace with your provider (GA4, PostHog, etc.)
export type AnalyticsEvent =
  | { name: 'filters_open'; source: 'desktop' | 'mobile' }
  | { name: 'filters_apply'; payload?: Record<string, any> }
  | { name: 'filters_clear' }
  | { name: 'sort_change'; value: string }
  | { name: 'pagination_change'; page: number }
  | { name: 'card_click'; id: string };

export function track(ev: AnalyticsEvent) {
  try {
    // Hook your analytics provider here
    // Example: window.gtag?.('event', ev.name, ev as any);
    window.dispatchEvent(new CustomEvent('analytics', { detail: ev }));
  } catch {}
}
