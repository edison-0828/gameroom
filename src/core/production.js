import { availableCash, capacity, contribution, roles, staffCount, teamReady, technique, weeklyCost, weeklySalary } from './staff.js';
import { companyTier, computerTier } from './company.js';
import { artStyles, projectNameError, stories } from './project-plan.js';
import { concepts } from './project-catalog.js';
import { evaluateCombination, inspirationIdeas } from './creative.js';
import { record } from './ledger.js';
import { limit, reviewCeiling, totalScore } from './ratings.js';
import { updatedRatings } from './sales.js';

export const minimumDevWeeks = 4;

export const projectWeeks = project => project.minWeeks ?? minimumDevWeeks;
export const projectBudget = (game, concept) => weeklyCost(game) * projectWeeks(concept) + (concept.setupCost ?? 0);
export const canPublish = project => Boolean(project && project.age >= projectWeeks(project));
export const defectLimit = project => Math.ceil(6 + 5 * Math.sqrt(project.scope / 15));

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

export function reserveProjectHours(game, allocation, hours) {
  const plan = { ...allocation };
  for (const [role, amount] of Object.entries(hours)) plan[role] = Math.max(0, plan[role] - amount);
  const reserved = Object.values(hours).reduce((sum, amount) => sum + amount, 0);
  let excess = Math.max(0, assigned({ allocation: plan }) - capacity(game) + reserved);
  for (const [role] of roles) {
    const released = Math.min(excess, plan[role]);
    plan[role] -= released;
    excess -= released;
  }
  return plan;
}

export function canStartProject(game, type) {
  const concept = concepts[type];
  return !game.liquidation && Object.hasOwn(concepts, type) && Boolean(game.companyName) && teamReady(game) && !game.project &&
    game.companyLevel >= concept.unlock && (!concept.requiresAutomation || game.automationTrained) &&
    availableCash(game) >= projectBudget(game, concept) && game.week <= 52;
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

export function workOnProject(game, plan, occupiedWorkers = []) {
  const { project } = game;
  const { design, content, art, test, promo } = plan;
  const availableCrew = game.crew.filter(member => !occupiedWorkers.includes(member));
  const designOutput = contribution(game, 'design', design, availableCrew);
  const contentOutput = contribution(game, 'content', content, availableCrew);
  const artOutput = contribution(game, 'art', art, availableCrew);
  const remainingContent = Math.max(0, project.scope - project.content);
  const finishing = project.age >= projectWeeks(project) - 2 || remainingContent === 0;
  const previousBugs = Math.min(project.bugs, defectLimit(project));
  const added = finishing ? 0 : Math.ceil((designOutput + Math.min(contentOutput, remainingContent) + artOutput) * .35);
  const repaired = Math.floor(contribution(game, 'test', test, availableCrew) * 2.5) +
    (finishing ? Math.ceil(assigned({ allocation: plan }) / 5) : 0);
  project.design += designOutput;
  project.content += contentOutput;
  project.art += artOutput;
  project.promo += contribution(game, 'promo', promo, availableCrew);
  project.bugs = Math.max(0, Math.min(defectLimit(project), previousBugs + added - repaired));
  project.bugDelta = project.bugs - previousBugs;
  project.quality ??= { staff: 0, equipment: 0, company: 0 };
  project.contributors ??= {};
  for (const member of availableCrew) {
    if (plan[member.role] > 0) {
      project.contributors[member.id] = (project.contributors[member.id] ?? 0) + 1;
    }
  }
  for (const [source, value] of Object.entries(productionQuality(game, availableCrew))) project.quality[source] += value;
  project.age++;
  project.cost += weeklyCost(game) - occupiedWorkers.reduce((sum, member) => sum + weeklySalary(member.monthlySalary), 0);
  if (project.age === projectWeeks(project) - 1) {
    project.feedback = completion(project) < 55
      ? '目前可玩的内容偏少，试玩玩家想看到更多关卡和系统。'
      : project.bugs > 3
        ? '核心内容能吸引玩家，但频繁碰到缺陷。下周可以多安排测试。'
        : '当前版本玩起来流畅。玩家希望看到更鲜明的核心机制和视听表现。';
  }
}

export function assessProject(project, publishedCount) {
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
  const score = Math.min(maximum, totalScore(ratings), reviewCeiling(publishedCount));
  return { ratings, score, quality, scale, finished, combination, acceptedIdea, ideaField };
}

export function productionQuality(game, crew = game.crew) {
  const average = crew.reduce((sum, member) => sum + technique(member), 0) / Math.max(1, crew.length);
  return {
    staff: Math.max(0, (average - 30) * .22),
    equipment: computerTier(game).quality,
    company: companyTier(game).quality,
  };
}
