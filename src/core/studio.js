import { accruedPayroll, availableCash, candidates, canHire, canRaise, capacity, contribution, idleCost, monthlyPayroll, officeCost, raiseAmount, replacementFor, roles, staffCount, teamReady, technique, updateTeam, weeklyCost, weeklySalary, weeksUntilPayday } from './staff.js';
import { canInvest, companyTier, computerTier, nextCompanyTier, nextComputerTier } from './company.js';
import { calendarWeek, currentStudioEvent, eventEffects, marketEffect, rollStudioEvent } from './events.js';
import { artStyles, projectNameError, stories } from './project-plan.js';
import { concepts } from './project-catalog.js';
import { combinationKey, evaluateCombination, inspirationIdeas, playerReviews } from './creative.js';

export const minimumDevWeeks = 4;
export const salesDuration = 12;
export const projectWeeks = project => project.minWeeks ?? minimumDevWeeks;
export const projectBudget = (game, concept) => weeklyCost(game) * projectWeeks(concept) + (concept.setupCost ?? 0);
export const canPublish = project => Boolean(project && project.age >= projectWeeks(project));
export const defectLimit = project => Math.ceil(6 + 5 * Math.sqrt(project.scope / 15));
export const onSale = title => !title.legacyClosed && title.salesWeeks < salesDuration;
const officeLabel = '周办公开支';
const payrollLabel = '月薪发放';
const legacyPayrollLabel = '团队工资与办公开支';

export function latestSettlement(game) {
  const payrollIndex = game.ledger.findIndex(entry => entry.label === officeLabel || entry.label === legacyPayrollLabel);
  if (payrollIndex < 0) return null;
  const payroll = game.ledger[payrollIndex];
  let revenue = 0;
  let expense = -payroll.amount;
  let closing = game.cash;
  for (let index = 0; index < payrollIndex; index++) {
    const entry = game.ledger[index];
    if (entry.year === payroll.year && entry.week === payroll.week && entry.label === payrollLabel) {
      expense -= entry.amount;
    } else if (entry.year === payroll.year && entry.week === payroll.week && entry.amount > 0) {
      revenue += entry.amount;
    } else closing -= entry.amount;
  }
  return { year: payroll.year, week: payroll.week, revenue, expense, net: revenue - expense, closing };
}

export function productionStage(project) {
  if (canPublish(project) && completion(project) === 100 && project.bugs === 0) {
    return ['ready', '可发售', '内容已完成，已知缺陷已清理。'];
  }
  if (project.age >= projectWeeks(project) - 1) {
    return ['fix', '收尾打磨中', '内容工时继续补齐进度，测试工时加快修复缺陷。'];
  }
  if (project.age === projectWeeks(project) - 2) {
    return ['test', '测试中', '开始集中修复缺陷，本周结束会收到试玩反馈。'];
  }
  return ['build', '开发中', '制作玩法、关卡和美术资源。'];
}
export const tasks = [
  ['design', '玩法', '打磨核心机制，减少重复感'],
  ['content', '内容', '制作关卡和系统，推进可发售进度'],
  ['art', '美术与音效', '完善画面、动效和声音'],
  ['test', '测试', '修复缺陷，稳定版本'],
  ['promo', '宣传', '积累关注，提高首周销量'],
];

export const awards = [
  ['score', '年度最佳游戏'], ['design', '最佳玩法创新'],
  ['content', '最佳内容设计'], ['art', '最佳美术与音效'],
  ['stability', '最佳技术表现'], ['sales', '年度商业表现'],
];

const rivals = ['雾港来信', '拾荒电台', '纸上旅店', '月球邮局', '塔楼茶话', '海底列车', '雪线之下', '周末车站'];
const rivalStudios = ['潮汐互动', '山雀工作室', '火花游艺', '纸页游戏'];
const rivalReleaseWeeks = [6, 13, 20, 27, 34, 41, 49, 52];
const debutTypes = ['adventure', 'novel', 'deck', 'platformer', 'farming', 'rhythm', 'sim', 'puzzle'];
const limit = value => Math.max(0, Math.min(100, Math.round(value)));
const totalScore = ratings => limit(ratings.design * .30 + ratings.content * .25 + ratings.art * .20 + ratings.stability * .25);

