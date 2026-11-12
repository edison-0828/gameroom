import { canStartProject, inheritanceOptions, projectBudget, projectWeeks } from '../../core/studio.js';
import { companyLevels } from '../../core/company.js';
import { concepts, projectTypesAt } from '../../core/project-catalog.js';
import { artStyles, stories } from '../../core/project-plan.js';
import { audiences, combinationKey } from '../../core/creative.js';
import { button, card, escapeHtml, money } from '../../ui.js?v=2';
import { number, label } from './common.js';

export function projectPlanner(game, draft) {
  if (draft.step === 'type') {
    const activeLevel = concepts[draft.type]?.unlock ?? game.companyLevel;
    const choices = companyLevels.slice(0, game.companyLevel).map(({ name }, index) => {
      const level = index + 1;
      const types = projectTypesAt(level, game.automationTrained);
      return '<details class="project-tier"' + (level === activeLevel ? ' open' : '') +
        '><summary>Lv.' + level + ' ' + name + ' · ' + types.length + ' 种</summary>' +
        types.map(([id, concept]) => card('<h3>' + concept.genre + '</h3>' +
          '<p class="small">至少 ' + projectWeeks(concept) + ' 周 · 最低预算 ' + money(projectBudget(game, concept)) + '</p>' +
          '<p class="small">立项费 ' + money(concept.setupCost) + ' · 潜在市场 ' + number(concept.market) + ' 份</p>' +
          (canStartProject(game, id) ? button('选这个类型','plantype-' + id, true) :
            '<p class="loss small">当前预算不足。</p>'))).join('') + '</details>';
    }).join('');
    return '<div class="eyebrow">企划 1 / 3</div><h2 id="modal-title">选择游戏类型</h2>' +
      '<p>公司升级后会开放更多类型。</p>' +
      '<div class="project-type-list">' + choices + '</div>' + button('取消制作','dismiss');
  }
  const concept = concepts[draft.type];
  const select = (id, title, options) => '<label for="' + id + '">' + title + '</label>' +
    '<select id="' + id + '" name="' + id + '" required><option value="">请选择</option>' +
    Object.entries(options).map(([value, name]) =>
      '<option value="' + value + '"' + (draft[id] === value ? ' selected' : '') + '>' + name + '</option>').join('') + '</select>';
  if (draft.step === 'style') {
    const sequelOptions = draft.sequelOf ? '<p class="small">《' + escapeHtml(draft.seriesName) + '》系列第 ' +
      draft.episode + ' 作。可调整剧情和美术风格。</p>' + select('inheritance', '继承方向',
        Object.fromEntries(Object.entries(inheritanceOptions).map(([id, option]) => [id, option.name]))) +
      '<p class="small">' + Object.values(inheritanceOptions).map(option => option.name + '：' + option.detail).join('') + '</p>' : '';
    return '<div class="eyebrow">' + (draft.sequelOf ? '续作 1 / 2' : '企划 2 / 3') +
      '</div><h2 id="modal-title">选择剧情和美术风格</h2>' +
      '<p>已选类型：' + concept.genre + '</p><form id="project-style-form" class="project-form">' +
      sequelOptions +
      select('story', '剧情方向', stories) + select('style', '美术风格', artStyles) +
      '<p class="small" id="combination-preview">' + combinationPreview(game, draft) + '</p>' +
      '<button type="submit" class="btn primary">下一步：为作品起名</button>' +
      (draft.sequelOf ? button('取消制作','dismiss') : button('返回类型列表','plantypes')) + '</form>';
  }
  return '<div class="eyebrow">' + (draft.sequelOf ? '续作 2 / 2' : '企划 3 / 3') +
    '</div><h2 id="modal-title">为作品起名</h2>' +
    '<p>' + concept.genre + ' · ' + stories[draft.story] + ' · ' + artStyles[draft.style] +
    (draft.sequelOf ? ' · ' + inheritanceOptions[draft.inheritance].name : '') + '</p>' +
    '<form id="project-name-form" class="project-form"><label for="project-name">作品名称</label>' +
    '<input id="project-name" name="projectName" maxlength="48" required placeholder="输入名字，或使用下方随机取名">' +
    '<p class="loss small" id="project-name-error" role="status"></p>' +
    button('随机取名','planrandom') + '<button type="submit" class="btn primary">确认立项并开工</button>' +
    button('返回剧情和美术','planback') + '</form>';
}

export function combinationPreview(game, draft) {
  if (!draft.story || !draft.style) return '先选剧情和美术，再观察发售后的玩家反馈。';
  const discovery = game.discoveries?.[combinationKey(draft)];
  return discovery ? '已发现 · ' + discovery.label + ' · ' + audiences[discovery.audience].name + '偏好' :
    '未知搭配，发售后会记录玩家对这套组合的反馈。';
}
