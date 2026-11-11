import { canStartProject, inheritanceOptions, sequelQuote, startProject } from '../core/studio.js';
import { teamReady } from '../core/staff.js';
import { artStyles, projectNameError, stories, suggestProjectName } from '../core/project-plan.js';
import { dismiss, el } from '../ui.js?v=2';
import { combinationPreview, projectPlanner } from './screens/project-planner.js';

export function createProjectControls({ getGame, onStart }) {
  let projectDraft = null;

  function renderProjectPlanner() {
    el('modal').innerHTML = projectPlanner(getGame(), projectDraft);
    if (projectDraft.step === 'name') el('project-name').value = projectDraft.name;
  }

  const actions = {
    start() {
      const game = getGame();
      if (game.project || !teamReady(game)) return;
      projectDraft = { step: 'type', type: '', story: '', style: '', name: '' };
      renderProjectPlanner();
      el('dialog').showModal();
    },
    sequel(id) {
      const game = getGame();
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
      if (!canStartProject(getGame(), type)) return;
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
      el('project-name').value = suggestProjectName(getGame(), projectDraft);
      el('project-name-error').textContent = '';
    },
    planback() {
      projectDraft.name = el('project-name').value;
      projectDraft.step = 'style';
      renderProjectPlanner();
    },
  };

  function handleChange(event) {
    if (!event.target.matches('#story, #style') || !projectDraft) return;
    projectDraft.story = el('story').value;
    projectDraft.style = el('style').value;
    el('combination-preview').textContent = combinationPreview(getGame(), projectDraft);
  }

  function handleSubmit(event) {
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
      if (projectDraft.sequelOf && !projectDraft.name) projectDraft.name = suggestProjectName(getGame(), projectDraft);
      renderProjectPlanner();
      return;
    }
    if (event.target.id === 'project-name-form') {
      event.preventDefault();
      const game = getGame();
      projectDraft.name = el('project-name').value.trim();
      const error = projectNameError(game, projectDraft.name);
      if (error || !startProject(game, projectDraft)) {
        el('project-name-error').textContent = error || '当前无法立项，请返回研发页检查预算和岗位。';
        return;
      }
      projectDraft = null;
      dismiss();
      onStart();
    }
  }

  function reset() {
    projectDraft = null;
  }

  return { actions, handleChange, handleSubmit, reset };
}
