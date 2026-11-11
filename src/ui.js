export const el = id => document.getElementById(id);
export const format = new Intl.NumberFormat('zh-CN');
export const money = n => (n < 0 ? '−' : '') + '¥' + format.format(Math.abs(n));
export const button = (label,action,primary=false) => '<button type="button" class="btn' + (primary ? ' primary' : '') + '" data-action="' + action + '">' + label + '</button>';
export const card = html => '<section class="card">' + html + '</section>';
export const escapeHtml = value => String(value).replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

let choices;
export function modal(title,description,options) {
  choices = options;
  el('modal').innerHTML = '<h2 id="modal-title">' + title + '</h2><p>' + description + '</p>' +
    options.map(([label,run,primary],i) => button(label,'choice-' + i,primary)).join('') + button('返回','dismiss');
  el('dialog').showModal();
}
export const confirm = (title,description,run) => modal(title,description,[['确认',run,true]]);

export function dismiss() {
  el('dialog').close();
}

export function selectChoice(index) {
  const run = choices[index][1];
  dismiss();
  run();
}