export const launchPriceTiers = {
  low: { name: '低价', priceRate: .8, salesRate: score => 1.55 - score * .0038 },
  standard: { name: '标准价', priceRate: 1, salesRate: () => 1 },
  high: { name: '高价', priceRate: 1.25, salesRate: score => .43 + score * .0042 },
};

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

function weeklyDemand(game, title, salesWeeks = title.salesWeeks, week = calendarWeek(game) + salesWeeks - title.salesWeeks) {
  const copies = Math.round(baseWeeklySales(title, salesWeeks) * (1 + marketEffect(game, week) / 100));
  return salesWeeks === 0 ? applyCompetition(title, copies) : copies;
}

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

export const inheritanceOptions = {
  mechanics: { name: '继承核心玩法', detail: '提前完成一部分玩法设计，并减少初始缺陷。' },
  world: { name: '延续世界观', detail: '提前完成一部分内容和美术工作。' },
};

export function seriesProfile(game, title) {
  const id = title.seriesId ?? title.id;
  const entries = game.games.filter(entry => (entry.seriesId ?? entry.id) === id);
  const root = entries.find(entry => entry.id === id) ?? title;
  const recent = entries.slice(0, 3);
  const weights = [3, 2, 1];
  const weightedScore = recent.reduce((sum, entry, index) => sum + updatedRatings(entry).score * weights[index], 0);
  const trust = recent.length ? Math.round(weightedScore / weights.slice(0, recent.length).reduce((a, b) => a + b, 0)) : title.score;
  const fans = Math.max(0, entries.reduce((sum, entry) => sum + (entry.fanChange ?? 0), 0));
  return { id, root, latest: entries[0], count: entries.length, trust, fans };
}

export function sequelQuote(game, title) {
  const profile = seriesProfile(game, title);
  const type = title.type ?? Object.keys(concepts).find(key => concepts[key].genre === title.genre);
  let reason = '';
  if (profile.latest !== title) reason = '请从系列最新一作制作续作。';
  else if (profile.count === 1 && updatedRatings(title).score < 75) reason = '首作当前评分达到 75 分才可开启系列。';
  else if (!title.salesWeeks) reason = '首周销售结算后开放续作。';
  else if (!type) reason = '这款旧作没有可用的企划类型。';
  else if (game.project) reason = '请先完成当前研发项目。';
  else if (!canStartProject(game, type)) reason = '请检查团队、预算和公司等级。';
  const market = concepts[type]?.market ?? 0;
  const followers = Math.floor(Math.min(market * .12, profile.fans * .4 * profile.trust / 100));
  return { ...profile, type, followers, reason };
}

function reserveUpdateHours(game, title, allocation) {
  const { hours } = updateTypes[title.update.kind];
  const plan = { ...allocation };
  for (const [role, amount] of Object.entries(hours)) plan[role] = Math.max(0, plan[role] - amount);
  const reserved = updateWorkHours(updateTypes[title.update.kind]);
  let excess = Math.max(0, assigned({ allocation: plan }) - capacity(game) + reserved);
  for (const [role] of roles) {
    const released = Math.min(excess, plan[role]);
    plan[role] -= released;
    excess -= released;
  }
  return plan;
}

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

export function canStartProject(game, type) {
  const concept = concepts[type];
  return !game.liquidation && Object.hasOwn(concepts, type) && Boolean(game.companyName) && teamReady(game) && !game.project &&
    game.companyLevel >= concept.unlock && availableCash(game) >= projectBudget(game, concept) && game.week <= 52;
}

