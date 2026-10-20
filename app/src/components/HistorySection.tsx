// Verloop van één sensor over een gekozen periode: grafiek met comfortzone en samenvatting
// (min/gem/max en hoe lang de waarde binnen de comfortzone bleef).
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
import { useReadingHistory } from '../grpc/useReadingHistory.js';
import { HistoryChart } from './HistoryChart.js';

const BUCKET_COUNT = 30;
const MINUTE_MS = 60 * 1000;

type Period = { label: string; windowMs: number };

const TEN_MINUTES: Period = { label: '10 min', windowMs: 10 * MINUTE_MS };
const ONE_HOUR: Period = { label: '1 uur', windowMs: 60 * MINUTE_MS };
const PERIODS: Period[] = [TEN_MINUTES, ONE_HOUR];

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
};

type ChipProps = {
  label: string;
  isSelected: boolean;
  onPress: () => void;
};

function Chip({ label, isSelected, onPress }: ChipProps) {
  return (
    <view
      className={isSelected ? 'Chip Chip--selected' : 'Chip'}
      bindtap={onPress}
    >
      <text
        className={isSelected ? 'Chip-text Chip-text--selected' : 'Chip-text'}
      >
        {label}
      </text>
    </view>
  );
}

function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)} %`;
}

export function HistorySection({
  roomId,
  liveReading,
  thresholds,
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
