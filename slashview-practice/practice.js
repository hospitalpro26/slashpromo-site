'use strict';
const content = document.querySelector('#content');
const status = document.querySelector('#offline');
const storageKey = 'slashview-toacs-bookmarks';
let stations = [];
let saved = new Set();
try {
  const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
  if (Array.isArray(stored)) saved = new Set(stored);
} catch {}

function element(tag, text, parent, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  parent.append(node);
  return node;
}
function button(text, parent, action, className) {
  const node = element('button', text, parent, className);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}
function focusHeading(node) {
  node.tabIndex = -1;
  node.focus();
}
function showStations(moveFocus = false) {
  content.replaceChildren();
  const heading = element('h2', 'Stations', content);
  const list = element('ul', '', content, 'station-list');
  stations.forEach((station, index) => {
    const row = element('li', '', list);
    button('Station ' + (index + 1) + ' · ' + station.specialty + (saved.has(station.id) ? ' · Bookmarked' : ''),
      row, () => showStation(index));
  });
  if (moveFocus) focusHeading(heading);
}
const stages = [
  ['diagnosis', 'What is the most likely diagnosis and why?'],
  ['investigations', 'Which investigations would you request?'],
  ['management', 'How would you manage this patient?']
];
function showStation(index) {
  const station = stations[index];
  content.replaceChildren();
  const actions = element('div', '', content, 'actions');
  button('All stations', actions, () => showStations(true));
  const bookmark = button('', actions, () => {
    if (saved.has(station.id)) saved.delete(station.id);
    else saved.add(station.id);
    renderBookmark();
    try { localStorage.setItem(storageKey, JSON.stringify([...saved])); }
    catch { status.textContent = 'Bookmarks are available for this session only.'; }
  });
  function renderBookmark() {
    bookmark.textContent = saved.has(station.id) ? 'Remove bookmark' : 'Bookmark station';
  }
  renderBookmark();
  const card = element('article', '', content);
  const heading = element('h2', 'Station ' + (index + 1) + ' of ' + stations.length + ' · ' + station.specialty, card);
  element('p', station.scenario, card);
  function revealStage(stage) {
    const [key, prompt] = stages[stage];
    element('h3', prompt, card);
    const reveal = button('Reveal ' + key, card, () => {
      reveal.remove();
      const answer = element('p', station[key], card, 'answer');
      if (stage + 1 < stages.length) revealStage(stage + 1);
      else {
        const ref = element('a', 'Guideline reference', element('p', '', card));
        if (station.reference.startsWith('https://')) ref.href = station.reference;
        const next = element('div', '', card, 'actions');
        if (index + 1 < stations.length) button('Next station', next, () => showStation(index + 1), 'primary');
        button('All stations', next, () => showStations(true));
      }
      focusHeading(answer);
    }, 'primary');
  }
  revealStage(0);
  focusHeading(heading);
}
async function start() {
  try {
    const response = await fetch('./stations.json');
    if (!response.ok) throw Error('Stations unavailable');
    stations = await response.json();
    showStations();
  } catch {
    content.replaceChildren();
    element('p', 'Couldn’t load the stations. Connect to the internet and reload to set up offline practice.', content);
    return;
  }
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./offline.js');
      await navigator.serviceWorker.ready;
      status.textContent = 'Ready for offline practice on this device.';
    } catch { status.textContent = 'Offline setup is unavailable in this browser session.'; }
  }
}
start();