export function startProject(game, plan) {
  if (!canStartProject(game, plan.type) || !Object.hasOwn(stories, plan.story) || !Object.hasOwn(artStyles, plan.style)) return false;
  const name = plan.name.trim();
  if (projectNameError(game, name)) return false;
  const concept = concepts[plan.type];
  const predecessor = plan.sequelOf && game.games.find(title => title.id === plan.sequelOf);
  const sequel = predecessor ? sequelQuote(game, predecessor) : null;
  if (plan.sequelOf && (!sequel || sequel.reason || sequel.type !== plan.type ||
    !Object.hasOwn(inheritanceOptions, plan.inheritance))) return false;
  const setupCost = concept.setupCost ?? 0;
  game.project = {
    type: plan.type, genre: concept.genre, scope: concept.scope, price: concept.price,
    market: concept.market, minWeeks: concept.minWeeks, setupCost, name, story: plan.story, style: plan.style,
    age: 0, cost: setupCost, bugs: 3, design: 0, content: 0, art: 0, promo: 0,
    feedback: '', allocation: Object.fromEntries(roles.map(([role]) => [role, staffCount(game, role) * 2])),
    deadline: projectWeeks(concept) + 2,
  };
  if (sequel) {
    const previous = updatedRatings(predecessor);
    const project = game.project;
    const scale = Math.sqrt(project.scope / 15);
    project.series = { id: sequel.id, sequelOf: predecessor.id, inheritance: plan.inheritance,
      trust: sequel.trust, followers: sequel.followers };
    if (plan.inheritance === 'mechanics') {
      project.design = 3 * scale * previous.design / 100;
      project.bugs = previous.stability >= 75 ? 1 : 2;
    } else {
      project.content = project.scope * .12 * previous.content / 100;
      project.art = 3 * scale * previous.art / 100;
    }
  }
  if (setupCost) record(game, '项目立项 · ' + name, -setupCost);
  return true;
}

export const assigned = project => Object.values(project.allocation).reduce((sum, value) => sum + value, 0);
export const completion = project => limit(Math.floor(project.content / project.scope * 100));

export function adjust(game, task, change) {
  const { project } = game;
  if (!Object.hasOwn(project.allocation, task)) return;
  if (change > 0 && assigned(project) >= capacity(game)) return;
  project.allocation[task] = Math.max(0, project.allocation[task] + change);
}

function record(game, label, amount) {
  game.cash += amount;
  game.ledger.unshift({ year: game.year, week: Math.min(game.week, 52), label, amount });
}

