import { audiences, inspirationIdeas } from './creative.js';

export const calendarWeek = game => (game.year - 1) * 52 + game.week;
export const studioEventChance = .07;
export const studioEventCooldown = 6;
export const resignationMood = 20;

export const studioEvents = {
  interview: {
    category: '口碑', name: '媒体约访', text: '一家游戏媒体想参观工作室。团队担心临时准备会打乱手头的安排。',
    options: [
      { name: '接受约访', reputation: 5, mood: -6 },
      { name: '改发书面采访', reputation: 2, loyalty: 3 },
    ],
  },
  demo: {
    category: '口碑', name: '试玩反馈集中涌入', text: '玩家在社区汇总了一批意见，希望工作室公开回应。',
    options: [
      { name: '整理并公开改进计划', reputation: 4, mood: -5, loyalty: 2 },
      { name: '请外部协助整理', cost: 2200, reputation: 3, mood: 5 },
      { name: '先按内部计划推进', reputation: -3, mood: 4 },
    ],
  },
  crunch: {
    category: '员工', name: '团队需要喘口气', text: '员工提出希望安排一次团建，或者留出弹性休息时间。',
    options: [
      { name: '出资组织团建', cost: 2500, mood: 12, loyalty: 6 },
      { name: '给团队弹性休息', mood: 7, loyalty: 3, reputation: -2 },
      { name: '维持当前安排', mood: -7, loyalty: -4 },
    ],
  },
  meetup: {
    category: '口碑', name: '同行交流会', text: '本地开发者邀请工作室分享经验，公开活动能带来曝光，但也需要团队准备。',
    options: [
      { name: '派团队参加分享', reputation: 4, mood: -4, loyalty: 4 },
      { name: '仅安排内部交流', mood: 6, loyalty: 2 },
    ],
  },
  spotlight: {
    category: '市场', name: '商店首页推荐', text: '编辑在整理本周推荐时注意到了工作室的在售作品。',
    options: [
      { name: '投入预算配合推荐', cost: 2200, market: 20, weeks: 3 },
      { name: '接受基础推荐', market: 8, weeks: 2 },
    ],
  },
  slowdown: {
    category: '市场', name: '发售档期遇冷', text: '几款热门大作集中发售，占走了玩家的注意力，工作室的在售作品曝光下降。',
    options: [
      { name: '追加宣传争取曝光', cost: 2500, market: -7, weeks: 3 },
      { name: '节省预算，等热度过去', market: -20, weeks: 3 },
    ],
  },
};

export const marketEffect = (game, week = calendarWeek(game)) =>
  game.marketTrend && week <= game.marketTrend.until ? game.marketTrend.percent : 0;

export function eventEffects(option) {
  const signed = number => (number > 0 ? '+' : '') + number;
  const personal = option.memberId ? '当事员工' : '';
  const effects = [['口碑', option.reputation], [personal + '心情', option.mood], [personal + '忠诚度', option.loyalty]]
    .filter(([, value]) => value).map(([name, value]) => name + ' ' + signed(value));
  if (option.fans) effects.push(audiences[option.audience].name + '粉丝 ' + signed(option.fans));
  if (option.market) effects.push(option.weeks + ' 周内在售销量 ' + signed(option.market) + '%');
  if (option.departure) effects.push(option.memberName + '离职');
  if (option.cost) effects.push('支出 ¥' + option.cost.toLocaleString('zh-CN'));
  return effects.join('，');
}

function fanEvent(game) {
  const { audience } = game.eventContext;
  const name = audiences[audience].name;
  const count = game.fans?.[audience] ?? 0;
  const withFans = option => ({ ...option, audience });
  const bonus = rate => Math.min(1200, Math.max(10, Math.round(count * rate)));
  if (game.pendingEvent === 'fanShare') {
    return { category: '粉丝', name: '粉丝自发推荐', text: name + '在社区分享了作品攻略和创作心得，带来了一批新玩家。',
      options: [
        withFans({ name: '发布幕后分享回应粉丝', fans: bonus(.15), reputation: 3, mood: -3 }),
        withFans({ name: '感谢分享者', fans: bonus(.07), reputation: 1 }),
      ] };
  }
  return { category: '粉丝', name: '粉丝对沟通不满', text: name + '觉得反馈长期没有回应，一些粉丝准备离开。',
    options: [
      withFans({ name: '安排公开问答', cost: 1200, fans: bonus(.05), reputation: 2 }),
      withFans({ name: '发一份简短说明', fans: -Math.min(count, Math.ceil(count * .05)), reputation: 1 }),
      withFans({ name: '保持沉默', fans: -Math.min(count, Math.ceil(count * .18)), reputation: -4 }),
    ] };
}

