type MeasurementRowProps = {
  label: string;
  value: string;
};

export function MeasurementRow({ label, value }: MeasurementRowProps) {
  return (
    <view className="MeasurementRow">
      <text className="MeasurementRow-label">{label}</text>
      <text className="MeasurementRow-value">{value}</text>
    </view>
  );
}
