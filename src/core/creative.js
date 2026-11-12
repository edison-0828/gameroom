export const audiences = {
  story: { name: '剧情玩家', focus: '内容与叙事', weights: { design: .20, content: .45, art: .25, stability: .10 } },
  strategy: { name: '策略玩家', focus: '机制与系统深度', weights: { design: .50, content: .25, art: .05, stability: .20 } },
  action: { name: '操作玩家', focus: '玩法手感与稳定性', weights: { design: .40, content: .15, art: .10, stability: .35 } },
  cozy: { name: '休闲玩家', focus: '视听表现与轻松体验', weights: { design: .15, content: .20, art: .40, stability: .25 } },
};

// Each type supports several familiar combinations. Unusual combinations can find a niche audience.
const preferences = {
  puzzle: ['strategy', ['mystery', 'sandbox'], ['pixel', 'monochrome']],
  sim: ['cozy', ['daily', 'sandbox'], ['pixel', 'painted']],
  platformer: ['action', ['journey', 'sandbox'], ['pixel', 'lowpoly']],
  rhythm: ['action', ['daily', 'sandbox'], ['pixel', 'lowpoly']],
  adventure: ['story', ['journey', 'mystery'], ['painted', 'pixel']],
  novel: ['story', ['daily', 'mystery'], ['painted', 'monochrome']],
  deck: ['strategy', ['journey', 'sandbox'], ['painted', 'pixel']],
  farming: ['cozy', ['daily', 'sandbox'], ['pixel', 'painted']],
  arcade: ['action', ['journey', 'sandbox'], ['lowpoly', 'pixel']],
  tactics: ['strategy', ['journey', 'mystery'], ['pixel', 'lowpoly']],
  roguelite: ['action', ['journey', 'sandbox'], ['pixel', 'lowpoly']],
  detective: ['story', ['mystery', 'daily'], ['monochrome', 'painted']],
  tower: ['strategy', ['journey', 'sandbox'], ['pixel', 'lowpoly']],
  metroid: ['action', ['journey', 'mystery'], ['pixel', 'painted']],
  city: ['strategy', ['daily', 'sandbox'], ['lowpoly', 'pixel']],
  survival: ['action', ['journey', 'sandbox'], ['lowpoly', 'pixel']],
  rpg: ['story', ['journey', 'mystery'], ['painted', 'pixel']],
  factory: ['strategy', ['daily', 'sandbox'], ['pixel', 'lowpoly']],
  horror: ['story', ['mystery', 'journey'], ['monochrome', 'lowpoly']],
  frontier: ['action', ['journey', 'sandbox'], ['lowpoly', 'painted']],
  space: ['strategy', ['journey', 'sandbox'], ['lowpoly', 'monochrome']],
  sandbox: ['cozy', ['sandbox', 'daily'], ['pixel', 'lowpoly']],
  ecosystem: ['cozy', ['sandbox', 'daily'], ['painted', 'lowpoly']],
  grand: ['strategy', ['journey', 'sandbox'], ['painted', 'lowpoly']],
  chain: ['strategy', ['mystery', 'sandbox'], ['pixel', 'lowpoly']],
};

const nicheCombinations = {
  'sim:mystery:monochrome': '深夜小店的秘密',
  'farming:mystery:painted': '田野里的悬案',
  'rhythm:mystery:monochrome': '用节拍破解暗号',
  'city:journey:painted': '会移动的城市',
  'factory:mystery:monochrome': '流水线背后的谜团',
  'horror:daily:painted': '温柔表象下的不安',
  'space:daily:pixel': '星际日常',
  'deck:daily:monochrome': '纸牌生活剧场',
};

export const combinationKey = project => [project.type, project.story, project.style].join(':');

export function evaluateCombination(project) {
  const preference = preferences[project.type];
  if (!preference || !project.story || !project.style) return null;
  const [audience, story, style] = preference;
  const niche = nicheCombinations[combinationKey(project)];
  if (niche) return { audience, label: niche, bonus: 3, market: .98, fans: 1.5, niche: true };
  const matches = Number(story.includes(project.story)) + Number(style.includes(project.style));
  return {
    audience, label: ['实验搭配', '有潜力的搭配', '风格契合'][matches],
    bonus: [-1, 1, 4][matches], market: [.97, 1, 1.06][matches], fans: 1, niche: false,
  };
}

const goodFeedback = {
  design: '核心机制很有意思，愿意反复尝试不同玩法。',
  content: '内容很充实，后半段也有值得探索的东西。',
  art: '画面和音乐很有辨识度，截图就能认出来。',
  stability: '玩起来很顺畅，没有频繁打断体验的问题。',
};
const weakFeedback = {
  design: '玩到后面变化不多，希望核心玩法再多一些层次。',
  content: '内容偏少，还没尽兴就结束了。',
  art: '画面和音效比较平，缺少让人记住的细节。',
  stability: '缺陷有点多，影响了正常体验。',
};

export function playerReviews(title) {
  return Object.entries(audiences).map(([id, audience]) => {
    const weighted = Object.entries(audience.weights).reduce((sum, [field, weight]) => sum + title[field] * weight, 0);
    const fit = title.combination?.audience === id;
    const rating = Math.max(0, Math.min(100, Math.round(weighted + (fit ? 3 : -2))));
    const important = Object.keys(audience.weights).filter(field => audience.weights[field] >= .2);
    const weakness = important.filter(field => title[field] < 65).sort((a, b) => title[a] - title[b])[0];
    const strength = [...important].sort((a, b) => title[b] - title[a])[0];
    const feedback = weakness ? weakFeedback[weakness] : title[strength] >= 78 ? goodFeedback[strength] : '整体能玩，但还需要一些打磨才能让人留下深刻印象。';
    const combination = fit && title.combination
      ? title.combination.niche ? '这个题材组合很特别，正好对我的胃口。' : title.combination.bonus >= 4 ? '题材、剧情和画面很搭。' : ''
      : '';
    return { audience: id, rating, text: combination + feedback };
  });
}

export const inspirationIdeas = {
  design: { name: '让核心机制多一种解法', field: 'design', label: '玩法评分' },
  content: { name: '补上一条隐藏支线', field: 'content', label: '内容评分' },
  art: { name: '加入一组标志性演出', field: 'art', label: '美术与音效评分' },
  test: { name: '重新梳理易出错的交互', field: 'stability', label: '稳定性评分' },
  promo: { name: '做一段更有记忆点的试玩宣传', field: 'promo', label: '首周曝光' },
};
