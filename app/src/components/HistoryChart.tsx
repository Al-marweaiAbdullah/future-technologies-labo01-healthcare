// Eenvoudige staafgrafiek met gewone views: Lynx heeft geen grafiekbibliotheek.
// Elke staaf is het gemiddelde van één tijdvak; een leeg tijdvak blijft open.
// Met een drempel toont de grafiek de comfortzone als lijnen, en staven erbuiten in het rood.
import type { Threshold } from '../generated/restwell/v1/restwell_pb.js';
import type { Bucket } from '../format/history.js';
import { formatTime } from '../format/measurements.js';
import { isOutside } from '../format/thresholds.js';

const CHART_HEIGHT_PX = 120;
const MIN_BAR_HEIGHT_PX = 4;

type HistoryChartProps = {
  buckets: Bucket[];
  fromMs: number;
  toMs: number;
  formatValue: (value: number) => string;
  threshold?: Threshold;
};

type ValueRange = { min: number; max: number };

// De schaal omvat de metingen én de grenzen van de comfortzone, zodat je ziet hoe ver
// een waarde ervan af zit.
function valueRange(
  buckets: Bucket[],
  threshold?: Threshold,
): ValueRange | undefined {
  const values = buckets
    .map((bucket) => bucket.value)
    .filter((value): value is number => value !== undefined);
  if (values.length === 0) return undefined;
  const limits = [threshold?.minValue, threshold?.maxValue].filter(
    (value): value is number => value !== undefined,
  );
  const all = [...values, ...limits];
  return { min: Math.min(...all), max: Math.max(...all) };
}

// De laagste waarde krijgt een klein staafje, de hoogste de volle hoogte. Zo zie je ook
// kleine schommelingen; de echte waarden staan in de labels links.
function heightPx(value: number, range: ValueRange): number {
  if (range.max === range.min) return CHART_HEIGHT_PX / 2;
  const fraction = (value - range.min) / (range.max - range.min);
  return MIN_BAR_HEIGHT_PX + fraction * (CHART_HEIGHT_PX - MIN_BAR_HEIGHT_PX);
}

export function HistoryChart({
  buckets,
  fromMs,
  toMs,
  formatValue,
  threshold,
}: HistoryChartProps) {
  const range = valueRange(buckets, threshold);
  if (!range) {
    return <text className="InfoText">Nog geen metingen in deze periode.</text>;
  }
  const limits = [threshold?.minValue, threshold?.maxValue].filter(
    (value): value is number => value !== undefined,
  );

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
                  className={
                    isOutside(bucket.value, threshold)
                      ? 'Chart-bar Chart-bar--outside'
                      : 'Chart-bar'
                  }
                  style={{ height: `${heightPx(bucket.value, range)}px` }}
                />
              )}
            </view>
          ))}
          {limits.map((limit) => (
            <view
              key={limit}
              className="Chart-limit"
              style={{ bottom: `${heightPx(limit, range)}px` }}
            />
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
