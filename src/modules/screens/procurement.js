import { latestSettlement } from '../../core/studio.js';
import { accruedPayroll, availableCash, officeCost, staffLimit } from '../../core/staff.js';
import { canInvest, companyTier, computerTier, investmentReserve, nextCompanyTier, nextComputerTier } from '../../core/company.js';
import { concepts, projectTypesAt } from '../../core/project-catalog.js';
import { artStyles, stories } from '../../core/project-plan.js';
import { audiences } from '../../core/creative.js';
import { button, card, escapeHtml, money } from '../../ui.js?v=2';
import { number, line, label } from './common.js';

export function procurement(game) {
  const company = companyTier(game);
  const computer = computerTier(game);
  const nextCompany = nextCompanyTier(game);
  const nextComputer = nextComputerTier(game);
  const nextTypes = projectTypesAt(game.companyLevel + 1, game.automationTrained);
  const availableTypes = Object.values(concepts).filter(concept => concept.unlock <= game.companyLevel &&
    (!concept.requiresAutomation || game.automationTrained)).length;
  const upgrade = (item, kind, note) => item
    ? '<div class="purchase-option"><h3>' + item.name + '</h3><p class="small">' + note + '</p>' +
      line('一次性费用', money(item.cost)) + line('支付后需保留', money(investmentReserve(game))) +
      (item.releases ? line('发售作品要求', Math.min(game.games.length, item.releases) + ' / ' + item.releases + ' 款') : '') +
      (canInvest(game, item) ? button(kind === 'company' ? '升级公司' : '购买设备','upgrade-' + kind,true) :
        '<p class="small">' + (game.games.length < (item.releases ?? 0)
          ? '还需发售 ' + (item.releases - game.games.length) + ' 款作品。' : game.reputation < (item.reputation ?? 0)
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
    line('游戏销售到账', money(settlement.revenue - settlement.commissionRevenue)) +
    (settlement.commissionRevenue ? line('外包委托回款', money(settlement.commissionRevenue)) : '') +
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
