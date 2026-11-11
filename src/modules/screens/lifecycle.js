import { button, money } from '../../ui.js?v=2';
import { line, office } from './common.js';

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
