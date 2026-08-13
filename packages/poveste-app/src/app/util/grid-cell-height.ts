import { shallowRef } from 'vue'

/**
 * The first height reported by any cell of a story's grid.
 *
 * Sandboxes boot one at a time: on the 1000-variant grid the last cell reports
 * ~15s after the first. Until a cell reports it has nothing to size itself by,
 * so the grid spends that time as a wall of stubs resizing one by one. Variants
 * of one story are usually near-identical in size, which makes the first height
 * to arrive a far better guess than a fixed floor.
 *
 * Keyed by story so the next one doesn't inherit it. Module scope rather than a
 * component ref because `<script setup>` bodies run per instance — a ref
 * declared there would be one per cell, and never shared.
 */
export const firstReportedHeight = shallowRef<{ storyId: string, height: number } | null>(null)
