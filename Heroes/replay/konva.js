import { state } from './state.js';
import { renderCreatures } from './creature.js';
import { drawTerrain } from './terrain.js';

export function initStage() {
  if (state.konvaStage) return;

  state.konvaStage = new Konva.Stage({
    container: 'konva-container',
    width: document.getElementById('konva-container').clientWidth,
    height: document.getElementById('konva-container').clientHeight,
  });

  state.bgLayer = new Konva.Layer();
  state.terrainLayer = new Konva.Layer();
  state.creatureLayer = new Konva.Layer();
  state.overlayLayer = new Konva.Layer();
  state.konvaStage.add(state.bgLayer);
  state.konvaStage.add(state.terrainLayer);
  state.konvaStage.add(state.creatureLayer);
  state.konvaStage.add(state.overlayLayer);
}

export function renderAll() {
  if (!state.konvaStage || !state.battle) return;
  drawTerrain(state.battle.params);
  renderCreatures(state.battle.stacks, state.battle.params);
}
