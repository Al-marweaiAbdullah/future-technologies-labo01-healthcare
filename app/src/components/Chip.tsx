// Een keuzeknop in een rij (periode, sensor). De gekozen knop is blauw.
type ChipProps = {
  label: string;
  isSelected: boolean;
  onPress: () => void;
};

export function Chip({ label, isSelected, onPress }: ChipProps) {
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
