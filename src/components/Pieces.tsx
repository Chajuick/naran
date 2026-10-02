// '나'를 둘러싼 네 조각 — 가치관·성격·애착·기질. 채워진 조각은 색, 아직은 회색.
// animate 이면 조각이 하나씩 그려진다 (prefers-reduced-motion 이면 CSS에서 꺼짐)
export const PIECE_COLORS = ['#3182f6', '#03a867', '#e5487f', '#f2780c'] as const;

export default function Pieces({ filled, size = 120, label = '나', animate = false, delay = 0 }: {
  filled: boolean[]; size?: number; label?: string; animate?: boolean; delay?: number;
}) {
  const r = 42, C = 2 * Math.PI * r, gap = 7, seg = C / 4 - gap;
  return (
    <svg className={`pieces ${animate ? 'animate' : ''}`} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#eef0f3" strokeWidth="11" />
      {filled.map((on, i) => (
        <circle key={i} cx="50" cy="50" r={r} fill="none" strokeWidth="11" strokeLinecap="round"
          stroke={on ? PIECE_COLORS[i] : '#dfe3e8'}
          strokeDasharray={`${seg} ${C - seg}`}
          strokeDashoffset={-(i * C / 4) - gap / 2}
          transform="rotate(-90 50 50)"
          style={{ '--seg': seg, '--rest': C - seg, '--c': C, animationDelay: `${delay + i * 0.35}s` } as React.CSSProperties} />
      ))}
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="pieces-label" fontSize={label.length > 1 ? 18 : 26}>{label}</text>
    </svg>
  );
}
