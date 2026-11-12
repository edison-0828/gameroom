import { awards, canWorkOnUpdate, firstWeekSales, inheritanceOptions, launchPriceTiers, onSale, promotionQuote, promotionTypes, releaseDate, salesDuration, sequelQuote, standings, updatedRatings, updateQuote, updateTypes, updateWorkHours } from '../../core/studio.js';
import { calendarWeek, marketEffect } from '../../core/events.js';
import { audiences, inspirationIdeas } from '../../core/creative.js';
import { button, card, escapeHtml, money } from '../../ui.js?v=2';
import { number, line, label, projectSetting } from './common.js';

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
      '<div class="badges">' + projectSetting(title) + (title.id === 'own-0' ? label('新人首作') : '') + (title.sequelOf ? label('系列续作') : '') +
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
