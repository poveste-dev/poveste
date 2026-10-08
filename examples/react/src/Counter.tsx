export function Counter({ count, label, onIncrement }: { count: number, label: string, onIncrement: () => void }) {
  return (
    <button type="button" className="counter" onClick={onIncrement}>
      {label}
      :
      <span data-testid="count">{count}</span>
    </button>
  )
}
