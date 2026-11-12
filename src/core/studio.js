import {
  availableCash, candidates, canHire, canRaise, capacity, idleCost, raiseAmount,
  replacementFor, roles, teamReady, updateTeam, weeklyCost, weeklySalary, weeksUntilPayday,
} from './staff.js';
import { canInvest, nextCompanyTier, nextComputerTier } from './company.js';
import { calendarWeek, currentStudioEvent, eventEffects, rollStudioEvent } from './events.js';
import { record, settleOperatingCosts, upcomingOperatingCosts } from './ledger.js';
import { limit } from './ratings.js';
import { onSale, activeUpdate, canWorkOnUpdate, workOnUpdate, collectSales, forecastWeeklySales, updateTypes } from './sales.js';
import { projectWeeks, reserveProjectHours, assigned, workOnProject } from './production.js';
import { commissions, finishSideWorkWeek, sideWorkForWeek } from './side-work.js';

export { latestSettlement } from './ledger.js';
export {
  salesDuration, onSale, firstWeekSales, promotionTypes, promotionQuote, startPromotion,
  updateTypes, activeUpdate, updateWorkHours, canWorkOnUpdate, updateQuote, startUpdate, updatedRatings,
} from './sales.js';
export {
  minimumDevWeeks, projectWeeks, projectBudget, canPublish, defectLimit, productionStage, tasks,
  inheritanceOptions, seriesProfile, sequelQuote, canStartProject, startProject, assigned,
  completion, adjust, assessProject, productionQuality,
} from './production.js';
export {
  awards, releaseDate, rivalCalendar, releaseCompetition, rankBy, standings,
  canWinAnnualAward, awardFinalists, endYear,
} from './annual.js';
export { launchPriceTiers, launchPriceQuote, publish } from './release.js';

export function newStudio() {
  return { companyName: '', companyLevel: 1, equipmentLevel: 1, fame: 0, year: 1, week: 47, cash: 64000,
    reputation: 0, project: null, games: [], years: {}, ledger: [], crew: [], eventHistory: [],
    fans: {}, discoveries: {} };
}

export function establishStudio(game, name) {
  if (game.companyName) return false;
  const base = name.trim().replace(/工作室$/, '').trim();
  if (!base || base.length > 12) return false;
  game.companyName = base + '工作室';
  return true;
}

export function hire(game, id) {
  const candidate = candidates.find(person => person.id === id);
  if (!candidate || !canHire(game, candidate)) return false;
  const replaced = replacementFor(game, candidate);
  if (replaced) {
    if (game.training?.memberId === replaced.id) game.training = null;
    game.crew[game.crew.indexOf(replaced)] = { ...candidate };
  }
  else {
    game.crew.push({ ...candidate });
    if (game.project) game.project.allocation[candidate.role] += 2;
  }
  if (game.project) game.project.cost += candidate.fee;
  game.operational ||= teamReady(game);
  record(game, (replaced ? '更换员工 · ' + replaced.name + ' → ' : '招聘 · ') + candidate.name, -candidate.fee);
  return true;
}

function removeEmployee(game, id) {
  const index = game.crew.findIndex(member => member.id === id);
  const member = game.crew[index];
  if (!member) return null;
  game.operational ||= canAdvance(game);
  if (game.training?.memberId === member.id) game.training = null;
  game.crew.splice(index, 1);
  if (game.project) {
    const allocation = game.project.allocation;
    allocation[member.role] = Math.max(0, allocation[member.role] - 2);
    for (const [role] of roles) {
      allocation[role] -= Math.min(allocation[role], Math.max(0, assigned(game.project) - capacity(game)));
    }
  }
  return member;
}

export function dismissEmployee(game, id) {
  const member = removeEmployee(game, id);
  if (!member) return false;
  const compensation = weeklySalary(member.monthlySalary);
  if (game.project) game.project.cost += compensation;
  record(game, '解雇补偿 · ' + member.name, -compensation);
  return true;
}

export function raiseEmployee(game, id) {
  const member = game.crew.find(person => person.id === id);
  if (!member || !canRaise(game, member)) return false;
  member.monthlySalary += raiseAmount(member);
  member.mood = limit(member.mood + 12);
  member.loyalty = limit(member.loyalty + 10);
  member.lastRaise = calendarWeek(game);
  return true;
}

