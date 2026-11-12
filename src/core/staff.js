import { calendarWeek } from './events.js';

export const weeksPerMonth = 4;
export const weeklySalary = monthlySalary => monthlySalary / weeksPerMonth;
export const accruedPayroll = game => game.accruedPayroll ?? 0;
export const availableCash = game => game.cash - accruedPayroll(game);
export const weeksUntilPayday = game => weeksPerMonth - ((game.week - 1) % weeksPerMonth);

export const roles = [
  ['design', '产品'], ['content', '开发'], ['art', '美工'], ['test', '测试'], ['promo', '市场'],
];

export const grade = value => value >= 92 ? 'SSS' : value >= 80 ? 'SS' : value >= 65 ? 'S' : value >= 50 ? 'SR' : 'R';
export const technique = member => member.technique ?? [35, 42, 48][member.level - 1] ?? 35;
export const requiredStaff = role => role === 'content' ? 2 : 1;
export const roleLimit = (game, role) => requiredStaff(role) * 2 ** (game.companyLevel - 1);
export const staffLimit = game => 6 * 2 ** (game.companyLevel - 1);
export const staffCount = (game, role) => game.crew.filter(member => member.role === role).length;
export const teamReady = game => roles.every(([role]) => staffCount(game, role) >= requiredStaff(role));

export function foundingTeam() {
  return [
    ['design', '阿策', '稳重'], ['content', '小码', '专注'], ['art', '方糖', '随和'],
  ].map(([role, name, personality]) => ({
    id: 'founder-' + role, role, name, personality, level: 2, monthlySalary: 6400, mood: 80, loyalty: 85,
  }));
}

const names = [['林小满', '许知行'], ['周野', '陈墨', '余白'], ['唐栗', '顾青'], ['何宁', '苏禾'], ['江晴', '陆遥']];
const personalities = ['随和', '专注', '稳重'];

const advancedNames = [
  ['沈宁', '江遥', '顾言', '陆川'], ['林舟', '许墨', '陈屿', '方桥'],
  ['季晴', '孟青', '温梨', '桑晓'], ['黎安', '陆禾', '叶辰', '周宁'],
  ['唐音', '乔雨', '陶然', '程远'],
];

const starterCandidates = roles.flatMap(([role], index) => names[index].map((name, option) => {
  const level = [1 + index % 2, 3, 1][option];
  return {
    id: role + '-' + option, role, name, technique: [35, 42, 48][level - 1], unlock: 1,
    personality: personalities[(index + option) % personalities.length],
    mood: option === 0 ? 82 : 72, loyalty: option === 0 ? 78 : 64,
    fee: [1000, 1700, 2600][level - 1], monthlySalary: [2600, 3800, 5800][level - 1],
  };
}));
const namedCandidates = roles.flatMap(([role], index) =>
  advancedNames[index].map((name, rank) => ({
    id: role + '-pro-' + rank, role, name, technique: [58, 73, 87, 96][rank], unlock: rank + 2,
    personality: personalities[(index + rank) % personalities.length], mood: 76, loyalty: 73,
    fee: [3200, 5000, 7500, 11000][rank], monthlySalary: [6400, 8000, 10200, 13200][rank],
  })));
const surnames = ['林', '许', '顾', '沈', '陆', '陈', '苏', '乔'];
const givenNames = ['启', '川', '夏', '远', '宁', '清', '安', '星'];

export const candidates = [...starterCandidates, ...namedCandidates, ...namedCandidates.flatMap(person =>
  Array.from({ length: requiredStaff(person.role) * 2 ** (person.unlock - 1) }, (_, index) => ({
    ...person,
    id: person.id + '-pool-' + index,
    name: surnames[index % surnames.length] + givenNames[Math.floor(index / surnames.length)] +
      (['辰', '言', '舟', '然'][person.unlock - 2]),
    technique: person.technique + index % 4 - 2,
    fee: person.fee + (index % 4 - 2) * 150,
    monthlySalary: person.monthlySalary + (index % 4 - 2) * 200,
  })))];

export const capacity = game => game.crew.length * 2;
export const monthlyPayroll = game => game.crew.reduce((sum, member) => sum + member.monthlySalary, 0);
export const officeCost = (working = true) => working ? 1200 : 576;
export const weeklyCost = game => officeCost() + weeklySalary(monthlyPayroll(game));
export const idleCost = game => officeCost(false) + weeklySalary(monthlyPayroll(game));
export const raiseAmount = member => Math.max(400, Math.round(member.monthlySalary * .1 / 40) * 40);
export const canRaise = (game, member) => calendarWeek(game) >= (member.lastRaise ?? -Infinity) + 4 &&
  availableCash(game) >= 2 * (weeklyCost(game) + weeklySalary(raiseAmount(member)));

export function replacementFor(game, candidate) {
  const peers = game.crew.filter(member => member.role === candidate.role);
  if (peers.length < roleLimit(game, candidate.role)) return null;
  return peers.reduce((lowest, member) => technique(member) < technique(lowest) ? member : lowest);
}

export function canHire(game, candidate) {
  const replaced = replacementFor(game, candidate);
  const reserveWeeks = staffCount(game, candidate.role) >= requiredStaff(candidate.role) ? 4 : 2;
  return Boolean(game.companyName) && game.companyLevel >= candidate.unlock &&
    (!replaced || (candidate.unlock > 1 && technique(candidate) > technique(replaced))) &&
    !game.crew.some(member => member.id === candidate.id) &&
    availableCash(game) >= candidate.fee +
      (weeklyCost(game) + weeklySalary(candidate.monthlySalary - (replaced?.monthlySalary ?? 0))) * reserveWeeks;
}

export function contribution(game, role, work, crew = game.crew) {
  const specialists = crew.filter(member => member.role === role && member.loyalty >= 30)
    .sort((a, b) => technique(b) - technique(a));
  const staffed = Math.min(work, specialists.length * 2);
  return staffed + (work - staffed) * .55 + specialists.slice(0, Math.ceil(staffed / 2)).reduce((sum, member, index) =>
    sum + Math.min(2, staffed - index * 2) / 2 * technique(member) * (member.mood < 45 ? .006 : .012) *
      (1 + Math.min(5, member.experience?.[game.project?.type] ?? 0) * .03), 0);
}

export function updateTeam(game) {
  for (const member of game.crew) {
    const work = (game.project?.allocation[member.role] ?? 0) / staffCount(game, member.role);
    const comfortable = member.personality === '专注' ? 4 : 3;
    const moodChange = work >= comfortable ? -5 : member.personality === '随和' ? 4 : 2;
    member.mood = Math.max(0, Math.min(100, member.mood + moodChange));
    const loyaltyChange = member.mood < 45 ? -4 : member.mood >= 70 ? (member.personality === '稳重' ? 2 : 1) : 0;
    member.loyalty = Math.max(0, Math.min(100, member.loyalty + loyaltyChange));
  }
}
