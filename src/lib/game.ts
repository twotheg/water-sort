export type ColorCode = string;
export type Bottle = ColorCode[];
export type GameState = Bottle[];

export interface LevelConfig {
  level: number;
  capacity: number;
  colors: number;
  empty: number;
}

const PALETTE: ColorCode[] = [
  "#f43f5e", // rose
  "#f97316", // orange
  "#facc15", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#a855f7", // purple
  "#ec4899", // pink/magenta
  "#84cc16", // lime
  "#14b8a6", // teal
];

export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Default board is 9 bottles: 7 colors + 2 empty (matches the reference
// look), then scales up in colors/capacity as the level increases.
export function getLevelConfig(level: number): LevelConfig {
  let colors: number;
  let empty = 2;
  let capacity = 5;

  if (level <= 50) {
    colors = 7;
  } else if (level <= 100) {
    colors = 8;
  } else if (level <= 150) {
    colors = 9;
  } else if (level <= 200) {
    colors = 10;
  } else if (level <= 250) {
    colors = 10;
    capacity = 6;
  } else {
    colors = 10;
    capacity = 7;
  }

  return { level, capacity, colors, empty };
}

export function getPalette(count: number): ColorCode[] {
  return PALETTE.slice(0, count);
}

function cloneState(state: GameState): GameState {
  return state.map((bottle) => [...bottle]);
}

export function getTopColor(bottle: Bottle): ColorCode | null {
  return bottle.length > 0 ? bottle[bottle.length - 1] : null;
}

export function getTopRunLength(bottle: Bottle): number {
  if (bottle.length === 0) return 0;
  const top = bottle[bottle.length - 1];
  let count = 0;
  for (let i = bottle.length - 1; i >= 0; i--) {
    if (bottle[i] === top) count++;
    else break;
  }
  return count;
}

export interface PourMove {
  from: number;
  to: number;
  amount: number;
  color: ColorCode;
}

export function getValidMoves(state: GameState, capacity: number): PourMove[] {
  const moves: PourMove[] = [];
  for (let from = 0; from < state.length; from++) {
    const source = state[from];
    if (source.length === 0) continue;
    const color = getTopColor(source)!;
    const run = getTopRunLength(source);

    for (let to = 0; to < state.length; to++) {
      if (from === to) continue;
      const dest = state[to];
      if (dest.length >= capacity) continue;
      const destTop = getTopColor(dest);
      if (destTop !== null && destTop !== color) continue;
      const space = capacity - dest.length;
      const amount = Math.min(run, space);
      if (amount <= 0) continue;
      moves.push({ from, to, amount, color });
    }
  }
  return moves;
}

export function applyMove(
  state: GameState,
  move: PourMove,
  capacity: number
): GameState {
  const next = cloneState(state);
  const source = next[move.from];
  const dest = next[move.to];
  let poured = 0;
  while (
    poured < move.amount &&
    source.length > 0 &&
    getTopColor(source) === move.color &&
    dest.length < capacity
  ) {
    dest.push(source.pop()!);
    poured++;
  }
  return next;
}

export function isBottleComplete(bottle: Bottle, capacity: number): boolean {
  if (bottle.length === 0) return false;
  if (bottle.length !== capacity) return false;
  return bottle.every((c) => c === bottle[0]);
}

export function isLevelComplete(state: GameState, capacity: number): boolean {
  return state.every(
    (bottle) => bottle.length === 0 || isBottleComplete(bottle, capacity)
  );
}

export function generateLevel(level: number): GameState {
  const { capacity, colors, empty } = getLevelConfig(level);
  const palette = getPalette(colors);
  const rng = mulberry32(level * 12345 + 67890);

  const bottles: Bottle[] = palette.map((c) => Array(capacity).fill(c));
  for (let i = 0; i < empty; i++) bottles.push([]);

  // Early levels used to scramble far too aggressively (e.g. level 9
  // needed 127+ reverse-moves on only 9 bottles). Scale gently at first,
  // with a floor tied to the puzzle's own size so it's never trivially easy.
  const mixMoves = Math.min(400, Math.max(colors * 4, 20 + level * 3));

  for (let i = 0; i < mixMoves; i++) {
    const sourceCandidates = bottles
      .map((_, idx) => idx)
      .filter((idx) => bottles[idx].length > 0);
    if (sourceCandidates.length === 0) break;

    const from = sourceCandidates[Math.floor(rng() * sourceCandidates.length)];
    const source = bottles[from];
    const run = getTopRunLength(source);

    const destCandidates = bottles
      .map((_, idx) => idx)
      .filter((idx) => idx !== from && bottles[idx].length < capacity);
    if (destCandidates.length === 0) continue;

    const to = destCandidates[Math.floor(rng() * destCandidates.length)];
    const dest = bottles[to];
    const space = capacity - dest.length;
    const maxAmount = Math.min(run, space);
    if (maxAmount <= 0) continue;

    const amount = 1 + Math.floor(rng() * maxAmount);

    for (let k = 0; k < amount; k++) {
      dest.push(source.pop()!);
    }
  }

  return bottles;
}

export function findHint(state: GameState, capacity: number): PourMove | null {
  const moves = getValidMoves(state, capacity);
  if (moves.length === 0) return null;

  for (const move of moves) {
    const next = applyMove(state, move, capacity);
    if (isLevelComplete(next, capacity)) return move;
  }

  const sameColorMoves = moves.filter((m) => {
    const dest = state[m.to];
    return dest.length > 0 && getTopColor(dest) === m.color;
  });
  if (sameColorMoves.length > 0) {
    return sameColorMoves[0];
  }

  return moves[0];
}

export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
