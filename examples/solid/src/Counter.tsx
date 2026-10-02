export function Counter(props: { count: number, label: string, onIncrement: () => void }) {
  return (
    <button type="button" class="counter" onClick={() => props.onIncrement()}>
      {props.label}
      :
      <span data-testid="count">{props.count}</span>
    </button>
  )
}