export function resolveStudioEvent(game, index) {
  const id = game.pendingEvent;
  const event = currentStudioEvent(game);
  const option = event?.options[index];
  if (!option || (option.cost && availableCash(game) < option.cost)) return false;
  if (id === 'inspiration') {
    const project = game.project;
    const idea = project.inspiration;
    if (index === 0) {
      idea.state = 'accepted';
      project.minWeeks = projectWeeks(project) + 1;
      project.deadline++;
      project.cost += option.cost;
    } else idea.state = 'declined';
  }
  const recipients = option.memberId ? game.crew.filter(member => member.id === option.memberId) : game.crew;
  for (const member of recipients) {
    member.mood = limit(member.mood + (option.mood ?? 0));
    member.loyalty = limit(member.loyalty + (option.loyalty ?? 0));
  }
  game.reputation = limit(game.reputation + (option.reputation ?? 0));
  if (option.audience) {
    game.fans ??= {};
    game.fans[option.audience] = Math.max(0, Math.min(50000, (game.fans[option.audience] ?? 0) + option.fans));
  }
  if (option.market) game.marketTrend = { percent: option.market, until: calendarWeek(game) + option.weeks - 1 };
  if (option.departure) removeEmployee(game, option.memberId);
  if (option.cost) record(game, '工作室事件 · ' + option.name, -option.cost);
  game.eventHistory = [{ id, name: event.name, choice: option.name, category: event.category, reason: event.text,
    effects: eventEffects(option), year: game.year, week: game.week },
    ...(game.eventHistory ?? []).slice(0, 5)];
  game.pendingEvent = null;
  game.eventContext = null;
  return true;
}

export function upgradeCompany(game) {
  const tier = nextCompanyTier(game);
  if (!canInvest(game, tier)) return false;
  game.companyLevel++;
  game.reputation = limit(game.reputation + 3 * game.companyLevel);
  game.fame += 10 * game.companyLevel;
  record(game, '公司升级 · ' + tier.name, -tier.cost);
  return true;
}

export function buyComputer(game) {
  const tier = nextComputerTier(game);
  if (!canInvest(game, tier)) return false;
  game.equipmentLevel++;
  record(game, '采购电脑 · ' + tier.name, -tier.cost);
  return true;
}

export function canAdvance(game) {
  return Boolean(!game.liquidation && game.companyName && (game.operational || teamReady(game) || game.project || game.games.length));
}

export function liquidateIfNeeded(game) {
  if (!game.liquidation && game.companyName && game.cash <= 0) {
    game.liquidation = { year: game.year, week: game.week };
    game.pendingEvent = null;
    game.eventContext = null;
  }
  return Boolean(game.liquidation);
}

export function weeklyWork(game) {
  const cost = game.project ? weeklyCost(game) : idleCost(game);
  const funded = availableCash(game) >= cost;
  const sideWork = sideWorkForWeek(game, funded);
  const updating = activeUpdate(game);
  const updateWorks = updating && canWorkOnUpdate(game, updating, sideWork.hours);
  const hours = { ...sideWork.hours };
  if (updateWorks) {
    for (const [role, amount] of Object.entries(updateTypes[updating.update.kind].hours)) {
      hours[role] = (hours[role] ?? 0) + amount;
    }
  }
  const plan = game.project && reserveProjectHours(game, game.project.allocation, hours);
  return { funded, sideWork, updating, updateWorks, plan };
}

function isOperating(game, { funded, sideWork }) {
  return Boolean(funded || sideWork.contractWorker || game.games.some(onSale));
}

export function paydayRisk(game) {
  if (weeksUntilPayday(game) !== 1) return false;
  const work = weeklyWork(game);
  const operating = isOperating(game, work);
  const { office, payroll } = upcomingOperatingCosts(game, operating);
  if (!payroll || game.cash > office + payroll) return false;
  const finishingUpdate = work.updateWorks && work.updating.update.remaining === 1 ? work.updating : null;
  const sales = operating ? forecastWeeklySales(game, finishingUpdate) : 0;
  const commission = work.sideWork.contractWorker && game.commission.remaining === 1
    ? commissions[game.commission.kind].reward : 0;
  return game.cash + sales + commission <= office + payroll;
}

export function advance(game, random) {
  if (liquidateIfNeeded(game) || !canAdvance(game) || game.pendingEvent || game.week > 52) return;
  const work = weeklyWork(game);
  const { funded, sideWork, updating, updateWorks, plan } = work;
  const operating = isOperating(game, work);
  if (operating) {
    if (funded && plan && assigned({ allocation: plan }) > 0) {
      workOnProject(game, plan, sideWork.workers);
    }
    if (updateWorks) workOnUpdate(updating);
    updateTeam(game);
  }
  settleOperatingCosts(game, operating);
  if (operating) collectSales(game);
  finishSideWorkWeek(game, sideWork);
  if (liquidateIfNeeded(game)) return;
  game.week++;
  const project = game.project;
  const members = project && !project.inspiration && project.age > 0 && project.age < projectWeeks(project) && funded
    ? game.crew.filter(member => !sideWork.workers.includes(member) && project.allocation[member.role] > 0 && member.mood >= 45) : [];
  rollStudioEvent(game, { hasSales: game.games.some(onSale), inspiration: members.length > 0 }, random);
  if (game.pendingEvent === 'inspiration') offerInspiration(game, members, random);
}

function offerInspiration(game, members, random = Math.random) {
  const project = game.project;
  const member = members[Math.floor(random() * members.length)];
  project.inspiration = {
    memberId: member.id, memberName: member.name, role: member.role, state: 'pending',
    cost: Math.round((500 + weeklyCost(game) * .3) / 100) * 100,
  };
}
