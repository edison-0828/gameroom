import { foundingTeam, weeksPerMonth } from './staff.js';
import { defectLimit, liquidateIfNeeded } from './studio.js';

const key = 'indie-studio-v1';
const checkpointKeys = ['indie-studio-checkpoint-v1', 'indie-studio-checkpoint-v1-2', 'indie-studio-checkpoint-v1-3'];
export const checkpointSlots = Object.freeze([1, 2, 3]);

function readGame(slot) {
  try {
    const game = JSON.parse(localStorage.getItem(slot));
    if (![1, 2, 3].includes(game?.version) || !Array.isArray(game.games) || !Array.isArray(game.ledger)) return null;
    const games = game.games.map(title => !title.salesHistory && title.salesWeeks >= 5
      ? { ...title, legacyClosed: true } : title);
    const project = game.project && game.project.bugs > defectLimit(game.project)
      ? { ...game.project, bugs: defectLimit(game.project), bugDelta: 0 } : game.project;
    if (project) {
      delete project.releaseWeek;
      delete project.releasePriceTier;
    }
    const crew = game.crew?.map(({ wage, monthlySalary, ...member }) => ({
      ...member, monthlySalary: monthlySalary ?? (wage ?? 1600) * weeksPerMonth,
    })) ?? foundingTeam();
    const restored = { companyLevel: 1, equipmentLevel: 1, fame: 0, fans: {}, discoveries: {}, accruedPayroll: 0, ...game, games, project,
      companyName: game.companyName ?? '游戏工作室', crew };
    liquidateIfNeeded(restored);
    return restored;
  } catch {
    return null;
  }
}

function writeGame(slot, game) {
  try {
    localStorage.setItem(slot, JSON.stringify({ ...game, version: 3 }));
    return true;
  } catch {
    return false;
  }
}

export const readSave = () => readGame(key);
export const writeSave = game => writeGame(key, { ...game, autoSavedAt: Date.now() });
export function readCheckpoint(slot) {
  return checkpointSlots.includes(slot) ? readGame(checkpointKeys[slot - 1]) : null;
}

export function writeCheckpoint(slot, { autoSavedAt, ...game }) {
  return checkpointSlots.includes(slot) && writeGame(checkpointKeys[slot - 1], game);
}

export function deleteSave(slot) {
  if (slot !== 0 && !checkpointSlots.includes(slot)) return false;
  try {
    localStorage.removeItem(slot === 0 ? key : checkpointKeys[slot - 1]);
    return true;
  } catch {
    return false;
  }
}
