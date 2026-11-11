import { calendarWeek } from './events.js';
import { concepts } from './project-catalog.js';
import { totalScore } from './ratings.js';
import { firstWeekSales } from './sales.js';

export const awards = [
  ['score', '年度最佳游戏'], ['design', '最佳玩法创新'],
  ['content', '最佳内容设计'], ['art', '最佳美术与音效'],
  ['stability', '最佳技术表现'], ['sales', '年度商业表现'],
];

const rivals = ['雾港来信', '拾荒电台', '纸上旅店', '月球邮局', '塔楼茶话', '海底列车', '雪线之下', '周末车站'];
const rivalStudios = ['潮汐互动', '山雀工作室', '火花游艺', '纸页游戏'];
const rivalReleaseWeeks = [6, 13, 20, 27, 34, 41, 49, 52];
const debutTypes = ['adventure', 'novel', 'deck', 'platformer', 'farming', 'rhythm', 'sim', 'puzzle'];

export function releaseDate(week) {
  return '第 ' + (Math.floor((week - 1) / 52) + 1) + ' 年 · W' + ((week - 1) % 52 + 1);
}

export function rivalCalendar(fromWeek, toWeek) {
  const firstYear = Math.max(1, Math.floor((fromWeek - 1) / 52) + 1);
  const lastYear = Math.floor((toWeek - 1) / 52) + 1;
  const entries = [];
  for (let year = firstYear; year <= lastYear; year++) {
    entries.push(...rivalGames(year).filter(entry => entry.week >= fromWeek && entry.week <= toWeek));
  }
  return entries;
}

export function releaseCompetition(project, week) {
  const rivals = rivalCalendar(week - 1, week)
    .filter(entry => project.type ? entry.type === project.type : entry.genre === project.genre);
  const penalty = Math.min(36, rivals.reduce((total, entry) =>
    total + (entry.week === week ? (entry.score >= 78 ? 22 : 18) : 8), 0));
  return { penalty, rivals: rivals.map(({ name, studio, week }) => ({ name, studio, week })) };
}

function rivalGames(year) {
  const types = Object.keys(concepts);
  return rivals.map((name, index) => {
    const rate = offset => 51 + (year * 13 + index * 17 + offset * 7) % 43;
    const ratings = { design: rate(1), content: rate(2), art: rate(3), stability: rate(4) };
    const type = year === 1 ? debutTypes[index] : types[(index * 5 + (year - 2) * 7) % types.length];
    return {
      id: 'rival-' + index, name, type, genre: concepts[type].genre, studio: rivalStudios[(year + index) % rivalStudios.length],
      week: (year - 1) * 52 + rivalReleaseWeeks[index], ...ratings, score: totalScore(ratings),
      sales: 280 + (year * 387 + index * 241) % 1600,
    };
  });
}

export const rankBy = field => (a, b) => (field === 'sales' ? firstWeekSales(b) - firstWeekSales(a) : b[field] - a[field]) ||
  b.score - a.score || a.id.localeCompare(b.id);

export function standings(game, year) {
  return [...rivalGames(year).filter(title => title.week <= calendarWeek(game)),
    ...game.games.filter(title => title.year === year)].sort(rankBy('score'));
}

export const canWinAnnualAward = title => title.id !== 'own-0';

export function awardFinalists(board, field) {
  const ranked = [...board].sort(rankBy(field));
  const winner = ranked.find(canWinAnnualAward);
  if (!winner) return [];
  return [winner, ...ranked.filter(title => title !== winner).slice(0, 2)];
}

export function endYear(game) {
  if (game.week <= 52) return;
  const board = standings(game, game.year);
  game.years[game.year] = Object.fromEntries(awards.map(([field]) => [
    field, awardFinalists(board, field).map(title => title.id),
  ]));
  game.year++;
  game.week = 1;
}
