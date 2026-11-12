import { calendarWeek } from './events.js';
import { commissionPaymentLabel, record } from './ledger.js';
import { availableCash, idleCost, staffCount, teamReady, technique } from './staff.js';

export const commissions = {
  test: { name: '试玩版兼容测试', role: 'test', weeks: 1, reward: 4800 },
  art: { name: '像素角色素材', role: 'art', weeks: 2, reward: 8000 },
  prototype: { name: '独立游戏原型', role: 'content', weeks: 2, reward: 9600 },
};
export const sideWorkHours = 2;
const commissionCooldown = 5;
const trainingCooldown = 6;
const trainingCost = 2200;
const trainingWeeks = 2;
export const automationCourse = '自动化测试';

function canSchedule(game) {
  return game.companyName && !game.liquidation && (game.operational || game.games.length || game.project || teamReady(game));
}

export function commissionReason(game, kind) {
  if (!Object.hasOwn(commissions, kind) || !game.companyName || game.liquidation) return '当前无法接单。';
  if (!canSchedule(game)) return '招齐初始团队后开放接单。';
  if (game.commission) return '工作室已有一笔在做的委托。';
  const wait = (game.nextCommissionWeek ?? 0) - calendarWeek(game);
  if (wait > 0) return '下一批委托还有 ' + wait + ' 周到达。';
  const { role } = commissions[kind];
  if (!commissionWorker(game, role, game.training?.memberId)) return '需要一名能接单的对应岗位员工。';
  return '';
}

export function acceptCommission(game, kind) {
  if (commissionReason(game, kind)) return false;
  game.commission = { kind, remaining: commissions[kind].weeks };
  return true;
}

export function cancelCommission(game) {
  if (!game.commission || game.liquidation) return false;
  game.commission = null;
  game.nextCommissionWeek = calendarWeek(game) + commissionCooldown;
  return true;
}

function commissionWorker(game, role, excludedId) {
  return game.crew.find(member => member.role === role && member.id !== excludedId);
}

export function trainingQuote(game, member) {
  const name = member.role === 'test' ? automationCourse : '岗位进修';
  const gain = Math.min(5, 100 - technique(member));
  let reason = '';
  if (!game.companyName || game.liquidation) reason = '当前无法培训。';
  else if (!canSchedule(game)) reason = '招齐初始团队后开放培训。';
  else if (game.training) reason = '已有员工正在培训。';
  else if (gain <= 0 && (member.role !== 'test' || game.automationTrained)) reason = '技术已满。';
  else if (calendarWeek(game) < (member.lastTrainingWeek ?? -Infinity) + trainingCooldown) reason = '距离上次结业不足 6 周。';
  else if (game.commission && commissions[game.commission.kind].role === member.role && staffCount(game, member.role) < 2) {
    reason = '该岗位正在交付委托。';
  } else if (availableCash(game) < trainingCost + idleCost(game)) reason = '需支付培训费并留足一周运营开支。';
  return { name, gain, cost: trainingCost, weeks: trainingWeeks, reason };
}

export function startTraining(game, memberId) {
  const member = game.crew.find(person => person.id === memberId);
  if (!member) return false;
  const quote = trainingQuote(game, member);
  if (quote.reason) return false;
  game.training = { memberId, remaining: quote.weeks };
  record(game, '培训报名 · ' + member.name + ' · ' + quote.name, -quote.cost);
  return true;
}

export function cancelTraining(game) {
  if (!game.training || game.liquidation) return false;
  game.training = null;
  return true;
}

export function sideWorkForWeek(game, funded) {
  const trainee = funded && game.crew.find(member => member.id === game.training?.memberId);
  const contractWorker = game.commission && commissionWorker(game, commissions[game.commission.kind].role, trainee?.id);
  const workers = [trainee, contractWorker].filter(Boolean);
  const hours = {};
  for (const member of workers) hours[member.role] = (hours[member.role] ?? 0) + sideWorkHours;
  return { trainee, contractWorker, workers, hours };
}

export function finishSideWorkWeek(game, { trainee, contractWorker }) {
  if (trainee && --game.training.remaining === 0) {
    const previous = technique(trainee);
    trainee.technique = Math.min(100, previous + 5);
    trainee.lastTrainingWeek = calendarWeek(game) + 1;
    if (trainee.role === 'test') game.automationTrained = true;
    game.training = null;
    game.lastTraining = { name: trainee.name, gain: trainee.technique - previous };
  }
  if (contractWorker && --game.commission.remaining === 0) {
    const { name, reward } = commissions[game.commission.kind];
    record(game, commissionPaymentLabel + name, reward);
    game.lastCommission = { name, reward };
    game.nextCommissionWeek = calendarWeek(game) + commissionCooldown + 1;
    game.commission = null;
  }
}
