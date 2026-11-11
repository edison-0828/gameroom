const weekDuration = 8000;

export function createGameClock({ canRun, advanceWeek }) {
  let speed = 1;
  let elapsed = 0;
  let lastFrame = 0;

  function advanceTime(delta) {
    if (!canRun()) return;
    elapsed += delta * speed;
    while (elapsed >= weekDuration) {
      elapsed -= weekDuration;
      if (!advanceWeek()) break;
    }
  }

  function resetFrame() {
    lastFrame = performance.now();
  }

  function tick(now) {
    advanceTime(Math.max(0, now - lastFrame));
    lastFrame = now;
    requestAnimationFrame(tick);
  }

  return {
    get speed() { return speed; },
    get elapsed() { return elapsed; },
    advanceTime,
    resetFrame,
    resetElapsed() { elapsed = 0; },
    setSpeed(rate) { speed = rate; },
    start() {
      resetFrame();
      requestAnimationFrame(tick);
    },
  };
}
