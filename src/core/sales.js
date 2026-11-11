import { availableCash, idleCost, staffCount, weeklyCost } from './staff.js';
import { calendarWeek, marketEffect } from './events.js';
import { playerReviews } from './creative.js';
import { record } from './ledger.js';
import { limit, totalScore } from './ratings.js';

export const salesDuration = 12;

export const onSale = title => !title.legacyClosed && title.salesWeeks < salesDuration;

export const promotionTypes = {
  regular: { name: '七五折', weeks: 2, priceRate: .75, salesRate: 1.4 },
  flash: { name: '六折闪促', weeks: 1, priceRate: .6, salesRate: 1.6 },
};

export function promotionQuote(title, kind) {
  if (!title || !Object.hasOwn(promotionTypes, kind)) return null;
  const type = promotionTypes[kind];
  const remaining = salesDuration - title.salesWeeks;
  const canStart = onSale(title) && title.salesWeeks > 0 && !title.promotion && remaining >= type.weeks;
  return { ...type, price: Math.max(1, Math.round(title.price * type.priceRate)), remaining, canStart };
}

export function startPromotion(title, kind) {
  const quote = promotionQuote(title, kind);
  if (!quote?.canStart) return false;
  title.promotion = { kind, remaining: quote.weeks, history: [] };
  return true;
}

function promotionForWeek(title, salesWeeks = title.salesWeeks) {
  const promotion = title.promotion;
  return promotion?.remaining > salesWeeks - title.salesWeeks ? promotionQuote(title, promotion.kind) : null;
}

function promotionCopies(copies, promotion) {
  return promotion ? Math.round(copies * promotion.salesRate) : copies;
}

export const updateTypes = {
  patch: { name: '修复补丁', field: 'stability', rating: '稳定性', weeks: 1, hours: { test: 2 },
    minimumCost: 1800, costRate: .04, maxGain: 18, salesRate: .02 },
  content: { name: '内容更新', field: 'content', rating: '内容', weeks: 2, hours: { content: 2, art: 2 },
    minimumCost: 4200, costRate: .09, maxGain: 16, salesRate: .025 },
};

export const activeUpdate = game => game.games.find(title => title.update?.status === 'working');
const hasUpdateStaff = (game, type) =>
  Object.entries(type.hours).every(([role, hours]) => staffCount(game, role) * 2 >= hours);
export const updateWorkHours = type => Object.values(type.hours).reduce((sum, amount) => sum + amount, 0);
export const canWorkOnUpdate = (game, title) => availableCash(game) >= (game.project ? weeklyCost(game) : idleCost(game)) &&
  hasUpdateStaff(game, updateTypes[title.update.kind]);

function baseWeeklySales(title, salesWeeks = title.salesWeeks) {
  return salesWeeks === 0 ? title.sales : Math.floor(title.sales * (salesDuration - salesWeeks) / 55);
}

const applyCompetition = (title, copies) => Math.round(copies * (1 - (title.competition?.penalty ?? 0) / 100));
export const firstWeekSales = title => title.salesHistory?.find(entry => entry.week === 1)?.copies ??
  applyCompetition(title, title.sales);

export function weeklyDemand(game, title, salesWeeks = title.salesWeeks, week = calendarWeek(game) + salesWeeks - title.salesWeeks) {
  const copies = Math.round(baseWeeklySales(title, salesWeeks) * (1 + marketEffect(game, week) / 100));
  return salesWeeks === 0 ? applyCompetition(title, copies) : copies;
}

