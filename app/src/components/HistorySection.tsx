// Verloop van één sensor over een gekozen periode: grafiek met comfortzone en alarmmomenten,
// samenvatting (min/gem/max) en een inzichtzin ("Afgelopen uur 12 min te warm").
// Loopt live mee met de metingen uit WatchRoom.
import { useState } from '@lynx-js/react';

import type {
  Reading,
  Threshold,
} from '../generated/restwell/v1/restwell_pb.js';
import {
  CHART_METRICS,
  bucketReadings,
  summarize,
  type ChartMetric,
} from '../format/history.js';
import {
  MISSING_VALUE,
  formatHumidity,
  formatLight,
  formatTemperature,
  formatTime,
} from '../format/measurements.js';
import {
  formatRange,
  fractionInside,
  thresholdFor,
} from '../format/thresholds.js';
import { alarmFlags, insightSentence } from '../format/insights.js';
import { useAlarmHistory } from '../grpc/useAlarmHistory.js';
import { useReadingHistory } from '../grpc/useReadingHistory.js';
import { Chip } from './Chip.js';
import { HistoryChart } from './HistoryChart.js';

const BUCKET_COUNT = 30;
const MINUTE_MS = 60 * 1000;

const HOUR_MS = 60 * MINUTE_MS;

// `since` staat voor de inzichtzin, bv. "Afgelopen uur 12 min te warm".
type Period = { label: string; since: string; windowMs: number };

const TEN_MINUTES: Period = {
  label: '10 min',
  since: 'Afgelopen 10 min',
  windowMs: 10 * MINUTE_MS,
};
const PERIODS: Period[] = [
  TEN_MINUTES,
  { label: '1 uur', since: 'Afgelopen uur', windowMs: HOUR_MS },
  { label: '6 uur', since: 'Afgelopen 6 uur', windowMs: 6 * HOUR_MS },
  { label: '24 uur', since: 'Afgelopen 24 uur', windowMs: 24 * HOUR_MS },
];

const METRIC_LABELS: Record<ChartMetric, string> = {
  temperature: 'Temperatuur',
  humidity: 'Vochtigheid',
  light: 'Licht',
};

const METRIC_FORMATTERS: Record<ChartMetric, (value: number) => string> = {
  temperature: formatTemperature,
  humidity: formatHumidity,
  light: (value) => formatLight(Math.round(value)),
};

type HistorySectionProps = {
  roomId: string;
  liveReading?: Reading;
  thresholds: Threshold[];
  /** Verandert bij elke alarmwijziging uit de live-stroom (zie alarmHistoryKey). */
  alarmRefreshKey: string;
};

function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)} %`;
}

export function HistorySection({
  roomId,
  liveReading,
  thresholds,
  alarmRefreshKey,
}: HistorySectionProps) {
  const [metric, setMetric] = useState<ChartMetric>('temperature');
  const [period, setPeriod] = useState<Period>(TEN_MINUTES);
  const history = useReadingHistory(roomId, period.windowMs, liveReading);

  // De grafiek eindigt bij de laatste meting, zodat ze meeschuift met de live data.
  const toMs = history.endMs;
  const fromMs = toMs - period.windowMs;
  const buckets = bucketReadings(
    history.readings,
    metric,
    fromMs,
    toMs,
    BUCKET_COUNT,
  );
  const summary = summarize(history.readings, metric);
  const threshold = thresholdFor(thresholds, metric);
  const inside = fractionInside(history.readings, metric, threshold);
  const alarmHistory = useAlarmHistory(
    roomId,
    period.windowMs,
    alarmRefreshKey,
  );
  const flags = alarmFlags(
    buckets,
    period.windowMs / BUCKET_COUNT,
    alarmHistory.alarms,
    metric,
    toMs,
  );
  const insight = insightSentence(
    metric,
    period.since,
    history.readings,
    threshold,
  );
  const format = METRIC_FORMATTERS[metric];
  const show = (value?: number) =>
    value === undefined ? MISSING_VALUE : format(value);

  return (
    <view className="Card">
      <view className="ChipRow">
        {CHART_METRICS.map((option) => (
          <Chip
            key={option}
            label={METRIC_LABELS[option]}
            isSelected={option === metric}
            onPress={() => setMetric(option)}
          />
        ))}
      </view>
      <view className="ChipRow">
        {PERIODS.map((option) => (
          <Chip
            key={option.label}
            label={option.label}
            isSelected={option.windowMs === period.windowMs}
            onPress={() => setPeriod(option)}
          />
        ))}
      </view>

      {history.status === 'loading' && (
        <text className="InfoText">Verloop laden…</text>
      )}
      {history.status === 'error' && (
        <text className="ErrorText">{history.error}</text>
      )}
      {history.status === 'ready' && (
        <HistoryChart
          buckets={buckets}
          fromMs={fromMs}
          toMs={toMs}
          formatValue={format}
          threshold={threshold}
          alarmFlags={flags}
        />
      )}

      <view className="SummaryRow">
        <view className="Summary">
          <text className="Summary-label">Min</text>
          <text className="Summary-value">{show(summary.min)}</text>
        </view>
        <view className="Summary">
          <text className="Summary-label">Gemiddeld</text>
          <text className="Summary-value">{show(summary.average)}</text>
        </view>
        <view className="Summary">
          <text className="Summary-label">Max</text>
          <text className="Summary-value">{show(summary.max)}</text>
        </view>
      </view>
      {flags.some(Boolean) && (
        <text className="InfoText">
          Rode strook onder de grafiek: alarm actief.
        </text>
      )}
      {insight !== undefined && <text className="Insight">{insight}</text>}
      {threshold && inside !== undefined && (
        <text className="InfoText">
          {`${formatPercent(inside)} van de tijd binnen de comfortzone (${formatRange(threshold, format) ?? ''})`}
        </text>
      )}
      <text className="InfoText">
        {summary.count} metingen sinds {formatTime(BigInt(Math.round(fromMs)))}
      </text>
    </view>
  );
}
