import { adjust, advance, buyComputer, canAdvance, canPublish, canStartProject, dismissEmployee, endYear, establishStudio, hire, inheritanceOptions, launchPriceQuote, launchPriceTiers, liquidateIfNeeded, newStudio, productionStage, promotionQuote, publish, raiseEmployee, resolveStudioEvent, sequelQuote, startProject, startPromotion, startUpdate, updateQuote, updateWorkHours, upgradeCompany } from './core/studio.js';
import { availableCash, candidates, canHire, canRaise, monthlyPayroll, raiseAmount, replacementFor, requiredStaff, roles, staffCount, teamReady, weeklySalary } from './core/staff.js';
import { canInvest, investmentReserve, nextCompanyTier, nextComputerTier } from './core/company.js';
import { currentStudioEvent, eventEffects } from './core/events.js';
import { artStyles, projectNameError, stories, suggestProjectName } from './core/project-plan.js';
import { checkpointSlots, deleteSave, readCheckpoint, readSave, writeCheckpoint, writeSave } from './core/storage.js';
import { applyAudioSettings, playEffect, readAudioSettings, unlockAudio, writeAudioSettings } from './core/audio.js';
import { annual, archive, combinationPreview, liquidationScreen, procurement, projectPlanner, research, setup, team } from './modules/studio-screens.js';
import { autoSaveSummary, checkpointList, savePeriod, settingsScreen } from './modules/settings-screen.js';
import { celebrate } from './modules/milestones.js';
import { button, confirm, dismiss, el, escapeHtml, modal, money, selectChoice } from './ui.js?v=2';

const tabs = [['research','▦','研发'],['archive','▤','项目'],['annual','★','年度'],['team','▥','团队'],['procurement','▧','采购']];
const settingsTab = ['settings','⚙','设置'];
const weekDuration = 8000;
const breakEvenText = quote => quote.breakEvenWeek === null ? '预计销售期内无法回本' : '预计第 ' + quote.breakEvenWeek + ' 个销售周回本';
let game = readSave() ?? newStudio();
const audioSettings = readAudioSettings();
applyAudioSettings(audioSettings);
const canNavigate = () => canAdvance(game);
const nextRole = () => roles.find(([role]) => staffCount(game, role) < requiredStaff(role))?.[0] ?? 'design';
let tab = canNavigate() ? 'research' : 'team', selected = '', year = game.year;
let hiringRole = nextRole();
let speed = 1, elapsed = 0, lastFrame = performance.now();
let balanceFrame = 0, balanceTarget = game.cash;
let projectDraft = null;
let scene = 'title';

const screens = {
  research: () => research(game),
  archive: () => archive(game, selected),
  annual: () => annual(game, year),
  team: () => team(game, hiringRole),
  procurement: () => procurement(game),
};

function render(reset = false) {
  const screen = el('screen');
  const scroll = screen.scrollTop;
  const openDetails = reset ? [] : Array.from(screen.querySelectorAll('details'), details => details.open);
  el('company-name').textContent = game.companyName || '游戏工作室';
  el('day').textContent = '第 ' + game.year + ' 年 · ' + (game.week > 52 ? '年末' : 'W' + game.week);
  if (balanceTarget !== game.cash) {
    cancelAnimationFrame(balanceFrame);
    balanceFrame = 0;
    balanceTarget = game.cash;
    el('cash-balance').className = '';
  }
  if (!balanceFrame) el('cash-balance').textContent = money(game.cash);
  el('reputation').textContent = game.reputation;
  el('fan-count').textContent = Object.values(game.fans ?? {}).reduce((sum, value) => sum + value, 0);
  const navigable = Boolean(game.companyName) && canNavigate();
  if (game.liquidation) {
    screen.innerHTML = liquidationScreen(game);
    screen.scrollTop = 0;
  } else if (tab !== 'settings' || reset || !el('audio-volume')) {
    screen.innerHTML = tab === 'settings' ? settingsScreen(audioSettings, Boolean(game.companyName))
      : !game.companyName ? setup(game) : navigable ? screens[tab]() : team(game, hiringRole);
    screen.querySelectorAll('details').forEach((details, index) => { details.open = Boolean(openDetails[index]); });
    screen.scrollTop = reset ? 0 : scroll;
  }
  if (el('autosave-summary')) el('autosave-summary').innerHTML = autoSaveSummary();
  const visibleTabs = navigable ? [...tabs, settingsTab] : [['team','▥',game.companyName ? '团队' : '开局'], settingsTab];
  el('game-footer').hidden = Boolean(game.liquidation) || scene !== 'game';
  el('nav').innerHTML = visibleTabs.map(([id, icon, name]) =>
    '<button type="button" data-action="tab-' + id + '"' + (id === tab ? ' aria-current="page"' : '') +
    '><span aria-hidden="true">' + icon + '</span>' + name + '</button>').join('');
  renderSpeed();
  const eventEntry = el('event-entry');
  eventEntry.hidden = !game.pendingEvent;
  eventEntry.innerHTML = game.pendingEvent ? button('处理工作室事件 · 时间暂停','event',true) : '';
  screen.classList.toggle('is-running', Boolean(game.project && !game.pendingEvent && !game.liquidation));
}