export function hire(game, id) {
  const candidate = candidates.find(person => person.id === id);
  if (!candidate || !canHire(game, candidate)) return false;
  const replaced = replacementFor(game, candidate);
  if (replaced) game.crew[game.crew.indexOf(replaced)] = { ...candidate };
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

export function productionQuality(game) {
  const average = game.crew.reduce((sum, member) => sum + technique(member), 0) / Math.max(1, game.crew.length);
  return {
    staff: Math.max(0, (average - 30) * .22),
    equipment: computerTier(game).quality,
    company: companyTier(game).quality,
  };
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

export function advance(game, random) {
  if (liquidateIfNeeded(game) || !canAdvance(game) || game.pendingEvent || game.week > 52) return;
  const cost = game.project ? weeklyCost(game) : idleCost(game);
  const funded = availableCash(game) >= cost;
  const updating = activeUpdate(game);
  const updateWorks = updating && canWorkOnUpdate(game, updating);
  const operating = funded || game.games.some(onSale);
  if (operating) {
    const plan = updateWorks && game.project
      ? reserveUpdateHours(game, updating, game.project.allocation) : game.project?.allocation;
    if (funded && plan && assigned({ allocation: plan }) > 0) {
      workOnProject(game, plan);
    }
    if (updateWorks) {
      updating.update.remaining--;
      if (updating.update.remaining === 0) {
        updating.update.status = 'released';
        updating.update.reviews = playerReviews(updatedRatings(updating));
      }
    }
    updateTeam(game);
    record(game, officeLabel, -officeCost(Boolean(game.project)));
  }
  game.accruedPayroll = accruedPayroll(game) + weeklySalary(monthlyPayroll(game));
  if (weeksUntilPayday(game) === 1 && accruedPayroll(game)) {
    if (!operating) record(game, officeLabel, 0);
    record(game, payrollLabel, -accruedPayroll(game));
    game.accruedPayroll = 0;
  }
  if (operating) collectSales(game);
  if (liquidateIfNeeded(game)) return;
  game.week++;
  const project = game.project;
  const members = project && !project.inspiration && project.age > 0 && project.age < projectWeeks(project) && funded
    ? game.crew.filter(member => project.allocation[member.role] > 0 && member.mood >= 45) : [];
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

function workOnProject(game, plan) {
  const { project } = game;
  const { design, content, art, test, promo } = plan;
  const designOutput = contribution(game, 'design', design);
  const contentOutput = contribution(game, 'content', content);
  const artOutput = contribution(game, 'art', art);
  const remainingContent = Math.max(0, project.scope - project.content);
  const finishing = project.age >= projectWeeks(project) - 2 || remainingContent === 0;
  const previousBugs = Math.min(project.bugs, defectLimit(project));
  const added = finishing ? 0 : Math.ceil((designOutput + Math.min(contentOutput, remainingContent) + artOutput) * .35);
  const repaired = Math.floor(contribution(game, 'test', test) * 2.5) +
    (finishing ? Math.ceil(assigned({ allocation: plan }) / 5) : 0);
  project.design += designOutput;
  project.content += contentOutput;
  project.art += artOutput;
  project.promo += contribution(game, 'promo', promo);
  project.bugs = Math.max(0, Math.min(defectLimit(project), previousBugs + added - repaired));
  project.bugDelta = project.bugs - previousBugs;
  project.quality ??= { staff: 0, equipment: 0, company: 0 };
  project.contributors ??= {};
  for (const member of game.crew) {
    if (plan[member.role] > 0) {
      project.contributors[member.id] = (project.contributors[member.id] ?? 0) + 1;
    }
  }
  for (const [source, value] of Object.entries(productionQuality(game))) project.quality[source] += value;
  project.age++;
  project.cost += weeklyCost(game);
  if (project.age === projectWeeks(project) - 1) {
    project.feedback = completion(project) < 55
      ? '目前可玩的内容偏少，试玩玩家想看到更多关卡和系统。'
      : project.bugs > 3
        ? '核心内容能吸引玩家，但频繁碰到缺陷。下周可以多安排测试。'
        : '当前版本玩起来流畅。玩家希望看到更鲜明的核心机制和视听表现。';
  }
}

function collectSales(game) {
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

export function assessProject(project) {
  const quality = Object.fromEntries(Object.entries(project.quality ?? {})
    .map(([source, total]) => [source, Math.round(total / Math.max(1, project.age) * 10) / 10]));
  const bonus = Object.values(quality).reduce((sum, value) => sum + value, 0);
  const scale = Math.sqrt(project.scope / 15);
  const polish = (work, target) => 53 * (1 - Math.exp(-work / (target * scale)));
  const finished = completion(project) / 100;
  const combination = evaluateCombination(project);
  const acceptedIdea = project.inspiration?.state === 'accepted' ? project.inspiration : null;
  const ideaField = acceptedIdea ? inspirationIdeas[acceptedIdea.role].field : null;
  const creativeBonus = field => (combination?.bonus ?? 0) + (ideaField === field ? 6 : 0);
  const ratings = {
    design: limit(38 + polish(project.design, 8) + bonus + creativeBonus('design')),
    content: limit(Math.min(finished * 100,
      finished * 82 + Math.min(7, Math.max(0, project.content / project.scope - 1) * 14) + bonus + creativeBonus('content'))),
    art: limit(38 + polish(project.art, 7.5) + bonus + creativeBonus('art')),
    stability: limit(limit(89 + bonus + (ideaField === 'stability' ? 6 : 0)) - Math.ceil(project.bugs * 7 / scale)),
  };
  const maximum = finished === 1 && project.bugs === 0 ? 100 : 99;
  const score = Math.min(maximum, totalScore(ratings));
  return { ratings, score, quality, scale, finished, combination, acceptedIdea, ideaField };
}

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
  const assessment = assessProject(project);
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
  const assessment = assessProject(project);
  const { ratings, score, quality, combination, acceptedIdea } = assessment;
  const demand = launchDemand(game, project, assessment);
  const { repeated, returningFans, sequelFans, seriesDemand } = demand;
  const { price, sales } = pricedLaunch(project, assessment, demand, tier);
  const growth = [];
  for (const member of game.crew) {
    const participation = project.contributors?.[member.id] ?? 0;
    if (!participation) continue;
    const improvement = score >= 70 ? Math.min(3, Math.max(1, Math.floor(participation / 3))) : 0;
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
    ...ratings, score, quality, sales, copies: 0, revenue: 0, price, basePrice: project.price, priceTier: tier, cost: project.cost, repeated,
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
