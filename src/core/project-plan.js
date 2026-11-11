import { concepts } from './project-catalog.js';

export const stories = {
  daily: '日常与成长',
  mystery: '悬疑调查',
  journey: '冒险旅程',
  sandbox: '无固定剧情',
};

export const artStyles = {
  pixel: '像素风',
  painted: '手绘插画',
  lowpoly: '低多边形',
  monochrome: '复古黑白',
};

const storyMotifs = { daily: '小镇', mystery: '暗号', journey: '远方', sandbox: '' };

export function suggestProjectName(game, draft, random = Math.random) {
  const pool = concepts[draft.type].names;
  const motif = storyMotifs[draft.story];
  const used = new Set([...game.games.map(title => title.name), draft.name]);
  const seriesPrefix = draft.seriesName ? [...draft.seriesName].slice(0, 11).join('') + ' ' + draft.episode + '：' : '';
  const candidates = seriesPrefix ? pool.map(name => seriesPrefix + name) :
    motif ? [...pool, ...pool.map(name => motif + '：' + name)] : pool;
  const available = candidates.filter(name => !used.has(name));
  if (available.length) return available[Math.floor(random() * available.length)];
  let edition = 2;
  const base = [...candidates[0]].slice(0, 18).join('');
  while (used.has(base + ' ' + edition)) edition++;
  return base + ' ' + edition;
}

export function projectNameError(game, name) {
  if (!name || [...name].length > 24 || /[\u0000-\u001f\u007f]/u.test(name)) {
    return '请输入 1 至 24 个字的作品名称。';
  }
  if (game.games.some(title => title.name === name)) return '已有同名作品，请换一个名字。';
  return '';
}
