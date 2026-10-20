type MeasurementRowProps = {
  label: string;
  value: string;
  /** Comfortzone, bv. `18,0 °C – 24,0 °C`. */
  range?: string;
  isOutside?: boolean;
};

export function MeasurementRow({
  label,
  value,
  range,
  isOutside = false,
}: MeasurementRowProps) {
  return (
    <view className="MeasurementRow">
      <view className="MeasurementRow-text">
        <text className="MeasurementRow-label">{label}</text>
        {range !== undefined && (
          <text className="MeasurementRow-range">Comfort: {range}</text>
        )}
      </view>
      <text
        className={
          isOutside
            ? 'MeasurementRow-value MeasurementRow-value--outside'
            : 'MeasurementRow-value'
        }
      >
        {value}
      </text>
    </view>
  );
}
