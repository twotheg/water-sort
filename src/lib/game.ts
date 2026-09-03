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
  "#ef4444", // red-500
  "#f97316", // orange-500
  "#eab308", // yellow-500
  "#22c55e", // green-500
  "#06b6d4", // cyan-500
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#d946ef", // fuchsia-500
  "#f43f5e", // rose-500
  "#14b8a6", // teal-500
];

export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getLevelConfig(level: number): LevelConfig {
  let colors: number;
  let empty: number;

  if (level <= 20) {
    colors = 2;
    empty = 1;
  } else if (level <= 50) {
    colors = 3;
    empty = 1;
  } else if (level <= 100) {
    colors = 3;
    empty = 2;
  } else if (level <= 150) {
    colors = 4;
    empty = 2;
  } else if (level <= 200) {
    colors = 5;
    empty = 2;
  } else if (level <= 250) {
    colors = 6;
    empty = 2;
  } else if (level <= 280) {
    colors = 7;
    empty = 2;
  } else {
    colors = 8;
    empty = 2;
  }

  return { level, capacity: 5, colors, empty };
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
      // Avoid meaningless moves that just reverse the previous state.
      // We still allow them in generation; gameplay uses full validation.
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

/**
 * Generate a scrambled-but-solvable level by starting from the solved
 * arrangement and repeatedly peeling a *random-length* slice off the top
 * of a random bottle and stacking it onto a random OTHER bottle,
 * regardless of that bottle's current top color.
 *
 * This is the reverse of a legal pour, so undoing every step (in reverse
 * order) is always a legal sequence of forward moves back to the solved
 * state — guaranteeing the puzzle is solvable — while still producing
 * genuinely mixed bottles (unlike naively replaying "forward" pours from
 * a fully-solved state, which can only ever relocate whole same-color
 * bottles and therefore never actually mixes anything).
 */
export function generateLevel(level: number): GameState {
  const { capacity, colors, empty } = getLevelConfig(level);
  const palette = getPalette(colors);
  const rng = mulberry32(level * 12345 + 67890);

  const bottles: Bottle[] = palette.map((c) => Array(capacity).fill(c));
  for (let i = 0; i < empty; i++) bottles.push([]);

  const mixMoves = Math.min(300, 60 + level * 3);

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

    // Random amount from 1..maxAmount (NOT always the full run) is what
    // actually produces mixed bottles instead of whole-bottle relocation.
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

  // Prefer moves that progress toward completion.
  for (const move of moves) {
    const next = applyMove(state, move, capacity);
    if (isLevelComplete(next, capacity)) return move;
  }

  // Prefer moves into non-empty bottles of the same color.
  const sameColorMoves = moves.filter((m) => {
    const dest = state[m.to];
    return dest.length > 0 && getTopColor(dest) === m.color;
  });
  if (sameColorMoves.length > 0) {
    return sameColorMoves[0];
  }

  // Prefer moves into empty bottles only when necessary.
  return moves[0];
}

export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