function renderSpeed() {
  const controls = el('speed-controls');
  controls.hidden = !canAdvance(game);
  for (const control of controls.children) {
    control.setAttribute('aria-pressed', String(control.dataset.action === 'speed-' + speed));
  }
}

function availableSaves() {
  const auto = readSave();
  const entries = auto?.companyName ? [{ slot: 0, save: auto }] : [];
  for (const slot of checkpointSlots) {
    const save = readCheckpoint(slot);
    if (save?.companyName) entries.push({ slot, save });
  }
  return entries;
}

const saveLabel = slot => slot ? '手动存档 ' + slot : '自动存档';
const saveChoiceLabel = ({ slot, save }) => '<span class="save-choice-title">' + saveLabel(slot) + ' · ' +
  escapeHtml(save.companyName) + (save.liquidation ? ' · 已清算' : '') + '</span><span class="save-choice-details">' + escapeHtml(savePeriod(save)) +
  ' · 现金 ' + money(save.cash) + ' · 已发售 ' + save.games.length + ' 款</span>';

function confirmDeleteSave({ slot, save }, onResult) {
  modal('删除' + saveLabel(slot) + '？', escapeHtml(save.companyName) + ' · ' + escapeHtml(savePeriod(save)) +
    '。删除后无法恢复。', [['确认删除', () => {
      const current = slot ? readCheckpoint(slot) : readSave();
      if (JSON.stringify(current) !== JSON.stringify(save)) {
        onResult('这份存档已变化，请重新选择。');
        return;
      }
      const deleted = deleteSave(slot);
      onResult(deleted ? '已删除' + saveLabel(slot) + '。' : '删除失败，请检查浏览器存储。');
    }]]);
  el('modal').querySelector('[data-action="dismiss"]').focus();
}

function renderTitle() {
  const saves = availableSaves();
  el('enter-game').textContent = saves.length === 1 && saves[0].save.liquidation ? '查看清算' : saves.length ? '继续游戏' : '开始游戏';
  el('title-save').hidden = !saves.length;
  el('new-game').hidden = !saves.length;
  el('manage-saves').hidden = !saves.length;
  if (saves.length > 1) el('title-save').textContent = '有 ' + saves.length + ' 份存档可选';
  else if (saves.length === 1) {
    const { save } = saves[0];
    el('title-save').textContent = save.companyName + ' · ' + savePeriod(save) + (save.liquidation ? ' · 已清算' : '');
  }
}

function enterGame(entry) {
  if (scene !== 'title') return;
  scene = 'loading';
  el('title-screen').hidden = true;
  el('loading-screen').hidden = false;
  el('loading-title').focus();
  game = entry?.save ?? newStudio();
  if (entry?.slot || (game.liquidation && !game.autoSavedAt)) el('save-status').hidden = writeSave(game);
  tab = canNavigate() ? 'research' : 'team';
  year = game.year;
  hiringRole = nextRole();
  render(true);
  const transition = matchMedia('(prefers-reduced-motion: reduce)').matches ? 250 : 700;
  setTimeout(() => {
    el('loading-screen').hidden = true;
    scene = 'game';
    el('game-header').hidden = false;
    el('screen').hidden = false;
    el('game-footer').hidden = Boolean(game.liquidation);
    el('screen').focus();
    lastFrame = performance.now();
    requestAnimationFrame(tick);
  }, transition);
}

