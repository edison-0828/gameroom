import { adjust, advance, buyComputer, canAdvance, canPublish, dismissEmployee, endYear, establishStudio, hire, launchPriceQuote, launchPriceTiers, liquidateIfNeeded, newStudio, paydayRisk, productionStage, promotionQuote, publish, raiseEmployee, resolveStudioEvent, startPromotion, startUpdate, updateQuote, updateWorkHours, upgradeCompany } from './core/studio.js';
import { availableCash, candidates, canHire, canRaise, monthlyPayroll, raiseAmount, replacementFor, requiredStaff, roles, staffCount, teamReady, weeklySalary } from './core/staff.js';
import { canInvest, investmentReserve, nextCompanyTier, nextComputerTier } from './core/company.js';
import { currentStudioEvent, eventEffects } from './core/events.js';
import { readSave, writeSave } from './core/storage.js';
import { acceptCommission, cancelCommission, cancelTraining, commissionReason, commissions, sideWorkHours, startTraining, trainingQuote } from './core/side-work.js';
import { applyAudioSettings, playEffect, readAudioSettings, refreshAudioVisibility, unlockAudio, writeAudioSettings } from './core/audio.js';
import { annual } from './modules/screens/annual.js';
import { archive } from './modules/screens/archive.js';
import { liquidationScreen, setup } from './modules/screens/lifecycle.js';
import { procurement } from './modules/screens/procurement.js';
import { research } from './modules/screens/research.js';
import { team } from './modules/screens/team.js';
import { autoSaveSummary, settingsScreen } from './modules/settings-screen.js';
import { createSaveActions, renderTitle } from './modules/save-controls.js';
import { createProjectControls } from './modules/project-controls.js';
import { createGameClock } from './modules/game-clock.js';
import { celebrate } from './modules/milestones.js';
import { button, confirm, dismiss, el, modal, money, selectChoice } from './ui.js?v=2';

const tabs = [['research','▦','研发'],['archive','▤','项目'],['annual','★','年度'],['team','▥','团队'],['procurement','▧','采购']];
const settingsTab = ['settings','⚙','设置'];
const breakEvenText = quote => quote.breakEvenWeek === null ? '预计销售期内无法回本' : '预计第 ' + quote.breakEvenWeek + ' 个销售周回本';
const pauseMessages = {
  manual: '经营已暂停。',
  idle: '离席保护 · 长时间未操作，经营已暂停。',
  background: '离席保护 · 切到后台时已暂停。',
  payday: '发薪预警 · 下次结算可能导致清算。可先接委托或调整开支。',
};
let game = readSave() ?? newStudio();
const audioSettings = readAudioSettings();
applyAudioSettings(audioSettings);
const canNavigate = () => canAdvance(game);
const nextRole = () => roles.find(([role]) => staffCount(game, role) < requiredStaff(role))?.[0] ?? 'design';
let tab = canNavigate() ? 'research' : 'team', selected = '', year = game.year;
let hiringRole = nextRole();
let balanceFrame = 0, balanceTarget = game.cash;
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
}

function renderSpeed() {
  const controls = el('speed-controls');
  controls.hidden = !canAdvance(game);
  for (const control of controls.querySelectorAll('[data-action^="speed-"]')) {
    control.setAttribute('aria-pressed', String(control.dataset.action === 'speed-' + clock.speed));
  }
  const reason = clock.pauseReason;
  const toggle = el('pause-clock');
  toggle.textContent = reason ? '继续' : '暂停';
  toggle.setAttribute('aria-label', reason ? '继续经营' : '暂停经营');
  const status = el('clock-status');
  status.hidden = controls.hidden || !reason;
  status.textContent = status.hidden ? '' : pauseMessages[reason];
  status.classList.toggle('loss', reason === 'payday');
  el('screen').classList.toggle('is-running', Boolean(game.project && !game.pendingEvent && !game.liquidation && !reason));
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
    clock.start();
    if (document.hidden) pauseInBackground();
  }, transition);
}

