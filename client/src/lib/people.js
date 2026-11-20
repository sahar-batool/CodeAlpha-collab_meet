// One marker color per person, so six colors cover a full call.
export const PEOPLE_COLORS = ['#5cc8ff', '#4fe0c0', '#ff9f43', '#a78bfa', '#ff8fd0', '#b8f35c'];

// The same name always gets the same color, on every screen.
export function colorFor(name = '') {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PEOPLE_COLORS[h % PEOPLE_COLORS.length];
}