function save(reset = false) {
  const showLiquidation = liquidateIfNeeded(game) && !el('liquidation-title');
  if (showLiquidation) {
    elapsed = 0;
    showHiringStatus('');
  }
  el('save-status').hidden = writeSave(game);
  render(reset);
  if (showLiquidation) el('screen').focus();
}

function showHiringStatus(message, success = true) {
  const status = el('hire-status');
  status.hidden = !message;
  status.classList.toggle('loss', !success);
  status.textContent = message;
}

function animateBalance(opening, closing) {
  if (opening === closing || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const balance = el('cash-balance');
  cancelAnimationFrame(balanceFrame);
  balance.className = closing > opening ? 'credit' : 'debit';
  balance.textContent = money(opening);
  const started = performance.now();
  function count(now) {
    const progress = Math.min(1, Math.max(0, (now - started) / 650));
    balance.textContent = money(Math.round(opening + (closing - opening) * (1 - (1 - progress) ** 3)));
    if (progress < 1) balanceFrame = requestAnimationFrame(count);
    else {
      balanceFrame = 0;
      balance.className = '';
    }
  }
  balanceFrame = requestAnimationFrame(count);
}

function updateClock(delta) {
  if (scene !== 'game' || !canAdvance(game) || game.pendingEvent || document.hidden || el('dialog').open) return;
  elapsed += delta * speed;
  while (elapsed >= weekDuration) {
    elapsed -= weekDuration;
    const opening = game.cash;
    const wasReady = game.project && productionStage(game.project)[0] === 'ready';
    let awardDetail;
    advance(game);
    if (game.liquidation) {
      save();
      break;
    }
    if (game.week > 52) {
      const closedYear = game.year;
      if (year === game.year) year++;
      endYear(game);
      const winners = Object.values(game.years[closedYear]).map(([winner]) => winner);
      const ownWinners = winners.filter(id => id?.startsWith('own-'));
      if (ownWinners.length) awardDetail = '第 ' + closedYear + ' 年 · 工作室获得 ' + ownWinners.length + ' 项大奖';
    }
    save();
    animateBalance(opening, game.cash);
    if (game.pendingEvent) {
      elapsed = 0;
      openEvent();
    }
    if (!wasReady && game.project && productionStage(game.project)[0] === 'ready') {
      celebrate('ready', '《' + game.project.name + '》已可以发售');
    }
    if (awardDetail) celebrate('award', awardDetail);
    if (game.pendingEvent) break;
  }
}

function openEvent() {
  const event = currentStudioEvent(game);
  if (!event) return;
  const options = event.options.flatMap((option, index) => {
    if (option.cost && option.cost > availableCash(game)) return [];
    const effects = eventEffects(option);
    return [[option.name + (effects ? '（' + effects + '）' : ''), () => {
      if (resolveStudioEvent(game, index)) save();
    }, index === 0]];
  });
  const budgetNote = options.length < event.options.length ? ' 现金不足的选项暂不可选。' : '';
  modal(event.category + ' · ' + event.name, '发生原因 · ' + event.text + budgetNote, options);
}

function renderProjectPlanner() {
  el('modal').innerHTML = projectPlanner(game, projectDraft);
  if (projectDraft.step === 'name') el('project-name').value = projectDraft.name;
}

function tick(now) {
  updateClock(Math.max(0, now - lastFrame));
  lastFrame = now;
  requestAnimationFrame(tick);
}

const actions = {
  enter() {
    if (scene !== 'title') return;
    const saves = availableSaves();
    if (saves.length <= 1) {
      enterGame(saves[0]);
      return;
    }
    const options = saves.map(entry => [saveChoiceLabel(entry), () => enterGame(entry), entry.slot === 0]);
    modal('选择存档', '读取手动存档后，它会成为当前的自动存档。', options);
  },
  managesaves() {
    if (scene !== 'title') return;
    const saves = availableSaves();
    el('title-save-status').textContent = '';
    if (!saves.length) { renderTitle(); return; }
    const options = saves.map(entry => [saveChoiceLabel(entry), () => {
      confirmDeleteSave(entry, message => {
        renderTitle();
        el('title-save-status').textContent = message;
        (el('manage-saves').hidden ? el('enter-game') : el('manage-saves')).focus();
      });
    }]);
    modal('管理存档', '选择要删除的存档。', options);
  },
  newgame() {
    if (scene !== 'title') return;
    if (readSave()?.companyName) confirm('开始新游戏？', '成立新工作室后会替换当前自动存档。', () => enterGame());
    else enterGame();
  },
  event: openEvent,
  tab(id) {
    if (id !== 'team') showHiringStatus('');
    tab = id;
    if (id === 'annual') year = game.year;
    render(true);
  },
  start() {
    if (game.project || !teamReady(game)) return;
    projectDraft = { step: 'type', type: '', story: '', style: '', name: '' };
    renderProjectPlanner();
    el('dialog').showModal();
  },
  sequel(id) {
    const title = game.games.find(entry => entry.id === id);
    if (!title) return;
    const quote = sequelQuote(game, title);
    if (quote.reason) return;
    projectDraft = { step: 'style', type: quote.type, story: title.story ?? '', style: title.style ?? '',
      name: '', sequelOf: title.id, seriesName: quote.root.name, episode: quote.count + 1, inheritance: '' };
    renderProjectPlanner();
    el('dialog').showModal();
  },
  plantype(type) {
    if (!canStartProject(game, type)) return;
    if (projectDraft.type !== type) projectDraft.name = '';
    Object.assign(projectDraft, { step: 'style', type });
    renderProjectPlanner();
  },
  plantypes() {
    projectDraft.story = el('story').value;
    projectDraft.style = el('style').value;
    projectDraft.step = 'type';
    renderProjectPlanner();
  },
  planrandom() {
    projectDraft.name = el('project-name').value.trim();
    el('project-name').value = suggestProjectName(game, projectDraft);
    el('project-name-error').textContent = '';
  },
  planback() {
    projectDraft.name = el('project-name').value;
    projectDraft.step = 'style';
    renderProjectPlanner();
  },
  less(task) { if (game.project) { adjust(game, task, -1); save(); } },
  more(task) { if (game.project) { adjust(game, task, 1); save(); } },
  speed(rate) {
    speed = Number(rate);
    renderSpeed();
  },
  role(value) { hiringRole = value; render(true); },
  hire(id) {
    const candidate = candidates.find(person => person.id === id);
    if (!candidate || !canHire(game, candidate)) {
      showHiringStatus('招聘未成功，请检查招聘条件和现金余额。', false);
      return;
    }
    showHiringStatus('');
    const replaced = replacementFor(game, candidate);
    confirm((replaced ? '更换为' : '招聘') + candidate.name + '？', '立即支付 ' + money(candidate.fee) +
      '，新员工月薪 ' + money(candidate.monthlySalary) + '，入职后团队月薪合计 ' +
      money(monthlyPayroll(game) + candidate.monthlySalary - (replaced?.monthlySalary ?? 0)) + '。' + (replaced ? replaced.name + '将离开团队。' : ''), () => {
        if (!hire(game, id)) {
          showHiringStatus('招聘未成功，请检查招聘条件和现金余额。', false);
          return;
        }
        if (!teamReady(game) && staffCount(game, candidate.role) >= requiredStaff(candidate.role)) hiringRole = nextRole();
        save(true);
        const role = roles.find(([key]) => key === candidate.role)[1];
        showHiringStatus(replaced ? '换人成功 · ' + candidate.name + '已接替' + replaced.name + '的' + role + '岗位。' :
          '招聘成功 · ' + candidate.name + '已入职，岗位：' + role + '。');
      });
  },
  release(id) {
    const member = game.crew.find(person => person.id === id);
    if (!member) return;
    const staffingNote = staffCount(game, member.role) <= requiredStaff(member.role)
      ? '该岗位将出现空缺，补齐前不能立新项目。' : '';
    confirm('解雇' + member.name + '？', '将支付 ' + money(weeklySalary(member.monthlySalary)) +
      ' 作为补偿。离职前已计入的工资仍在发薪日支付。' + staffingNote, () => {
      if (dismissEmployee(game, id)) save();
    });
  },
  raise(id) {
    const member = game.crew.find(person => person.id === id);
    if (!member || !canRaise(game, member)) return;
    confirm('给' + member.name + '加薪？', '月薪增加 ' + money(raiseAmount(member)) +
      '，心情 +12，忠诚度 +10，最高均为 100。', () => {
      if (raiseEmployee(game, id)) save();
    });
  },
  upgrade(kind) {
    const company = kind === 'company';
    const item = company ? nextCompanyTier(game) : nextComputerTier(game);
    if (!canInvest(game, item)) return;
    confirm((company ? '升级为' : '采购') + item.name + '？', '一次性支付 ' + money(item.cost) +
      '，支付后需保留 ' + money(investmentReserve(game)) + ' 经营资金。评分加成从接下来的研发周算起。', () => {
      if (company ? upgradeCompany(game) : buyComputer(game)) save();
    });
  },
  publish() {
    if (!canPublish(game.project)) return;
    const options = Object.entries(launchPriceTiers).map(([tier, option]) => {
      const quote = launchPriceQuote(game, tier);
      return [option.name + ' ' + money(quote.price) + ' · 预计首周 ' + quote.copies + ' 份、回款 ' +
        money(quote.revenue) + ' · ' + breakEvenText(quote),
        () => {
          const title = publish(game, tier);
          if (!title) return;
          selected = title.id;
          tab = 'archive';
          save(true);
          celebrate('release', '《' + title.name + '》');
        }, tier === 'standard'];
    });
    modal('定价并发售', '选定价格后立即发售，满一周结算首笔回款。', options);
  },
  discount(value) {
    const separator = value.indexOf('-');
    const kind = value.slice(0, separator);
    const title = game.games.find(entry => entry.id === value.slice(separator + 1));
    const quote = promotionQuote(title, kind);
    if (!quote?.canStart) return;
    confirm('开始' + quote.name + '？', '售价 ' + money(quote.price) + '，持续 ' + quote.weeks +
      ' 周，预计每周销量增加 ' + Math.round((quote.salesRate - 1) * 100) + '%。每款作品可促销一次。', () => {
      if (startPromotion(title, kind)) save();
    });
  },
  postupdate(value) {
    const separator = value.indexOf('-');
    const kind = value.slice(0, separator);
    const title = game.games.find(entry => entry.id === value.slice(separator + 1));
    const quote = updateQuote(game, title, kind);
    if (!quote || quote.reason) return;
    confirm('安排' + quote.name + '？', '支付 ' + money(quote.cost) + '，制作 ' + quote.weeks +
      ' 周，每周占用 ' + updateWorkHours(quote) + ' 格工时。完成后' + quote.rating +
      '评分 +' + quote.gain + '。当前剩余 ' + quote.remaining + ' 周销售期。', () => {
      if (startUpdate(game, title, kind)) save();
    });
  },
  year(value) { year = Number(value); render(true); },
  detail(id) { selected = selected === id ? '' : id; render(); },
  previewsound() { playEffect('preview'); },
  savecheckpoint(value) {
    if (!game.companyName) return;
    const slot = Number(value);
    const statusId = 'checkpoint-status-' + slot;
    if (!el(statusId)) return;
    const storeCheckpoint = () => {
      const saved = writeCheckpoint(slot, game);
      if (saved) {
        el('checkpoint-list').innerHTML = checkpointList(true);
        document.querySelector('[data-action="savecheckpoint-' + slot + '"]').focus({ preventScroll: true });
      }
      el(statusId).textContent = saved ? '已保存到存档 ' + slot + '。' : '保存失败，请检查浏览器存储。';
    };
    if (readCheckpoint(slot)) confirm('覆盖存档 ' + slot + '？', '当前进度会替换这格存档。', storeCheckpoint);
    else storeCheckpoint();
  },
  loadcheckpoint(value) {
    const slot = Number(value);
    const statusId = 'checkpoint-status-' + slot;
    if (!el(statusId)) return;
    const saved = readCheckpoint(slot);
    if (!saved) {
      el(statusId).textContent = '读取失败，这格存档不可用。';
      return;
    }
    confirm('读取存档 ' + slot + '？', '读取后，这格存档会成为当前进度，并替换自动存档。', () => {
      if (!writeSave(saved)) {
        el(statusId).textContent = '读取失败，无法更新自动存档。';
        return;
      }
      game = saved;
      elapsed = 0;
      selected = '';
      projectDraft = null;
      year = game.year;
      hiringRole = nextRole();
      el('save-status').hidden = true;
      render();
      if (game.liquidation) { el('screen').focus(); return; }
      el('checkpoint-list').innerHTML = checkpointList(Boolean(game.companyName));
      document.querySelector('[data-action="loadcheckpoint-' + slot + '"]').focus({ preventScroll: true });
      el(statusId).textContent = '已读取存档 ' + slot + '。';
    });
  },
  deletecheckpoint(value) {
    const slot = Number(value);
    const save = readCheckpoint(slot);
    if (!save || !el('checkpoint-list')) return;
    confirmDeleteSave({ slot, save }, message => {
      el('checkpoint-list').innerHTML = checkpointList(Boolean(game.companyName));
      el('checkpoint-status-' + slot).textContent = message;
      document.querySelector('[data-action="savecheckpoint-' + slot + '"]').focus({ preventScroll: true });
    });
  },
  restart() {
    confirm('重新开局？', '当前工作室的进度、作品和奖项将被清空。', () => {
      game = newStudio();
      showHiringStatus('');
      elapsed = 0;
      speed = 1;
      projectDraft = null;
      tab = 'team';
      hiringRole = nextRole();
      selected = '';
      year = game.year;
      save(true);
    });
  },
  dismiss,
  choice: value => selectChoice(Number(value)),
};

document.addEventListener('visibilitychange', () => {
  lastFrame = performance.now();
  applyAudioSettings(audioSettings);
});

document.addEventListener('input', event => {
  if (event.target.id !== 'audio-volume') return;
  audioSettings.volume = Number(event.target.value);
  applyAudioSettings(audioSettings);
  el('volume-value').value = audioSettings.volume + '%';
  el('audio-preview').disabled = !audioSettings.volume || !audioSettings.effects;
});

document.addEventListener('change', event => {
  if (event.target.matches('#audio-volume, #audio-effects, #audio-music')) {
    audioSettings.effects = el('audio-effects').checked;
    audioSettings.music = el('audio-music').checked;
    applyAudioSettings(audioSettings);
    unlockAudio();
    el('audio-preview').disabled = !audioSettings.volume || !audioSettings.effects;
    el('audio-status').textContent = writeAudioSettings(audioSettings) ? '' : '声音设置保存失败。';
    return;
  }
  if (!event.target.matches('#story, #style') || !projectDraft) return;
  projectDraft.story = el('story').value;
  projectDraft.style = el('style').value;
  el('combination-preview').textContent = combinationPreview(game, projectDraft);
});

document.addEventListener('submit', event => {
  if (event.target.id === 'project-style-form') {
    event.preventDefault();
    const data = new FormData(event.target);
    const story = data.get('story');
    const style = data.get('style');
    if (!Object.hasOwn(stories, story) || !Object.hasOwn(artStyles, style)) return;
    if (projectDraft.sequelOf) {
      const inheritance = data.get('inheritance');
      if (!Object.hasOwn(inheritanceOptions, inheritance)) return;
      projectDraft.inheritance = inheritance;
    }
    Object.assign(projectDraft, { story, style, step: 'name' });
    if (projectDraft.sequelOf && !projectDraft.name) projectDraft.name = suggestProjectName(game, projectDraft);
    renderProjectPlanner();
    return;
  }
  if (event.target.id === 'project-name-form') {
    event.preventDefault();
    projectDraft.name = el('project-name').value.trim();
    const error = projectNameError(game, projectDraft.name);
    if (error || !startProject(game, projectDraft)) {
      el('project-name-error').textContent = error || '当前无法立项，请返回研发页检查预算和岗位。';
      return;
    }
    projectDraft = null;
    dismiss();
    tab = 'research';
    save(true);
    return;
  }
  if (event.target.id !== 'studio-setup') return;
  event.preventDefault();
  if (!establishStudio(game, el('studio-name').value)) {
    el('name-error').textContent = '请输入 1 至 12 个字的工作室名称。';
    el('studio-name').focus();
    return;
  }
  tab = 'team';
  hiringRole = nextRole();
  save(true);
});

document.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  const separator = action.indexOf('-');
  const name = separator < 0 ? action : action.slice(0, separator);
  if (scene === 'game' && game.liquidation && !['restart', 'choice', 'dismiss'].includes(name)) return;
  unlockAudio();
  if (name !== 'previewsound') playEffect();
  actions[name]?.(separator < 0 ? undefined : action.slice(separator + 1));
});

window.render_game_to_text = () => JSON.stringify({ scene, tab, selected, viewYear: year, speed, elapsed, audioSettings, ...game });
window.advanceTime = updateClock;
el('speed-controls').innerHTML = [1, 2, 4].map(rate => button(rate + '×', 'speed-' + rate)).join('');
renderTitle();
el('enter-game').disabled = false;
