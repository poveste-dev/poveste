// jsdom implements no `ResizeObserver`, and Reka measures a popper's trigger to
// size its arrow — so mounting any control that carries a tooltip throws before
// a test gets to assert anything.
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= NoopResizeObserver as unknown as typeof ResizeObserver
