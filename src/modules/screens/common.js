import { artStyles, stories } from '../../core/project-plan.js';
import { format } from '../../ui.js?v=2';

export const number = value => format.format(value);
export const line = (label, value, own = false) =>
  '<div class="line' + (own ? ' own-title' : '') + '"><span>' + label + '</span><b>' + value + '</b></div>';
export const label = text => '<span class="tag">' + text + '</span>';

export function office() {
  return '<div class="office" aria-hidden="true"><svg viewBox="0 0 160 46" shape-rendering="crispEdges"><path fill="#31325a" d="M0 33h160v13H0z"/><path fill="#595278" d="M0 35h160v2H0z"/><path fill="#343759" d="M11 5h35v24H11z"/><path fill="#80adc0" d="M13 7h31v20H13z"/><path fill="#aee0d6" d="M14 8h29v10H14z"/><path fill="#6d8fac" d="M15 21h7v-5h6v6h6v-8h7v12H15z"/><path fill="#343759" d="M27 6h3v22h-3z"/><path fill="#b48171" d="M53 30h88v4H53zM57 34h4v9h-4zM133 34h4v9h-4z"/><path fill="#22243e" d="M64 15h24v13H64zM74 28h4v2h-4zM110 15h24v13h-24zM120 28h4v2h-4z"/><path fill="#8ed7b3" d="M66 17h20v9H66zM112 17h20v9h-20z"/><path fill="#416f69" d="M68 19h10v1H68zM68 22h14v1H68zM114 19h14v1h-14zM114 22h9v1h-9z"/><path fill="#efb38e" d="M94 22h9v8h-9z"/><path fill="#554064" d="M93 19h11v5H93zM96 31h6v8h-6z"/><path fill="#efc47e" d="M145 29h6v5h-6z"/><path fill="#73ac87" d="M144 24h3v5h-3zM148 21h3v8h-3zM151 24h3v3h-3z"/></svg></div>';
}

export function projectSetting(project) {
  return [stories[project.story], artStyles[project.style]].filter(Boolean).map(label).join('');
}
