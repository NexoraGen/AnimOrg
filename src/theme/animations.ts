export const ANIMATION = {
  // durations in ms
  pressIn: 100,
  pressOut: 100,
  toggle: 200,
  badgeScale: 500,
  fadeIn: 300,
  screenTransition: 250,
};

export const EASING = {
  // standard easing functions (can be imported where needed)
  outCubic: (value: number) => Math.pow(value - 1, 3) + 1,
};
