// Eenvoudige staafgrafiek met gewone views: Lynx heeft geen grafiekbibliotheek.
// Elke staaf is het gemiddelde van één tijdvak; een leeg tijdvak blijft open.
import type { Bucket } from '../format/history.js';
import { formatTime } from '../format/measurements.js';

const CHART_HEIGHT_PX = 120;
const MIN_BAR_HEIGHT_PX = 4;

type HistoryChartProps = {
  buckets: Bucket[];
  fromMs: number;
  toMs: number;
  formatValue: (value: number) => string;
};

function valueRange(
  buckets: Bucket[],
): { min: number; max: number } | undefined {
  const values = buckets
    .map((bucket) => bucket.value)
    .filter((value): value is number => value !== undefined);
  if (values.length === 0) return undefined;
  return { min: Math.min(...values), max: Math.max(...values) };
}

// De laagste waarde krijgt een klein staafje, de hoogste de volle hoogte. Zo zie je ook
// kleine schommelingen; de echte waarden staan in de labels links.
function barHeightPx(value: number, min: number, max: number): number {
  if (max === min) return CHART_HEIGHT_PX / 2;
  const fraction = (value - min) / (max - min);
  return MIN_BAR_HEIGHT_PX + fraction * (CHART_HEIGHT_PX - MIN_BAR_HEIGHT_PX);
}

export function HistoryChart({
  buckets,
  fromMs,
  toMs,
  formatValue,
}: HistoryChartProps) {
  const range = valueRange(buckets);
  if (!range) {
    return <text className="InfoText">Nog geen metingen in deze periode.</text>;
  }

  return (
    <view className="Chart">
      <view className="Chart-body">
        <view className="Chart-axis">
          <text className="Chart-label">{formatValue(range.max)}</text>
          <text className="Chart-label">{formatValue(range.min)}</text>
        </view>
        <view className="Chart-bars" style={{ height: `${CHART_HEIGHT_PX}px` }}>
          {buckets.map((bucket) => (
            <view key={bucket.startMs} className="Chart-slot">
              {bucket.value !== undefined && (
                <view
                  className="Chart-bar"
                  style={{
                    height: `${barHeightPx(bucket.value, range.min, range.max)}px`,
                  }}
                />
              )}
            </view>
          ))}
        </view>
      </view>
      <view className="Chart-times">
        <text className="Chart-label">
          {formatTime(BigInt(Math.round(fromMs)))}
        </text>
        <text className="Chart-label">
          {formatTime(BigInt(Math.round(toMs)))}
        </text>
      </view>
    </view>
  );
}
