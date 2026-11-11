import { activeUpdate, assessProject, assigned, awardFinalists, awards, canPublish, canStartProject, canWorkOnUpdate, completion, firstWeekSales, inheritanceOptions, latestSettlement, launchPriceTiers, onSale, productionQuality, productionStage, projectBudget, projectWeeks, promotionQuote, promotionTypes, releaseDate, rivalCalendar, salesDuration, sequelQuote, standings, tasks, updatedRatings, updateQuote, updateTypes, updateWorkHours } from '../core/studio.js';
import { calendarWeek, marketEffect, resignationMood } from '../core/events.js';
import { accruedPayroll, availableCash, candidates, canHire, canRaise, capacity, grade, monthlyPayroll, officeCost, raiseAmount, replacementFor, roleLimit, roles, staffCount, staffLimit, teamReady, technique, weeklyCost, weeksUntilPayday } from '../core/staff.js';
import { canInvest, companyLevels, companyTier, computerTier, investmentReserve, nextCompanyTier, nextComputerTier } from '../core/company.js';
import { concepts, projectTypesAt } from '../core/project-catalog.js';
import { artStyles, stories } from '../core/project-plan.js';
import { audiences, combinationKey, inspirationIdeas } from '../core/creative.js';
import { button, card, escapeHtml, format, money } from '../ui.js?v=2';

const number = value => format.format(value);
const line = (label, value, own = false) =>
  '<div class="line' + (own ? ' own-title' : '') + '"><span>' + label + '</span><b>' + value + '</b></div>';
const label = text => '<span class="tag">' + text + '</span>';

function office() {
  return '<div class="office" aria-hidden="true"><svg viewBox="0 0 160 46" shape-rendering="crispEdges"><path fill="#31325a" d="M0 33h160v13H0z"/><path fill="#595278" d="M0 35h160v2H0z"/><path fill="#343759" d="M11 5h35v24H11z"/><path fill="#80adc0" d="M13 7h31v20H13z"/><path fill="#aee0d6" d="M14 8h29v10H14z"/><path fill="#6d8fac" d="M15 21h7v-5h6v6h6v-8h7v12H15z"/><path fill="#343759" d="M27 6h3v22h-3z"/><path fill="#b48171" d="M53 30h88v4H53zM57 34h4v9h-4zM133 34h4v9h-4z"/><path fill="#22243e" d="M64 15h24v13H64zM74 28h4v2h-4zM110 15h24v13h-24zM120 28h4v2h-4z"/><path fill="#8ed7b3" d="M66 17h20v9H66zM112 17h20v9h-20z"/><path fill="#416f69" d="M68 19h10v1H68zM68 22h14v1H68zM114 19h14v1h-14zM114 22h9v1h-9z"/><path fill="#efb38e" d="M94 22h9v8h-9z"/><path fill="#554064" d="M93 19h11v5H93zM96 31h6v8h-6z"/><path fill="#efc47e" d="M145 29h6v5h-6z"/><path fill="#73ac87" d="M144 24h3v5h-3zM148 21h3v8h-3zM151 24h3v3h-3z"/></svg></div>';
}

export function setup(game) {
  return '<section class="card hero">' + office() + '<div class="hero-copy">' +
    '<div class="eyebrow">第 1 步 / 成立工作室</div><h2>成立游戏工作室</h2>' +
    '<p class="small">启动资金 ' + money(game.cash) + '。给团队取个名字，下一步开始招人。</p>' +
    '<form id="studio-setup"><label for="studio-name">工作室名称</label>' +
    '<div class="studio-name-field"><input id="studio-name" name="name" placeholder="例如：像素岛" maxlength="15" required>' +
    '<span>工作室</span></div><p class="loss small" id="name-error" role="status"></p>' +
    '<button type="submit" class="btn primary">成立工作室</button></form></div></section>';
}

export function liquidationScreen(game) {
  const { year, week } = game.liquidation;
  return '<section class="card liquidation-panel" aria-labelledby="liquidation-title">' +
    '<h2 id="liquidation-title">工作室已清算</h2>' +
    '<p class="small">现金已耗尽，本局经营结束。</p>' +
    line('清算时间', '第 ' + year + ' 年 · 第 ' + Math.min(week, 52) + ' 周') +
    line('剩余现金', '<span class="loss">' + money(game.cash) + '</span>') +
    line('已发售作品', game.games.length + ' 款') + button('重新开局', 'restart', true) + '</section>';
}