function save(reset = false) {
  const showLiquidation = liquidateIfNeeded(game) && !el('liquidation-title');
  if (showLiquidation) {
    clock.resetElapsed();
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

function advanceWeek() {
  const opening = game.cash;
  const wasReady = game.project && productionStage(game.project)[0] === 'ready';
  let awardDetail;
  advance(game);
  if (game.liquidation) {
    save();
    return false;
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
    clock.resetElapsed();
    openEvent();
  }
  if (!wasReady && game.project && productionStage(game.project)[0] === 'ready') {
    celebrate('ready', '《' + game.project.name + '》已可以发售');
  }
  if (awardDetail) celebrate('award', awardDetail);
  return !game.pendingEvent;
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

const clock = createGameClock({
  canRun: () => scene === 'game' && canAdvance(game) && !game.pendingEvent && !document.hidden && !el('dialog').open,
  advanceWeek,
  paydayRisk: () => paydayRisk(game),
  onPauseChange: renderSpeed,
});

const projectControls = createProjectControls({
  getGame: () => game,
  onStart() {
    tab = 'research';
    save(true);
  },
});

const saveActions = createSaveActions({
  isTitle: () => scene === 'title',
  enterGame,
  getGame: () => game,
  loadGame(saved) {
    game = saved;
    clock.resetElapsed();
    selected = '';
    projectControls.reset();
    year = game.year;
    hiringRole = nextRole();
    el('save-status').hidden = true;
    render();
  },
});

const actions = {
  ...saveActions,
  ...projectControls.actions,
  event: openEvent,
  tab(id) {
    if (id !== 'team') showHiringStatus('');
    tab = id;
    if (id === 'annual') year = game.year;
    render(true);
  },
  less(task) { if (game.project) { adjust(game, task, -1); save(); } },
  more(task) { if (game.project) { adjust(game, task, 1); save(); } },
  speed(rate) {
    clock.setSpeed(Number(rate));
    renderSpeed();
  },
  pauseclock() {
    if (!canAdvance(game)) return;
    if (clock.pauseReason) clock.resume();
    else clock.pause('manual');
  },
  role(value) { hiringRole = value; render(true); },
  commission(kind) {
    if (commissionReason(game, kind)) return;
    const { name, weeks, reward } = commissions[kind];
    const role = Object.fromEntries(roles)[commissions[kind].role];
    confirm('接下「' + name + '」？', role + '每周占用 ' + sideWorkHours + ' 格工时，共 ' + weeks +
      ' 周。交付后一次到账 ' + money(reward) + '。', () => {
      if (acceptCommission(game, kind)) save();
    });
  },
  cancelcommission() {
    confirm('取消委托？', '取消后没有报酬，下一批委托将在 5 周后到达。', () => {
      if (cancelCommission(game)) save();
    });
  },
  training(id) {
    const member = game.crew.find(person => person.id === id);
    if (!member) return;
    const quote = trainingQuote(game, member);
    if (quote.reason) return;
    confirm('安排' + member.name + '参加「' + quote.name + '」？', '学费 ' + money(quote.cost) + '，' +
      quote.weeks + ' 周内每周占用 ' + sideWorkHours + ' 格工时。' +
      (quote.gain ? '结业后技术 +' + quote.gain + '。' : '结业后解锁自动化测试。'), () => {
      if (startTraining(game, id)) save();
    });
  },
  canceltraining() {
    confirm('停止培训？', '已支付的学费不退，本次培训也不会增加技术。', () => {
      if (cancelTraining(game)) save();
    });
  },
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
  async previewsound() {
    const status = el('audio-status');
    const playing = await unlockAudio() && playEffect('preview');
    if (status?.isConnected && audioSettings.effects && audioSettings.volume) {
      status.textContent = playing ? '' : '声音未能启动。请检查手机媒体音量，再点一次试听。';
    }
  },
  restart() {
    confirm('重新开局？', '当前工作室的进度、作品和奖项将被清空。', () => {
      game = newStudio();
      showHiringStatus('');
      clock.resetElapsed();
      clock.setSpeed(1);
      clock.resume();
      projectControls.reset();
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

function pauseInBackground() {
  if (scene === 'game' && canAdvance(game)) clock.pause('background');
}

document.addEventListener('visibilitychange', () => {
  clock.resetFrame();
  if (document.hidden) pauseInBackground();
  refreshAudioVisibility();
});
window.addEventListener('pagehide', pauseInBackground);
for (const event of ['pointerdown', 'keydown', 'wheel', 'touchmove']) {
  document.addEventListener(event, () => clock.interact(), { passive: true });
}

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
  projectControls.handleChange(event);
});

document.addEventListener('submit', event => {
  if (event.target.id !== 'studio-setup') {
    projectControls.handleSubmit(event);
    return;
  }
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
  clock.interact();
  const target = event.target.closest('[data-action], button:not(:disabled)');
  if (!target) return;
  const action = target.dataset.action ?? '';
  const separator = action.indexOf('-');
  const name = separator < 0 ? action : action.slice(0, separator);
  if (scene === 'game' && game.liquidation && !['restart', 'choice', 'dismiss'].includes(name)) return;
  if (name !== 'previewsound') unlockAudio().then(ready => { if (ready) playEffect(); });
  actions[name]?.(separator < 0 ? undefined : action.slice(separator + 1));
});

window.render_game_to_text = () => JSON.stringify({
  scene, tab, selected, viewYear: year, speed: clock.speed, elapsed: clock.elapsed, pauseReason: clock.pauseReason, audioSettings, ...game,
});
window.advanceTime = clock.advanceTime;
el('speed-controls').innerHTML = [1, 2, 4].map(rate => button(rate + '×', 'speed-' + rate)).join('') +
  '<button id="pause-clock" type="button" class="btn" data-action="pauseclock">暂停</button>';
renderTitle();
el('enter-game').disabled = false;
