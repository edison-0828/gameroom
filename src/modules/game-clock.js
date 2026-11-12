const weekDuration = 8000;
const idleLimit = 5 * weekDuration;

export function createGameClock({ canRun, advanceWeek, paydayRisk, onPauseChange }) {
  let speed = 1;
  let elapsed = 0;
  let idle = 0;
  let lastFrame = 0;
  let pauseReason = null;

  function advanceTime(delta) {
    if (pauseReason || !canRun()) return;
    const time = Math.min(delta * speed, idleLimit - idle);
    elapsed += time;
    idle += time;
    while (elapsed >= weekDuration) {
      const idleAtSettlement = idle - (elapsed - weekDuration);
      if (idleAtSettlement >= weekDuration && paydayRisk()) {
        elapsed = weekDuration;
        pause('payday');
        return;
      }
      elapsed -= weekDuration;
      if (!advanceWeek()) return;
    }
    if (idle >= idleLimit) pause('idle');
  }

  function resetFrame() {
    lastFrame = performance.now();
  }

  function pause(reason) {
    if (pauseReason) return;
    pauseReason = reason;
    onPauseChange();
  }

  function resume() {
    pauseReason = null;
    idle = 0;
    resetFrame();
    onPauseChange();
  }

  function tick(now) {
    advanceTime(Math.max(0, now - lastFrame));
    lastFrame = now;
    requestAnimationFrame(tick);
  }

  return {
    get speed() { return speed; },
    get elapsed() { return elapsed; },
    get pauseReason() { return pauseReason; },
    advanceTime,
    pause,
    resume,
    interact() { idle = 0; },
    resetFrame,
    resetElapsed() { elapsed = 0; },
    setSpeed(rate) { speed = rate; },
    start() {
      resetFrame();
      requestAnimationFrame(tick);
    },
  };
}
