import { assessProject, assigned, canPublish, completion, inheritanceOptions, onSale, productionQuality, productionStage, projectWeeks, tasks, updateTypes, updateWorkHours, weeklyWork } from '../../core/studio.js';
import { availableCash, capacity, teamReady, weeklyCost } from '../../core/staff.js';
import { inspirationIdeas } from '../../core/creative.js';
import { reviewCeiling } from '../../core/ratings.js';
import { button, card, escapeHtml } from '../../ui.js?v=2';
import { label, office, projectSetting } from './common.js';
import { commissionPanel } from './side-work.js';

export function research(game) {
  const p = game.project;
  const cost = weeklyCost(game);
  const slots = capacity(game);
  const published = game.games.length;
  const ceiling = reviewCeiling(published);
  const { funded, sideWork, updating, updateWorks, plan } = weeklyWork(game);
  const commissions = commissionPanel(game, sideWork.contractWorker);
  if (!p) {
    if (!teamReady(game)) return card('<div class="eyebrow">第 2 步 / 招聘员工</div><h2>招齐团队再立项</h2>' +
      '<p class="small">需要开发 2 名，产品、美工、测试、市场各 1 名。</p>' + button('前往招聘','tab-team',true)) + commissions;
    return '<section class="card hero">' + office() + '<div class="hero-copy">' +
      '<div class="eyebrow">第 3 步 / 制定项目</div><h2>研发工作室</h2>' +
      button('制作游戏','start',true) + '</div></section>' + commissions +
      (ceiling < 100 ? card('<div class="progress-label"><h3>工作室制作经验</h3><b>' + published + ' / 3 款已发售</b></div>' +
        '<progress aria-label="工作室制作经验" value="' + published + '" max="3"></progress>' +
        '<p class="small growth-note">下一款综合评分上限 ' + ceiling + ' 分。发售后提高到 ' +
        reviewCeiling(published + 1) + ' 分，参与制作的员工也会积累技术。</p>') : '');
  }
  const progress = completion(p);
  const weeks = projectWeeks(p);
  const quality = productionQuality(game);
  const [phase, stage, description] = productionStage(p);
  const score = p.age > 0 ? assessProject(p, published).score : null;
  const researchHours = funded ? assigned({ allocation: plan }) : 0;
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
    (ceiling < 100 ? '<p class="small growth-note">工作室制作经验 · 本作综合评分上限 ' + ceiling + ' 分</p>' : '') +
    (canPublish(p) ? button('定价并发售','publish',true) : '') + '</section>' +
    commissions +
    (p.series ? card('<h3>系列续作</h3><p class="small">' + inheritanceOptions[p.series.inheritance].name +
      '。系列口碑 ' + p.series.trust + '，预计有 ' + p.series.followers + ' 位系列粉丝支持首周销量。</p>') : '') +
    (updateWorks ? card('<p class="small">团队同时在为《' + escapeHtml(updating.name) +
      '》制作更新。本周将从新作分出 ' + updateWorkHours(updateTypes[updating.update.kind]) + ' 格工时。</p>') : '') +
    (sideWork.trainee ? card('<p class="small">' + escapeHtml(sideWork.trainee.name) +
      '正在培训，本周有 2 格工时用于进修。</p>') : '') +
    (p.inspiration?.state === 'accepted' ? card('<h3>已采纳员工灵感</h3><p class="small">' +
      escapeHtml(p.inspiration.memberName) + ' · ' + inspirationIdeas[p.inspiration.role].name +
      '。制作周期增加 1 周，完成后获得额外加成。</p>') : '') +
    (p.feedback ? card('<h3>试玩反馈</h3><p class="small">' + p.feedback + '</p>') : '') +
    (availableCash(game) < cost ? card('<p>现金不足，研发暂停。' + (game.games.some(onSale) ? '在售作品会按周回款。' :
      canPublish(p) ? '可以发售现有版本。' : '可以重新开局。') + '</p>' + button('重新开局','restart')) : '') +
    (game.week <= 52 ? '<details class="card work-plan"><summary>本周自研工时 <span class="small">' + researchHours + ' / ' + slots + '</span></summary>' +
      (funded && researchHours < assigned(p) ? '<p class="small growth-note">委托、培训和更新会先占用工时，以下显示自研计划和实际可用工时。</p>' : '') +
      tasks.map(([id, name, desc]) => '<div class="task"><div><b>' + name + '</b><p class="small">' + desc +
        '</p>' + (funded && plan[id] < p.allocation[id] ? '<p class="small">本周可用 ' + plan[id] + ' 格</p>' : '') +
        '</div><div class="stepper"><button type="button" data-action="less-' + id + '" aria-label="减少' + name +
        '工时"' + (p.allocation[id] === 0 ? ' disabled' : '') + '>−</button><b>' + p.allocation[id] +
        '</b><button type="button" data-action="more-' + id + '" aria-label="增加' + name + '工时"' +
        (assigned(p) === slots ? ' disabled' : '') + '>+</button></div></div>').join('') + '</details>' : '');
}
