export default function CharCounter({ current, max }) {
  const isOver = current > max
  return (
    <span
      className={`inline-flex text-[11px] px-2 py-0.5 rounded-full font-medium tabular-nums ${
        isOver
          ? 'bg-red-500/10 text-red-400'
          : 'bg-green-500/10 text-green-400'
      }`}
    >
      {current}/{max}
    </span>
  )
}