export function updateQuote(game, title, kind) {
  if (!title || !Object.hasOwn(updateTypes, kind)) return null;
  const type = updateTypes[kind];
  const remaining = salesDuration - title.salesWeeks;
  const cost = Math.ceil(Math.max(type.minimumCost, title.cost * type.costRate) / 100) * 100;
  const gain = Math.max(0, Math.min(type.maxGain, 100 - title[type.field]));
  let reason = '';
  if (!onSale(title) || title.update) reason = '每款在售游戏最多安排一次更新。';
  else if (!title.salesWeeks) reason = '首周结算后开放更新。';
  else if (remaining <= type.weeks) reason = '剩余销售时间不足。';
  else if (activeUpdate(game)) reason = '团队正在制作另一项更新。';
  else if (!hasUpdateStaff(game, type)) reason = '缺少对应岗位员工。';
  else if (!gain) reason = type.rating + '评分已满。';
  else if (availableCash(game) < cost) reason = '现金不足。';
  let extraRevenue = 0;
  for (let week = title.salesWeeks + type.weeks - 1; week < salesDuration; week++) {
    const base = weeklyDemand(game, title, week);
    const extra = Math.floor(base * gain * type.salesRate);
    const promotion = promotionForWeek(title, week);
    const addedCopies = promotionCopies(base + extra, promotion) - promotionCopies(base, promotion);
    extraRevenue += addedCopies * (promotion?.price ?? title.price);
  }
  return { ...type, remaining, cost, gain, extraRevenue, reason };
}

export function startUpdate(game, title, kind) {
  const quote = updateQuote(game, title, kind);
  if (!quote || quote.reason) return false;
  title.update = { kind, cost: quote.cost, gain: quote.gain, remaining: quote.weeks, status: 'working', extraCopies: 0 };
  record(game, '《' + title.name + '》' + quote.name, -quote.cost);
  return true;
}

export function updatedRatings(title) {
  if (title.update?.status !== 'released') return title;
  const type = updateTypes[title.update.kind];
  const ratings = { ...title, [type.field]: limit(title[type.field] + title.update.gain) };
  return { ...ratings, score: totalScore(ratings) };
}

export function workOnUpdate(title) {
  title.update.remaining--;
  if (title.update.remaining === 0) {
    title.update.status = 'released';
    title.update.reviews = playerReviews(updatedRatings(title));
  }
}

export function collectSales(game) {
  for (const title of game.games) {
    if (!onSale(title)) continue;
    const base = weeklyDemand(game, title);
    if (title.salesWeeks === 0 && title.competition) {
      const uncontested = Math.round(title.sales * (1 + marketEffect(game) / 100));
      title.competition.lostCopies = uncontested - base;
      title.competition.avoidedCopies = Math.max(0, base - Math.round(uncontested * (1 - title.competition.nearbyPenalty / 100)));
    }
    const update = title.update;
    const regularExtra = update?.status === 'released'
      ? Math.floor(base * update.gain * updateTypes[update.kind].salesRate) : 0;
    const regularCopies = base + regularExtra;
    const promotion = promotionForWeek(title);
    const copies = promotionCopies(regularCopies, promotion);
    const price = promotion?.price ?? title.price;
    const revenue = copies * price;
    if (regularExtra) {
      const extra = copies - promotionCopies(base, promotion);
      update.extraRevenue ??= update.extraCopies * title.price;
      update.extraCopies += extra;
      update.extraRevenue += extra * price;
    }
    title.salesWeeks++;
    title.copies += copies;
    title.revenue += revenue;
    (title.salesHistory ??= []).push({ week: title.salesWeeks, copies, revenue, price });
    if (promotion) {
      title.promotion.history.push({ week: title.salesWeeks, copies, revenue, regularCopies, regularRevenue: regularCopies * title.price });
      title.promotion.remaining--;
    }
    if (title.salesWeeks === salesDuration && update?.status === 'working') update.status = 'expired';
    if (revenue > 0) record(game, '《' + title.name + '》第 ' + title.salesWeeks + ' 周销售到账', revenue);
    if (title.salesWeeks === 1 && title.combination) title.reviews = playerReviews(title);
    if (title.combination) {
      const audience = title.combination.audience;
      game.fans ??= {};
      const followers = game.fans[audience] ?? 0;
      const score = updatedRatings(title).score;
      const change = score >= 65
        ? Math.floor(copies * (score - 60) / 400 * title.combination.fans)
        : score < 55 && title.salesWeeks === 1 ? -Math.min(followers, Math.ceil(followers * .06)) : 0;
      game.fans[audience] = Math.min(50000, followers + change);
      title.fanChange = (title.fanChange ?? 0) + game.fans[audience] - followers;
    }
  }
}
