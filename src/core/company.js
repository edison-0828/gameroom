import { availableCash, weeklyCost } from './staff.js';

export const companyLevels = [
  { name: '初创工作室', grade: 'R', cost: 0, quality: 0 },
  { name: '成长工作室', grade: 'SR', cost: 14500, quality: 2, reputation: 6, releases: 2 },
  { name: '精品工作室', grade: 'S', cost: 40000, quality: 3.5, reputation: 20, releases: 4 },
  { name: '知名厂商', grade: 'SS', cost: 110000, quality: 4.5, reputation: 38, releases: 6 },
  { name: '顶级厂商', grade: 'SSS', cost: 260000, quality: 5, reputation: 62, releases: 8 },
];

export const equipment = [
  { name: '入门台式机', cost: 0, quality: 0 },
  { name: '开发工作站', cost: 11000, quality: 3 },
  { name: '高性能工作站', cost: 30000, quality: 5 },
  { name: '旗舰工作站', cost: 65000, quality: 6 },
];

export const companyTier = game => companyLevels[game.companyLevel - 1];
export const computerTier = game => equipment[game.equipmentLevel - 1];
export const nextCompanyTier = game => companyLevels[game.companyLevel];
export const nextComputerTier = game => equipment[game.equipmentLevel];

export function investmentReserve(game) {
  const remaining = game.project ? (game.project.minWeeks ?? 4) - game.project.age : 0;
  return weeklyCost(game) * Math.max(4, remaining);
}

export function canInvest(game, item) {
  return Boolean(game.companyName && item && game.reputation >= (item.reputation ?? 0) &&
    game.games.length >= (item.releases ?? 0) &&
    availableCash(game) >= item.cost + investmentReserve(game));
}
