interface BadgeProps {
  label: string
  color?: 'accent' | 'sky' | 'mint' | 'muted'
}

const colorMap: Record<string, { bg: string; text: string }> = {
  accent: { bg: 'var(--accent-soft)', text: 'var(--accent-deep)' },
  sky: { bg: 'var(--sky-soft)', text: 'var(--sky-deep)' },
  mint: { bg: 'var(--mint-soft)', text: 'var(--mint-deep)' },
  muted: { bg: 'var(--line)', text: 'var(--muted)' },
}

export function Badge({ label, color = 'muted' }: BadgeProps) {
  const c = colorMap[color]
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {label}
    </span>
  )
}