function employeeEvent(game) {
  const { memberId, memberName } = game.eventContext;
  const member = game.crew.find(person => person.id === memberId);
  const withMember = option => ({ ...option, memberId, memberName });
  if (!member) return { category: '员工', name: '员工情况已变化', text: memberName + '已经离开团队，无需再处理此事。',
    options: [{ name: '确认' }] };
  if (game.pendingEvent === 'resignation') {
    return { category: '员工', name: memberName + '提出离职', text: memberName + '的心情已降至 ' + member.mood +
      '，希望离开团队。留任需要支付奖金并安排休整。', options: [
      withMember({ name: '支付奖金并安排休整', cost: member.monthlySalary / 2, mood: 30, loyalty: 12 }),
      withMember({ name: '同意离职', departure: true }),
    ] };
  }
  if (game.pendingEvent === 'headhunt') {
    return { category: '员工', name: memberName + '收到挖角邀约', text: '另一家工作室开出了更好的条件。' +
      memberName + '希望工作室给出留任方案。',
    options: [
      withMember({ name: '支付留任奖金', cost: member.monthlySalary / 2, mood: 12, loyalty: 18 }),
      withMember({ name: '接受离职', departure: true, reputation: -1 }),
    ] };
  }
  return { category: '员工', name: memberName + '对工作安排不满', text: memberName + '觉得当前工作压力太大，希望调整安排。',
    options: [
      withMember({ name: '提供补助并安排休整', cost: Math.max(500, Math.round(member.monthlySalary / 8)), mood: 14, loyalty: 7 }),
      withMember({ name: '按原计划推进', mood: -10, loyalty: -7 }),
    ] };
}

export function currentStudioEvent(game) {
  if (game.pendingEvent === 'fanShare' || game.pendingEvent === 'fanBacklash') return fanEvent(game);
  if (['discontent', 'headhunt', 'resignation'].includes(game.pendingEvent)) return employeeEvent(game);
  if (game.pendingEvent !== 'inspiration') return studioEvents[game.pendingEvent];
  const idea = game.project?.inspiration;
  if (!idea || idea.state !== 'pending') return null;
  const effect = inspirationIdeas[idea.role];
  return {
    category: '员工',
    name: '员工灵感 · ' + idea.memberName,
    text: idea.memberName + '提出了「' + effect.name + '」。采纳需要多开发 1 周，并支付 ' + idea.cost +
      '。预计' + effect.label + (effect.field === 'promo' ? '提升约 8%。' : ' +6。'),
    options: [
      { name: '采纳创意', cost: idea.cost, mood: 5, loyalty: 4, memberId: idea.memberId },
      { name: '先完成当前范围', mood: 1, loyalty: 1, memberId: idea.memberId },
    ],
  };
}

export function rollStudioEvent(game, { hasSales, inspiration }, random = Math.random) {
  const week = calendarWeek(game);
  const last = game.lastEventWeek ?? (game.eventHistory?.[0] ? calendarWeek(game.eventHistory[0]) : -Infinity);
  if (game.pendingEvent || week - last <= studioEventCooldown || random() >= studioEventChance) return;
  const choices = [{ id: 'interview' }, { id: 'meetup' }];
  if (game.project || hasSales) choices.push({ id: 'demo' });
  if (game.crew.length) choices.push({ id: 'crunch' });
  if (hasSales && !marketEffect(game)) choices.push({ id: 'spotlight' }, { id: 'slowdown' });
  const audience = Object.keys(audiences).sort((a, b) => (game.fans?.[b] ?? 0) - (game.fans?.[a] ?? 0))[0];
  if ((game.fans?.[audience] ?? 0) > 0) {
    choices.push({ id: 'fanShare', context: { audience } }, { id: 'fanBacklash', context: { audience } });
  }
  const unhappy = game.crew.filter(member => member.mood < 75 || member.loyalty < 70)
    .sort((a, b) => a.mood - b.mood)[0];
  if (unhappy) choices.push({ id: 'discontent', context: { memberId: unhappy.id, memberName: unhappy.name } });
  const recruited = game.crew.filter(member => member.loyalty < 80 || member.technique >= 65)
    .sort((a, b) => a.loyalty - b.loyalty)[0];
  if (recruited) choices.push({ id: 'headhunt', context: { memberId: recruited.id, memberName: recruited.name } });
  if (inspiration) choices.push({ id: 'inspiration' });
  const eligible = choices.filter(choice => choice.id !== game.eventHistory?.[0]?.id);
  const resignation = game.crew.filter(member => member.mood <= resignationMood)
    .sort((a, b) => a.mood - b.mood || a.loyalty - b.loyalty)[0];
  const choice = resignation && game.eventHistory?.[0]?.id !== 'resignation'
    ? { id: 'resignation', context: { memberId: resignation.id, memberName: resignation.name } }
    : eligible[Math.floor(random() * eligible.length)];
  game.pendingEvent = choice.id;
  game.eventContext = choice.context ?? null;
  game.lastEventWeek = week;
}
