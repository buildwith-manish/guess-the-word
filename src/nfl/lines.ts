import { lines } from './lines.generated';
import type { ClipType } from './timings.generated';

/** The spoken text for a slot, from the script via lines.generated.ts. undefined when the script has no such line (yet). */
export const lineText = (type: ClipType, key = ''): string | undefined => lines.find((l) => l.type === type && l.key === key)?.text;
