// For the repository's own checks, which reuse the CLI's floor test. Not
// published: `files` does not list it.
export function floorOf(range: unknown): [number, number, number] | null
export function isBelow(version: string, floor: [number, number, number]): boolean
export function unsupportedNodeMessage(version: string, range: string): string
export function nodeProblem(version: string, range: unknown): string | null
export function supportedNode(manifestUrl?: URL): boolean
