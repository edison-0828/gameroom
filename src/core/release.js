import { technique } from './staff.js';
import { calendarWeek } from './events.js';
import { combinationKey } from './creative.js';
import { limit, reviewCeiling } from './ratings.js';
import { salesDuration, weeklyDemand } from './sales.js';
import { canPublish, assessProject } from './production.js';
import { releaseCompetition } from './annual.js';

export const launchPriceTiers = {
  low: { name: '低价', priceRate: .8, salesRate: score => 1.55 - score * .0038 },
  standard: { name: '标准价', priceRate: 1, salesRate: () => 1 },
  high: { name: '高价', priceRate: 1.25, salesRate: score => .43 + score * .0042 },
};

function launchDemand(game, project, assessment) {
  const { score, scale, finished, combination, ideaField } = assessment;
  const repeated = game.games.slice(0, 3).filter(title => title.genre === project.genre).length;
  const demand = .18 + .82 * (Math.max(0, score - 35) / 60) ** 1.4;
  const visibility = .72 + .65 * project.promo / (project.promo + 12 * scale);
  const market = project.market ?? (project.price === 38 ? 1250 : 1300);
  const marketReach = 1300 * (market / 1300) ** .86;
  const conversion = Math.max(.22, Math.min(.84, .43 + (score - 84) * (score > 84 ? .025 : .006)));
  const audience = marketReach * conversion *
    (1 + game.reputation * .0025) * (.45 + .55 * finished) * (.90 ** repeated);
  const followers = game.fans?.[combination?.audience] ?? 0;
  const returningFans = Math.floor(Math.min(followers * .12, (project.market ?? 1300) * .2));
  const sequelFans = project.series?.followers ?? 0;
  const seriesDemand = project.series ? Math.max(.76, Math.min(1.12, 1 + (project.series.trust - 75) * .006)) : 1;
  const sales = Math.max(20, Math.round(audience * demand * visibility * (combination?.market ?? 1) *
    (ideaField === 'promo' ? 1.08 : 1) * seriesDemand) + returningFans + sequelFans);
  return { sales, repeated, returningFans, sequelFans, seriesDemand };
}

function pricedLaunch(project, assessment, demand, tier) {
  const option = launchPriceTiers[tier];
  return { price: Math.max(1, Math.round(project.price * option.priceRate)),
    sales: Math.max(20, Math.round(demand.sales * option.salesRate(assessment.score))) };
}

export function launchPriceQuote(game, tier) {
  const project = game.project;
  if (!canPublish(project) || !Object.hasOwn(launchPriceTiers, tier)) return null;
  const assessment = assessProject(project, game.games.length);
  const { price, sales } = pricedLaunch(project, assessment, launchDemand(game, project, assessment), tier);
  const week = calendarWeek(game);
  const competition = releaseCompetition(project, week);
  const forecast = { sales, competition };
  let totalRevenue = 0;
  let breakEvenWeek = null;
  const copies = weeklyDemand(game, forecast, 0, week);
  for (let offset = 0; offset < salesDuration; offset++) {
    totalRevenue += (offset ? weeklyDemand(game, forecast, offset, week + offset) : copies) * price;
    if (breakEvenWeek === null && totalRevenue >= project.cost) breakEvenWeek = offset + 1;
  }
  return { price, copies, revenue: copies * price, totalRevenue, breakEvenWeek };
}

export function publish(game, tier = 'standard') {
  const project = game.project;
  if (game.liquidation || !canPublish(project) || !Object.hasOwn(launchPriceTiers, tier)) return;
  const assessment = assessProject(project, game.games.length);
  const { ratings, score, quality, combination, acceptedIdea } = assessment;
  const demand = launchDemand(game, project, assessment);
  const { repeated, returningFans, sequelFans, seriesDemand } = demand;
  const { price, sales } = pricedLaunch(project, assessment, demand, tier);
  const growth = [];
  for (const member of game.crew) {
    const participation = project.contributors?.[member.id] ?? 0;
    if (!participation) continue;
    const improvement = Math.min(4, 1 + Math.floor(participation / 4) + (score >= 85 ? 1 : 0));
    const previous = technique(member);
    member.technique = Math.min(100, previous + improvement);
    member.completedProjects = (member.completedProjects ?? 0) + 1;
    member.experience ??= {};
    if (project.type) member.experience[project.type] = (member.experience[project.type] ?? 0) + 1;
    if (member.technique > previous) growth.push({ name: member.name, gain: member.technique - previous });
  }
  const title = {
    id: 'own-' + game.games.length, name: project.name, genre: project.genre, year: game.year,
    type: project.type, story: project.story, style: project.style,
    combination, returningFans, growth, inspiration: acceptedIdea, fanChange: 0,
    ...ratings, score, quality, reviewCeiling: reviewCeiling(game.games.length),
    sales, copies: 0, revenue: 0, price, basePrice: project.price, priceTier: tier, cost: project.cost, repeated,
    salesWeeks: 0, salesHistory: [], feedback: project.feedback,
  };
  const week = calendarWeek(game);
  const competition = releaseCompetition(project, week);
  const nearbyPenalty = Math.max(...[-2, -1, 0, 1, 2].map(offset => releaseCompetition(project, week + offset).penalty));
  title.releaseWeek = week;
  title.competition = { ...competition, nearbyPenalty };
  if (project.series) Object.assign(title, { seriesId: project.series.id, sequelOf: project.series.sequelOf,
    inheritance: project.series.inheritance, sequelFans, seriesDemand });
  game.games.unshift(title);
  if (combination) {
    game.discoveries ??= {};
    game.discoveries[combinationKey(project)] = { ...combination, type: project.type, story: project.story, style: project.style };
  }
  game.reputation = limit(game.reputation + Math.round((score - 45) / 5));
  game.fame += Math.round(score / 10);
  game.project = null;
  return title;
}
