// De vaste balk onderaan de app om tussen Home, Drempels en Alarmen te wisselen.
export type Tab = 'home' | 'thresholds' | 'alarms';

const TABS: { tab: Tab; label: string }[] = [
  { tab: 'home', label: 'Home' },
  { tab: 'thresholds', label: 'Drempels' },
  { tab: 'alarms', label: 'Alarmen' },
];

type TabBarProps = {
  selected: Tab;
  onSelect: (tab: Tab) => void;
};

export function TabBar({ selected, onSelect }: TabBarProps) {
  return (
    <view className="TabBar">
      {TABS.map(({ tab, label }) => (
        <view key={tab} className="TabBar-item" bindtap={() => onSelect(tab)}>
          <text
            className={
              tab === selected
                ? 'TabBar-text TabBar-text--selected'
                : 'TabBar-text'
            }
          >
            {label}
          </text>
        </view>
      ))}
    </view>
  );
}