export function projectPlanner(game, draft) {
  if (draft.step === 'type') {
    const activeLevel = concepts[draft.type]?.unlock ?? game.companyLevel;
    const choices = companyLevels.slice(0, game.companyLevel).map(({ name }, index) => {
      const level = index + 1;
      const types = projectTypesAt(level);
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

function projectSetting(project) {
  return [stories[project.story], artStyles[project.style]].filter(Boolean).map(label).join('');
}

export function research(game) {
  const p = game.project;
  const cost = weeklyCost(game);
  const slots = capacity(game);
  if (!p) {
    if (!teamReady(game)) return card('<div class="eyebrow">第 2 步 / 招聘员工</div><h2>招齐团队再立项</h2>' +
      '<p class="small">需要开发 2 名，产品、美工、测试、市场各 1 名。</p>' + button('前往招聘','tab-team',true));
    return '<section class="card hero">' + office() + '<div class="hero-copy">' +
      '<div class="eyebrow">第 3 步 / 制定项目</div><h2>研发工作室</h2>' +
      button('制作游戏','start',true) + '</div></section>';
  }
  const progress = completion(p);
  const weeks = projectWeeks(p);
  const quality = productionQuality(game);
  const [phase, stage, description] = productionStage(p);
  const score = p.age > 0 ? assessProject(p).score : null;
  const updating = activeUpdate(game);
  return '<section class="card stage-panel stage-' + phase + '">' +
    '<div class="stage-display"><div class="pixel-monitor" aria-hidden="true"><i></i><i></i><i></i></div><div>' +
    '<div class="eyebrow">PRODUCTION / W' + Math.min(game.week, 52) + '</div><h2>' + stage + '</h2>' +
    '<p class="small">' + description + '</p></div></div><h3 class="project-title">' + escapeHtml(p.name) + '</h3>' +
    '<p class="small">' + p.genre + ' · 已开发 ' + p.age + ' 周</p>' +
    '<p class="small">本作尚未发售。发售满一周后结算首笔销售回款。</p>' +
    '<div class="badges">' + projectSetting(p) + label('技术 +' + quality.staff.toFixed(1)) + label('设备 +' + quality.equipment) +
    label('公司 +' + quality.company) + '</div>' +
    '<div class="phase-steps" aria-label="制作阶段">' + ['开发', '测试', '改 BUG', '可发售'].map((name, index) =>
      '<span' + (['build','test','fix','ready'][index] === phase ? ' aria-current="step"' : '') + '>' + name + '</span>'
    ).join('') + '</div>' +
    '<div class="progress-label">制作周期 <b>' + Math.min(p.age, weeks) + ' / ' + weeks + ' 周</b></div>' +
    '<progress aria-label="最低制作周期" value="' + Math.min(p.age, weeks) + '" max="' + weeks + '"></progress>' +
    '<div class="progress-label">内容完成度 <b>' + progress + '%</b></div>' +
    '<progress aria-label="内容完成度" value="' + progress + '" max="100"></progress>' +
    '<div class="badges">' + label('缺陷 ' + p.bugs) +
    (p.bugDelta < 0 ? label('上周减少 ' + -p.bugDelta + ' 个缺陷') : '') +
    label('现金可撑 ' + Math.max(0, Math.floor(availableCash(game) / cost)) + ' 周') +
    label(p.age < p.deadline ? '距研发目标 ' + (p.deadline - p.age) + ' 周' :
      p.age === p.deadline ? '到达研发目标周' : '已超出目标 ' + (p.age - p.deadline) + ' 周') + '</div>' +
    (score !== null ? '<div class="progress-label release-quality">当前发售预估评分 <b>' + score + ' / 100</b></div>' : '') +
    (canPublish(p) ? button('定价并发售','publish',true) : '') + '</section>' +
    (p.series ? card('<h3>系列续作</h3><p class="small">' + inheritanceOptions[p.series.inheritance].name +
      '。系列口碑 ' + p.series.trust + '，预计有 ' + p.series.followers + ' 位系列粉丝支持首周销量。</p>') : '') +
    (updating && canWorkOnUpdate(game, updating) ? card('<p class="small">团队同时在为《' + escapeHtml(updating.name) +
      '》制作更新。本周将从新作分出 ' + updateWorkHours(updateTypes[updating.update.kind]) + ' 格工时。</p>') : '') +
    (p.inspiration?.state === 'accepted' ? card('<h3>已采纳员工灵感</h3><p class="small">' +
      escapeHtml(p.inspiration.memberName) + ' · ' + inspirationIdeas[p.inspiration.role].name +
      '。制作周期增加 1 周，完成后获得额外加成。</p>') : '') +
    (p.feedback ? card('<h3>试玩反馈</h3><p class="small">' + p.feedback + '</p>') : '') +
    (availableCash(game) < cost ? card('<p>现金不足，研发暂停。' + (game.games.some(onSale) ? '在售作品会按周回款。' :
      canPublish(p) ? '可以发售现有版本。' : '可以重新开局。') + '</p>' + button('重新开局','restart')) : '') +
    (game.week <= 52 ? '<details class="card work-plan"><summary>本周工时 <span class="small">' + assigned(p) + ' / ' + slots + '</span></summary>' +
      tasks.map(([id, name, desc]) => '<div class="task"><div><b>' + name + '</b><p class="small">' + desc +
        '</p></div><div class="stepper"><button type="button" data-action="less-' + id + '" aria-label="减少' + name +
        '工时"' + (p.allocation[id] === 0 ? ' disabled' : '') + '>−</button><b>' + p.allocation[id] +
        '</b><button type="button" data-action="more-' + id + '" aria-label="增加' + name + '工时"' +
        (assigned(p) === slots ? ' disabled' : '') + '>+</button></div></div>').join('') + '</details>' : '');
}

function updateDetails(game, title) {
  const update = title.update;
  if (update) {
    const type = updateTypes[update.kind];
    const progress = update.status === 'working'
      ? (canWorkOnUpdate(game, title) ? '制作中' : '等待员工或运营资金') + ' · 剩余 ' + update.remaining + ' 周'
      : update.status === 'released' ? '已发布 · ' + type.rating + ' +' + update.gain : '销售期结束，更新未完成';
    return '<section class="creative-result"><h3>' + type.name + '</h3><p class="small">' + progress + '</p>' +
      line('更新支出', money(update.cost)) + (update.status === 'released' ?
        line('更新后评分', updatedRatings(title).score + ' / 100') +
        line('更新额外销量', number(update.extraCopies) + ' 份') +
        line('更新额外回款', money(update.extraRevenue ?? update.extraCopies * title.price)) : '') + '</section>';
  }
  if (!onSale(title)) return '';
  if (!title.salesWeeks) return '<p class="small">首周销售结算后可安排一次更新。</p>';
  return '<section class="creative-result"><h3>发售后更新</h3><p class="small">距下架还剩 ' +
    (salesDuration - title.salesWeeks) + ' 周。本作可选一次更新，制作期间会占用团队工时。</p>' +
    Object.keys(updateTypes).map(kind => {
      const quote = updateQuote(game, title, kind);
      return '<div class="purchase-option"><h3>' + quote.name + '</h3><p class="small">' +
        quote.rating + ' +' + quote.gain + ' · ' + quote.weeks + ' 周 · 每周 ' + updateWorkHours(quote) + ' 格工时</p>' +
        line('更新费用', money(quote.cost)) +
        (quote.reason ? '<p class="small">' + quote.reason + '</p>' :
          line('预计额外回款', money(quote.extraRevenue)) + button('安排' + quote.name, 'postupdate-' + kind + '-' + title.id, true)) +
        '</div>';
    }).join('') + '</section>';
}

function promotionDetails(title) {
  const promotion = title.promotion;
  if (promotion) {
    const type = promotionTypes[promotion.kind];
    const quote = promotionQuote(title, promotion.kind);
    const totals = promotion.history.reduce((sum, entry) => ({
      copies: sum.copies + entry.copies, regularCopies: sum.regularCopies + entry.regularCopies,
      revenue: sum.revenue + entry.revenue, regularRevenue: sum.regularRevenue + entry.regularRevenue,
    }), { copies: 0, regularCopies: 0, revenue: 0, regularRevenue: 0 });
    const difference = totals.revenue - totals.regularRevenue;
    return '<section class="creative-result"><h3>' + type.name + '</h3><p class="small">' +
      (promotion.remaining ? '进行中 · 剩余 ' + promotion.remaining + ' 周 · 促销价 ' + money(quote.price) : '促销已结束') + '</p>' +
      (promotion.history.length ? line('促销期销量', number(totals.copies) + ' 份') +
        line('原价销量估算', number(totals.regularCopies) + ' 份') +
        line('促销期回款', money(totals.revenue)) + line('原价回款估算', money(totals.regularRevenue)) +
        line('促销带来的回款变化', (difference > 0 ? '+' : '') + money(difference)) : '') + '</section>';
  }
  if (!onSale(title)) return '';
  if (!title.salesWeeks) return '<p class="small">首周结算后可安排一次限时促销。</p>';
  return '<section class="creative-result"><h3>限时促销</h3><p class="small">剩余 ' +
    (salesDuration - title.salesWeeks) + ' 周销售期，每款作品可促销一次。</p>' +
    Object.keys(promotionTypes).map(kind => {
      const quote = promotionQuote(title, kind);
      return '<div class="purchase-option"><h3>' + quote.name + '</h3><p class="small">' + money(quote.price) +
        ' · ' + quote.weeks + ' 周 · 预计销量 +' + Math.round((quote.salesRate - 1) * 100) + '%</p>' +
        (quote.canStart ? button('安排' + quote.name,'discount-' + kind + '-' + title.id) :
          '<p class="small">剩余销售时间不足。</p>') + '</div>';
    }).join('') + '</section>';
}

function seriesDetails(game, title) {
  const quote = sequelQuote(game, title);
  const predecessor = game.games.find(entry => entry.id === title.sequelOf);
  const demand = Math.round(((title.seriesDemand ?? 1) - 1) * 100);
  return '<section class="creative-result"><h3>' + (quote.count > 1 ? '《' + escapeHtml(quote.root.name) + '》系列' : '系列企划') + '</h3>' +
    (predecessor ? line('上一作', escapeHtml(predecessor.name)) +
      line('继承方向', inheritanceOptions[title.inheritance].name) : '') +
    (quote.count > 1 ? line('已发售作品', quote.count + ' 款') : '') +
    line('系列口碑', quote.trust + ' / 100') + line('系列粉丝', number(quote.fans) + ' 人') +
    (title.sequelOf ? line('首周系列粉丝支持', number(title.sequelFans) + ' 份') +
      line('本作受系列口碑影响', (demand > 0 ? '+' : '') + demand + '% 市场需求') : '') +
    (quote.reason ? '<p class="small">' + quote.reason + '</p>' :
      '<p class="small">预计 ' + quote.followers + ' 位系列粉丝支持下一作首周销量。</p>' +
      button('制作续作','sequel-' + title.id,true)) + '</section>';
}

export function archive(game, selected) {
  if (!game.games.length) return card('<h2>作品档案</h2><p class="small">发售第一款游戏后，这里会记录销量、评分、年度名次和奖项。</p>');
  const market = marketEffect(game);
  const marketStatus = market ? card('<h3>当前市场</h3><p class="small">在售作品销量 ' +
    (market > 0 ? '+' : '') + market + '% · 剩余 ' + (game.marketTrend.until - calendarWeek(game) + 1) + ' 周</p>') : '';
  return marketStatus + game.games.map(title => {
    const rank = standings(game, title.year).findIndex(entry => entry.id === title.id) + 1;
    const results = game.years[title.year];
    const ratings = updatedRatings(title);
    const reviews = title.update?.reviews ?? title.reviews;
    const profit = title.revenue - title.cost - (title.update?.cost ?? 0);
    const badges = awards.flatMap(([field, name]) => {
      const place = results?.[field].indexOf(title.id) ?? -1;
      if (place < 0) return [];
      return [place === 0 ? '<span class="tag award-tag">◆ ' + name + ' · 获奖</span>' : label(name + ' · 提名')];
    }).join('');
    return card('<div class="eyebrow">第 ' + title.year + ' 年发行 · ' + title.genre + '</div><h2 class="project-title">' + escapeHtml(title.name) + '</h2>' +
      '<div class="badges">' + projectSetting(title) + (title.sequelOf ? label('系列续作') : '') +
      label(title.score + ' 分') + label((results ? '年度第 ' : '暂列年度第 ') + rank + ' 名') +
      label(onSale(title) ? '售卖中 · ' + title.salesWeeks + '/' + salesDuration + ' 周已结算' : '已下架') + badges + '</div>' +
      line('累计销量', number(title.copies) + ' 份') + line('累计销售额', money(title.revenue)) +
      line('净收益', '<span class="' + (profit < 0 ? 'loss' : 'winner') + '">' + money(profit) + '</span>') +
      (selected === title.id ? promotionDetails(title) + updateDetails(game, title) + seriesDetails(game, title) +
        (title.combination ? '<div class="creative-result"><h3>' + title.combination.label + '</h3><p class="small">' +
        audiences[title.combination.audience].name + ' · 搭配加成 ' + (title.combination.bonus > 0 ? '+' : '') +
        title.combination.bonus + ' · 回访粉丝 ' + title.returningFans + ' 人</p>' +
        line('本作带来的粉丝变化', (title.fanChange > 0 ? '+' : '') + title.fanChange) + '</div>' : '') +
        line('首周销量', title.salesWeeks ? number(firstWeekSales(title)) + ' 份' : '待结算') +
        (title.competition ? line('发售日期', releaseDate(title.releaseWeek)) +
          (title.salesWeeks ? line('同类竞品造成的首周销量损失', number(title.competition.lostCopies ?? 0) + ' 份') +
            (title.competition.avoidedCopies ? '<p class="small">与前后 2 周最拥挤的档期相比，少损失约 ' +
              number(title.competition.avoidedCopies) + ' 份。</p>' : '') :
            '<p class="small">同类竞品预计影响首周销量 −' + title.competition.penalty + '%。</p>') : '') +
        line('发售定价', (title.priceTier ? launchPriceTiers[title.priceTier].name + ' · ' : '') + money(title.price)) +
        (title.basePrice && title.basePrice !== title.price ? line('立项参考价', money(title.basePrice)) : '') +
        line('开发成本', money(title.cost)) +
        '<h3 class="sales-heading">每周售卖记录</h3>' +
        (title.salesHistory?.length ? title.salesHistory.map(entry =>
          line('第 ' + entry.week + ' 周 · ' + number(entry.copies) + ' 份' +
            (entry.price != null && entry.price !== title.price ? ' · 促销价 ' + money(entry.price) : ''), money(entry.revenue))).join('') :
          '<p class="small">' + (title.salesWeeks ? '旧存档已结算的销售记录计入累计数据。' : '发售满一周后会显示首笔销售。') + '</p>') +
        line('玩法 / 内容', ratings.design + ' / ' + ratings.content) +
        line('美术与音效 / 稳定性', ratings.art + ' / ' + ratings.stability) +
        (title.quality?.staff !== undefined ? line('技术 / 设备 / 公司加成',
          '+' + title.quality.staff + ' / +' + title.quality.equipment + ' / +' + title.quality.company) : '') +
        (title.inspiration ? '<p class="small">创意贡献 · ' + escapeHtml(title.inspiration.memberName) + '「' +
          inspirationIdeas[title.inspiration.role].name + '」</p>' : '') +
        (title.combination || reviews?.length ? '<h3 class="sales-heading">' + (title.update?.reviews ? '更新后玩家评论' : '玩家评论') + '</h3>' +
          (reviews?.length ? reviews.map(review => '<div class="player-review"><div class="line"><b>' +
            audiences[review.audience].name + '</b><span>' + review.rating + ' 分</span></div><p class="small">' +
            review.text + '</p></div>').join('') : '<p class="small">发售满一周后，首批玩家会留下评价。</p>') : '') +
        '<p class="small score-note">最高分项为 ' + ratingExtreme(ratings, true) + '，最低分项为 ' +
        ratingExtreme(ratings, false) + '。宣传投入影响首周销量。' +
        (title.repeated ? '近期同类作品较多，本作需求下降 ' + Math.round((1 - .9 ** title.repeated) * 100) + '%。' : '') +
        '</p>' : '') +
      button(selected === title.id ? '收起详情' : '查看详情','detail-' + title.id));
  }).join('');
}

function ratingExtreme(title, highest) {
  const fields = [['design','玩法'],['content','内容'],['art','美术与音效'],['stability','稳定性']];
  fields.sort(([a], [b]) => highest ? title[b] - title[a] : title[a] - title[b]);
  return fields[0][1];
}

export function annual(game, year) {
  const board = standings(game, year);
  const results = game.years[year];
  const now = calendarWeek(game);
  const upcoming = year === game.year ? rivalCalendar(now + 1, now + 4) : [];
  const forecast = year === game.year ? card('<h3>未来 4 周竞品</h3>' +
    (upcoming.length ? upcoming.map(entry => '<div class="player-review"><h3>《' + entry.name +
      '》</h3><p class="small">' + entry.studio + ' · ' + entry.genre + ' · ' + releaseDate(entry.week) + '</p></div>').join('') :
      '<p class="small">未来 4 周暂无竞品发售。</p>')) : '';
  return card('<div class="year-switch">' + (year > 1 ? button('上一年','year-' + (year - 1)) : '<span></span>') +
    '<h2>第 ' + year + ' 年</h2>' + (year < game.year ? button('下一年','year-' + (year + 1)) : '<span></span>') +
    '</div>') + forecast + card('<h3>' + (results ? '最终榜单' : '实时榜单') + '</h3>' +
    board.map((title, index) => line('#' + (index + 1) + '　' + escapeHtml(title.name) +
      (title.id.startsWith('own-') ? '　' + label('自家') : ''), title.score + ' 分', title.id.startsWith('own-'))).join('')) +
    card('<h3>年度六大奖</h3><p class="small">' + (results ? '获奖与提名名单' : '首作可入围，从第二款作品起可角逐大奖。年末公布结果。') +
      '</p>' + awards.map(([field, name]) => {
        const candidates = results
          ? results[field].map(id => board.find(title => title.id === id))
          : awardFinalists(board, field);
        return '<div class="award"><h3>' + name + '</h3>' + candidates.map((title, index) => line(
          escapeHtml(title.name) + (title.id.startsWith('own-') ? '　' + label('自家') : ''),
          results && index === 0 ? '<span class="tag award-tag">◆ 获奖</span>' : '入围', title.id.startsWith('own-')
        )).join('') + '</div>';
      }).join(''));
}

const roleNames = Object.fromEntries(roles);

function profile(person) {
  const skill = technique(person);
  const specialties = Object.entries(person.experience ?? {}).filter(([type]) => concepts[type])
    .sort((a, b) => b[1] - a[1]).slice(0, 2);
  return '<h3>' + person.name + ' · ' + roleNames[person.role] + '</h3>' +
    '<div class="badges"><span class="tag staff-grade" data-grade="' + grade(skill) + '">' + grade(skill) + '</span>' +
    label('技术 ' + skill + '/100') + label(person.personality) +
    label('心情 ' + person.mood) + label('忠诚度 ' + person.loyalty) +
    (person.mood <= resignationMood ? '<span class="tag loss">有离职风险</span>' : '') + '</div>' +
    (person.completedProjects ? '<p class="small">参与完成 ' + person.completedProjects + ' 款作品 · 类型经验 ' +
      specialties.map(([type, count]) => concepts[type].genre + ' ' + count + ' 次').join('、') + '</p>' : '');
}

export function team(game, role) {
  const ready = teamReady(game);
  const filled = staffCount(game, role) >= roleLimit(game, role);
  const available = candidates.filter(person => person.role === role && (!filled || person.unlock > 1) &&
    person.unlock <= game.companyLevel + 1 && !game.crew.some(member => member.id === person.id))
    .filter(person => {
      const replaced = replacementFor(game, person);
      return !replaced || technique(person) > technique(replaced);
    });
  const unlocked = available.filter(person => person.unlock <= game.companyLevel)
    .sort((a, b) => b.unlock - a.unlock || a.fee - b.fee);
  const shortlist = game.companyLevel === 1 ? unlocked : [...new Set([...unlocked.slice(0, 2), ...unlocked.slice().sort((a, b) => a.fee - b.fee).slice(0, 1)])];
  const lockedCandidate = available.find(person => person.unlock > game.companyLevel);
  if (lockedCandidate) shortlist.push(lockedCandidate);
  return card('<div class="eyebrow">第 2 步 / 招聘员工</div><h2>团队编制</h2>' +
    '<p class="small">立项最低需要开发 2 名，产品、美工、测试、市场各 1 名。公司每升一级，各岗位编制翻倍。</p>' +
    '<div class="staff-checklist">' + roles.map(([id, name]) => {
      const count = staffCount(game, id);
      return '<button type="button" class="btn" data-action="role-' + id + '" aria-pressed="' + (id === role) + '">' +
        name + '<b>' + count + '/' + roleLimit(game, id) + '</b></button>';
    }).join('') + '</div>' +
    line('在职 / 总编制', game.crew.length + ' / ' + staffLimit(game)) +
    line('每周可分配工时', capacity(game) + ' 格') + line('团队月薪合计', money(monthlyPayroll(game))) +
    line('下次发薪', '第 ' + game.year + ' 年 · W' + (game.week + weeksUntilPayday(game) - 1) + ' 周末')) +
    (ready ? card('<h3>已满足立项要求</h3><p class="small">有空位时可扩招，满编后可用高评级员工替换同岗位技术最低的成员。</p>' +
      button('前往研发','tab-research',true)) : '') +
    (shortlist.length ? shortlist.map(person => {
      const replaced = replacementFor(game, person);
      const locked = game.companyLevel < person.unlock;
      return card(profile(person) + line('招聘费用', money(person.fee)) + line('月薪', money(person.monthlySalary)) +
        (locked ? '<p class="small">公司 Lv.' + person.unlock + ' 解锁</p>' :
          canHire(game, person) ? button(replaced ? '替换' + replaced.name : '招聘' + person.name, 'hire-' + person.id, true) :
            '<p class="small">可用现金不足以支付招聘费并预留经营开支。</p>'));
    }).join('') : card('<p class="small">这个岗位当前没有更合适的候选人。</p>')) +
    (game.crew.length ? '<details class="card"><summary>在职成员 · ' + game.crew.length + ' 人</summary>' + game.crew.map(person =>
      '<div class="employee">' + profile(person) + line('月薪', money(person.monthlySalary)) +
      '<div class="staff-actions">' + (canRaise(game, person) ? button('加薪 +' + money(raiseAmount(person)), 'raise-' + person.id) :
        '<button type="button" class="btn" disabled>暂不可加薪</button>') +
      button('解雇', 'release-' + person.id) + '</div></div>').join('') + '</details>' : '') +
    (game.eventHistory?.length ? '<details class="card"><summary>最近工作室事件</summary>' +
      game.eventHistory.map(event => '<div class="player-review"><h3>' + escapeHtml(event.name) + '</h3>' +
        '<p class="small">第 ' + event.year + ' 年 W' + event.week + ' · ' + escapeHtml(event.choice) + '</p>' +
        (event.reason ? '<p class="small">' + escapeHtml(event.reason) + '</p>' : '') +
        (event.effects ? '<p class="small">' + escapeHtml(event.effects) + '</p>' : '') + '</div>').join('') +
      '</details>' : '') +
    card(button('重新开局','restart'));
}

export function procurement(game) {
  const company = companyTier(game);
  const computer = computerTier(game);
  const nextCompany = nextCompanyTier(game);
  const nextComputer = nextComputerTier(game);
  const nextTypes = projectTypesAt(game.companyLevel + 1);
  const availableTypes = Object.values(concepts).filter(concept => concept.unlock <= game.companyLevel).length;
  const upgrade = (item, kind, note) => item
    ? '<div class="purchase-option"><h3>' + item.name + '</h3><p class="small">' + note + '</p>' +
      line('一次性费用', money(item.cost)) + line('支付后需保留', money(investmentReserve(game))) +
      (canInvest(game, item) ? button(kind === 'company' ? '升级公司' : '购买设备','upgrade-' + kind,true) :
        '<p class="small">' + (game.reputation < (item.reputation ?? 0)
          ? '口碑达到 ' + item.reputation + ' 后解锁。' : '购买后需留足近期经营开支。') + '</p>') + '</div>'
    : '<p class="small">已达到最高等级。</p>';
  return card('<div class="eyebrow">STUDIO / EQUIPMENT</div><h2>电脑设备</h2>' +
    line('当前设备', computer.name) + line('研发评分加成', '+' + computer.quality) +
    upgrade(nextComputer, 'computer', nextComputer ? '研发评分加成 +' + nextComputer.quality : '')) +
    card('<h2>公司升级</h2>' + line('公司 Lv.' + game.companyLevel, company.name) +
    line('口碑 / 声望', game.reputation + ' / ' + game.fame) +
    line('员工编制', game.crew.length + ' / ' + staffLimit(game)) +
    line('已解锁游戏类型', availableTypes + ' / ' + Object.keys(concepts).length) +
    line('研发评分加成', '+' + company.quality) +
    upgrade(nextCompany, 'company', nextCompany ? '编制 ' + staffLimit(game) * 2 + ' 人 · 解锁 ' + nextCompany.grade +
      ' 员工和 ' + nextTypes.length + ' 种游戏 · 口碑要求 ' + nextCompany.reputation : '') +
    (nextTypes.length ? '<div class="badges">' + nextTypes.map(([, concept]) => label(concept.genre)).join('') + '</div>' : '')) +
    card('<h2>玩家群体</h2><p class="small">好作品在销售期吸引粉丝，下一款同类作品会获得部分粉丝支持。低评分作品可能让粉丝流失。</p>' +
      Object.entries(audiences).map(([id, audience]) => line(audience.name + ' · ' + audience.focus,
        number(game.fans?.[id] ?? 0) + ' 人')).join('')) +
    '<details class="card"><summary>已发现的搭配 · ' + Object.keys(game.discoveries ?? {}).length + '</summary>' +
      (Object.values(game.discoveries ?? {}).map(discovery => '<div class="player-review"><h3>' +
        concepts[discovery.type].genre + ' · ' + discovery.label + '</h3><p class="small">' + stories[discovery.story] +
        ' / ' + artStyles[discovery.style] + ' · ' + audiences[discovery.audience].name + '</p></div>').join('') ||
        '<p class="small">发售作品后，会在这里记录类型、剧情和美术的搭配结果。</p>') + '</details>' +
    '<details class="card"><summary>查看财务账本</summary>' + finance(game) + '</details>';
}

function finance(game) {
  const settlement = latestSettlement(game);
  const weeklyReport = settlement ? card('<h3>最近一次周结算</h3><p class="small">第 ' +
    settlement.year + ' 年 · W' + settlement.week + '</p>' +
    line('游戏销售到账', money(settlement.revenue)) +
    line('工资与办公开支', money(-settlement.expense)) +
    line('本周净现金', '<span class="' + (settlement.net < 0 ? 'loss' : 'winner') + '">' +
      (settlement.net > 0 ? '+' : '') + money(settlement.net) + '</span>') +
    line('结算后余额', money(settlement.closing))) : '';
  return card('<h2>工作室账本</h2>' + line('现金余额', money(game.cash)) +
  line('本月待付工资', money(accruedPayroll(game))) + line('可用现金', money(availableCash(game))) +
  line('每周办公开支', money(officeCost(Boolean(game.project)))) + line('工作室口碑', game.reputation + ' / 100')) +
  weeklyReport +
  card('<h3>最近收支</h3>' + (game.ledger.length ? game.ledger.slice(0, 15).map(entry =>
    line('<small>第 ' + entry.year + ' 年 / W' + entry.week + '</small><br>' + escapeHtml(entry.label),
      '<span class="' + (entry.amount < 0 ? 'loss' : 'winner') + '">' + (entry.amount > 0 ? '+' : '') + money(entry.amount) + '</span>')
  ).join('') : '<p class="small">完成首周开发后会记录团队开支。</p>'));
}
