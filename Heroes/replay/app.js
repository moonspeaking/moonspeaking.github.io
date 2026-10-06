import { state, calcPoleData, cellToPixel } from './state.js';
import { fetchReplayData } from './api.js';
import { preloadImages, renderCreatures, showDamage, showCombatMsg, flashCell, animateStackCount, fadeOutGroup, highlightStack, findCreatureGroup, stopIdleAnimation, startIdleAnimation } from './creature.js';
import { resizeStage, updateHover, clearHover } from './terrain.js';
import { initStage, renderAll } from './konva.js';
import { cycleSpeed, renderHeroPanels, renderHeroDolls, renderInitBar, initBattleLog, setLogJumpHandler, updateLogHighlight, showHelp, showMsg, togglePause, toggleHeroPanels, updateInitBar } from './ui.js';

function bindControls() {
  document.getElementById('btn-pause')?.addEventListener('click', togglePause);
  document.getElementById('btn-speed')?.addEventListener('click', cycleSpeed);
  document.getElementById('btn-info')?.addEventListener('click', showBattleStats);
  document.getElementById('btn-back')?.addEventListener('click', () => history.back());
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.() || document.documentElement.webkitRequestFullscreen?.();
  } else {
    document.exitFullscreen?.() || document.webkitExitFullscreen?.();
  }
}

function copyReplayLink() {
  const url = window.location.href;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      showMsg('🔗 Ссылка скопирована', 2000);
    }).catch(() => {
      fallbackCopy(url);
    });
  } else {
    fallbackCopy(url);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed'; ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); showMsg('🔗 Ссылка скопирована', 2000); }
  catch (_) { showMsg('Не удалось скопировать ссылку', 2000); }
  document.body.removeChild(ta);
}

function restartReplay() {
  if (!state.battle?._initialStacks) return;
  stopReplay();
  state.paused = false;
  const pe = document.getElementById('img-pause');
  const pl = document.getElementById('img-play');
  if (pe) pe.style.display = '';
  if (pl) pl.style.display = 'none';
  state.battle.stacks = state.battle._initialStacks.map(s => ({ ...s, _hp: 1, _initialCount: s._initialCount || s.count }));
  state.replayIndex = 0;
  state.replayActions = state.battle._fullActions || [];
  finished = false;
  const resultEl = document.getElementById('battle-result');
  if (resultEl) resultEl.style.display = 'none';
  renderCreatures(state.battle.stacks, state.battle.params);
  updateLogHighlight(-1);
  initBattleLog();
  startReplay(state.replayActions);
  showMsg('Реплей перезапущен', 2000);
}

function bindKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    switch (e.key) {
      case ' ':
        e.preventDefault();
        togglePause();
        break;
      case '+':
      case '=':
        e.preventDefault();
        if (state.speedIdx < state.speeds.length - 1) {
          state.speedIdx++;
          cycleSpeed();
        }
        break;
      case '-':
      case '_':
        e.preventDefault();
        if (state.speedIdx > 0) {
          state.speedIdx--;
          cycleSpeed();
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (state.battle && state.replayIndex < state.replayActions.length - 1) {
          jumpToAction(state.replayIndex + 1);
          state.paused = true;
          const pe = document.getElementById('img-pause');
          const pl = document.getElementById('img-play');
          if (pe) pe.style.display = 'none';
          if (pl) pl.style.display = '';
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (state.battle && state.replayIndex > 0) {
          jumpToAction(state.replayIndex - 1);
          state.paused = true;
          const pe = document.getElementById('img-pause');
          const pl = document.getElementById('img-play');
          if (pe) pe.style.display = 'none';
          if (pl) pl.style.display = '';
        }
        break;
      case 'l':
      case 'L':
        toggleBattleLog();
        break;
      case 'h':
      case 'H':
        toggleHeroPanels();
        break;
      case 'r':
      case 'R':
        restartReplay();
        break;
      case 'f':
      case 'F':
        toggleFullscreen();
        break;
      case 'i':
      case 'I':
        showBattleStats();
        break;
    }
  });
}

var _muted = false;
function toggleMute() {
  _muted = !_muted;
  var btn = document.getElementById('btn-mute');
  if (btn) btn.textContent = _muted ? '🔇' : '🔊';
}

function playSound(type) {
  if (_muted || typeof Audio === 'undefined') return;
  var urls = {
    attack: 'https://dcdn.heroeswm.ru/s/udar/sword.mp3',
    shoot: 'https://dcdn.heroeswm.ru/s/udar/arrow_hit.mp3',
    magic: 'https://dcdn.heroeswm.ru/s/udar/magic.mp3',
    counter: 'https://dcdn.heroeswm.ru/s/udar/blunt.mp3',
    die: 'https://dcdn.heroeswm.ru/s/other/death.mp3',
    summon: 'https://dcdn.heroeswm.ru/s/magic/summon.mp3',
  };
  var url = urls[type] || urls.attack;
  try { new Audio(url).play(); } catch(e) { /* autoplay blocked */ }
}

function fireProjectile(fromPx, toPx, type) {
  if (!state.overlayLayer || !fromPx || !toPx) return;
  const color = type === 'magic' ? '#8a2be2' : '#ffd700';
  const size = type === 'magic' ? 6 : 4;
  const ball = new Konva.Circle({
    x: fromPx.x, y: fromPx.y,
    radius: size, fill: color,
    shadowColor: color, shadowBlur: 12, shadowOpacity: 0.8,
  });
  state.overlayLayer.add(ball);
  const dur = Math.max(0.08, Math.min(0.3, getMoveDuration(fromPx, toPx) * 0.4));
  const tween = new Konva.Tween({
    node: ball, x: toPx.x, y: toPx.y,
    duration: dur,
    easing: Konva.Easings.Linear,
    onFinish: () => { ball.destroy(); state.overlayLayer.draw(); },
  });
  tween.play();
  state.overlayLayer.draw();
}

function showUnitTooltip(stack, x, y) {
  const tip = document.getElementById('unit-tooltip');
  if (!tip || !stack) { hideUnitTooltip(); return; }
  const name = stack.nameRu || stack.sysName || '?';
  const count = stack.count || 0;
  const owner = stack.owner === 0 ? 'Атакующий' : 'Защитник';
  const msgId = stack.msgId !== undefined ? 'ID: ' + stack.msgId : '';
  tip.innerHTML = `<b>${name}</b> ×${count}<br>${owner} ${msgId}`;
  tip.style.left = Math.min(x + 15, window.innerWidth - 200) + 'px';
  tip.style.top = Math.min(y + 15, window.innerHeight - 80) + 'px';
  tip.style.display = 'block';
}

function hideUnitTooltip() {
  const tip = document.getElementById('unit-tooltip');
  if (tip) tip.style.display = 'none';
}

function toggleBattleLog() {
  const log = document.getElementById('battle-log-panel');
  if (log) log.classList.toggle('log-open');
}

function bindStageEvents(params) {
  state.konvaStage.on('mousemove', (event) => {
    const pos = state.terrainLayer?.getRelativePointerPosition();
    if (!pos) return;
    updateHover(pos, params);
    const stagePos = state.konvaStage?.getPointerPosition();
    if (stagePos) {
      const stacks = state.battle?.stacks || [];
      let found = null;
      for (const s of stacks) {
        if (s._col === undefined || s.count <= 0 || s.alive === false) continue;
        const px = getStackPixel(s);
        if (!px) continue;
        const dx = stagePos.x - px.x;
        const dy = stagePos.y - px.y;
        const threshold = (s.flags?.includes('big') ? 60 : 40);
        if (Math.sqrt(dx * dx + dy * dy) < threshold) { found = s; break; }
      }
      if (found) showUnitTooltip(found, stagePos.x, stagePos.y);
      else hideUnitTooltip();
    }
  });
  state.konvaStage.on('mouseleave', () => { clearHover(); hideUnitTooltip(); });
  state.konvaStage.on('click tap', (event) => {
    const stagePos = state.konvaStage?.getPointerPosition();
    if (!stagePos) return;
    const stacks = state.battle?.stacks || [];
    for (const s of stacks) {
      if (s._col === undefined || s.count <= 0 || s.alive === false) continue;
      const px = getStackPixel(s);
      if (!px) continue;
      const dx = stagePos.x - px.x;
      const dy = stagePos.y - px.y;
      const threshold = (s.flags?.includes('big') ? 60 : 40);
      if (Math.sqrt(dx * dx + dy * dy) < threshold) {
        showUnitInfo(s);
        return;
      }
    }
    closeUnitInfo();
  });
  window.addEventListener('resize', () => resizeStage(params));
}

let _unitInfoStack = null;

function showUnitInfo(stack) {
  _unitInfoStack = stack;
  const el = document.getElementById('unit-info');
  const title = document.getElementById('ui-title');
  const body = document.getElementById('ui-body');
  if (!el || !title || !body) return;

  const name = stack.nameRu || stack.sysName || '?';
  title.textContent = name;

  // Разметка повторяет информационное окно оригинала (cre_info_*): те же
  // строки, порядок, иконки и прочерки у неприменимых полей. Значения берём
  // из M-записи лога — они уже включают бонусы героя.
  const ICONS = '/api/img?url=https://dcdn.heroeswm.ru/i/icons/';
  const row = (icon, label, val) =>
    `<div class="ui-row"><img class="ui-icon" src="${ICONS}${icon}" alt="">`
    + `<span class="ui-label">${label}</span><span class="ui-val">${val}</span></div>`;
  const num = (v) => (v === undefined || v === null ? '-' : String(v));

  let html = '<div class="ui-rows">';
  html += row('attr_attack.png', 'Атака', num(stack.attack));
  html += row('attr_defense.png', 'Защита', num(stack.defense));
  const dmg = (stack.minDmg !== undefined && stack.maxDmg !== undefined)
    ? `${stack.minDmg} – ${stack.maxDmg}` : '-';
  html += row('attr_damage.png', 'Урон', dmg);
  html += row('attr_hit_points.png', 'Здоровье', num(stack.hp));
  const isCaster = stack.flags?.includes('caster');
  html += row('attr_mana.png', 'Мана', isCaster ? num(stack.manaMax ?? '-') : '-');
  html += row('attr_speed.png', 'Скорость', num(stack.speed));
  const ini = stack.initiative !== undefined ? Number(stack.initiative).toFixed(1) : '-';
  html += row('attr_initiative.png', 'Инициатива', ini);
  html += row('attr_shoots.png', 'Выстрелы',
    stack.shots ? String(stack.shots) : '-');
  html += row('attr_morale.png', 'Мораль', num(stack.morale));
  html += row('attr_luck.png', 'Удача', num(stack.luck));
  html += row('attr_attack_range.png', 'Дальность',
    stack.range ? String(stack.range) : '-');
  html += '</div>';
  const countRow = `<div class="ui-row"><span class="ui-label">Количество</span>`
    + `<span class="ui-val">×${stack.count || 0}</span></div>`;
  const skills = stack.flags?.length
    ? `<div class="ui-skills">${stack.flags.join(', ')}</div>` : '';
  const imgUrl = stack.imgUrl || (stack.sysName ? `https://dcdn.heroeswm.ru/i/png40/${stack.sysName}.png` : '');
  body.innerHTML = `<div class="ui-preview">${imgUrl ? `<img src="${imgUrl}" onerror="this.style.display='none'">` : ''}</div>`
    + `<div>${countRow}${html}${skills}</div>`;
  el.style.display = 'flex';
}

window.closeUnitInfo = function() {
  const el = document.getElementById('unit-info');
  if (el) el.style.display = 'none';
  _unitInfoStack = null;
};

function getReplayDelay() {
  const speed = state.speeds[state.speedIdx] || 1;
  return Math.max(120, Math.round(900 / speed));
}

function findStackById(stackId) {
  if (stackId == null) return null;
  return state.battle?.stacks.find((s) => Number(s.msgId) === Number(stackId));
}

function getStackPixel(stack) {
  const params = state.battle?.params;
  if (!params || !state.konvaStage) return null;
  const defxn = params._defxn;
  const defyn = params._defyn;
  const pd = calcPoleData(state.konvaStage.width(), state.konvaStage.height(), defxn, defyn);
  const isBig = stack.flags?.includes('big');
  if (isBig) {
    const { x: sx, y: sy } = cellToPixel(stack._col, stack._row, pd, defxn, defyn);
    const { x: sxe, y: sye } = cellToPixel(stack._col + 1, stack._row + 1, pd, defxn, defyn);
    return { x: (sx + sxe) / 2, y: (sy + sye) / 2 };
  }
  return cellToPixel(stack._col, stack._row, pd, defxn, defyn);
}

let currentActorMsgId = null;
let finished = false;

function getMoveDuration(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const speed = state.speeds[state.speedIdx] || 1;
  return (Math.min(1600, Math.max(250, distance / 0.22)) / speed) / 1000;
}

function finishReplayTween() {
  state.replayTween = null;
  state.replayMove = null;
  state.replayAnimating = false;
  stepReplay();
}

function processMove(actor, action) {
  const fromCol = actor._col;
  const fromRow = actor._row;
  const toCol = action.to_x + 1;
  const toRow = action.to_y + 1;
  if (fromCol === toCol && fromRow === toRow) return false;

  const from = getStackPixel({ ...actor, _col: fromCol, _row: fromRow, flags: actor.flags });
  const to = getStackPixel({ ...actor, _col: toCol, _row: toRow, flags: actor.flags });
  if (!from || !to) return false;
  actor._col = fromCol;
  actor._row = fromRow;
  renderCreatures(state.battle.stacks, state.battle.params);
  const group = findCreatureGroup(actor.msgId);
  if (!group) {
    state.replayAnimating = false;
    state.replayMove = null;
    return false;
  }
  actor._col = toCol;
  actor._row = toRow;
  {
    state.replayAnimating = true;
    stopIdleAnimation(group);
    group.x(from.x);
    group.y(from.y);
    const duration = getMoveDuration(from, to);
    state.replayMove = { group, from, to, startedAt: performance.now(), duration };
    state.replayTween = new Konva.Tween({
      node: group, x: to.x, y: to.y,
      duration,
      easing: Konva.Easings.Linear,
      onFinish: finishReplayTween,
    });
    state.replayTween.play();
    return true;
  }
  return false;
}

function processDamage(actor, target, action) {
  if (!target) return;
  const damage = action.damage || 0;
  const before = target.count || 0;
  target.count = Math.max(0, (target.count || 0) - Math.floor(damage / 100));
  if (target.count <= 0) target.alive = false;
  const initCount = target._initialCount || target.count || 1;
  target._hp = Math.max(0, (target.count || 0) / initCount);

  const group = findCreatureGroup(target.msgId);
  if (group && before !== target.count) {
    animateStackCount(group, before, target.count);
  }

  const px = getStackPixel(target);
  if (px) {
    showDamage(px.x, px.y, damage);
    if (action.action_label === 'Атака' || action.action_label === 'Контратака') showCombatMsg(action.action_label === 'Атака' ? 'Атака!' : 'Контратака!', px.x, px.y + 20);
  }
}

function processHeal(actor, target, action) {
  const params = state.battle?.params;
  let px = target ? getStackPixel(target) : null;

  if (!px && params) {
    const raw = action.raw || '';
    const m = raw.match(/^R\d{3}(\d{3})$/);
    if (m) {
      const code = parseInt(m[1], 10);
      const targetX = Math.floor(code / 10) + 1;
      const targetY = (code % 10) + 1;
      const pd = calcPoleData(state.konvaStage.width(), state.konvaStage.height(), params._defxn, params._defyn);
      px = cellToPixel(targetX, targetY, pd, params._defxn, params._defyn);
    }
  }

  if (target && action.damage) {
    const heal = Math.floor(action.damage / 100);
    target.count = (target.count || 0) + heal;
    const initCount = target._initialCount || target.count || 1;
    target._hp = Math.min(1, (target.count || 0) / initCount);
  }

  if (px) showCombatMsg('Лечение', px.x, px.y - 30);
}

function processDeath(actor, target) {
  if (!target) return;
  const msgId = target.msgId;
  target.count = 0;
  target.alive = false;
  target._hp = 0;
  if (msgId !== undefined) {
    fadeOutGroup(msgId);
  }
}

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
}

function showBattleStats() {
  if (!state.battle) return;
  const actions = state.battle._fullActions || state.replayActions || [];
  const turns = state.battle.turns || '?';
  let totalDmg = 0, spells = 0, moves = 0;
  for (const a of actions) {
    if (a.action === 'damage' || a.action === 'knocking_shot') totalDmg += (a.damage || 0);
    if (a.action === 'spell') spells++;
    if (a.action === 'move') moves++;
  }
  const stacks = state.battle.stacks || [];
  let alive = 0;
  for (const s of stacks) { if (s.count > 0 && s.alive !== false) alive++; }
  const warid = state.battle.params?._warid || '';
  showMsg(`Бой #${warid} | Ходов: ${turns} | Действий: ${actions.length} | Урон: ${totalDmg.toLocaleString()} | Заклинаний: ${spells} | Отрядов: ${alive}/${stacks.length}`, 5000);
}

function showBattleResult(text) {
  const el = document.getElementById('battle-result');
  const textEl = document.getElementById('br-text');
  if (!el || !textEl) return;
  textEl.textContent = text;
  el.style.display = 'flex';
}

function finishText(action) {
  const raw = action.text || action.raw || action.action_label || 'Конец боя';
  return stripHtml(raw);
}

function applyReplayAction(action) {
  if (!action || !state.battle) return false;

  if (currentActorMsgId !== null) {
    highlightStack({ msgId: currentActorMsgId }, false);
    currentActorMsgId = null;
  }

  const actor = action.actor !== undefined ? findStackById(action.actor) : null;
  const target = action.target !== undefined ? findStackById(action.target) : null;

  if (actor) {
    currentActorMsgId = actor.msgId;
    highlightStack(actor, true);
  }

  const actionType = action.action || '';
  const label = action.action_label || actionType;

  const showLabelAt = (stack, text, yOff) => {
    if (!stack) return;
    const px = getStackPixel(stack);
    if (px) showCombatMsg(text, px.x, px.y + (yOff || -30));
  };

  switch (actionType) {
    case 'move':
      if (actor) return processMove(actor, action);
      break;
    case 'damage':
      processDamage(actor, target, action);
      if (action.action_label === 'Контратака') playSound('counter');
      else playSound('attack');
      if (target) flashCell(target._col, target._row, 'rgba(255,0,0,0.2)', target.flags?.includes('big'));
      break;
    case 'heal':
      processHeal(actor, target, action);
      playSound('heal');
      break;
    case 'hero_death':
      processDeath(actor, target);
      playSound('death');
      showLabelAt(target, '💀', 0);
      break;
    case 'spell':
      {
        const spellCode = action.spell || action.spell_name || '';
        if (actor && target) {
          const apx = getStackPixel(actor);
          const tpx = getStackPixel(target);
          if (apx && tpx) fireProjectile(apx, tpx, 'magic');
        }
        playSound('spell');
        if (target && action.spell_name) {
          const px = getStackPixel(target);
          if (px) showCombatMsg('🔮 ' + action.spell_name, px.x, px.y - 30);
          flashCell(target._col, target._row, 'rgba(100,100,255,0.25)', target.flags?.includes('big'));
        }
        if (spellCode === 'wof' || spellCode === 'ato') {
          renderCreatures(state.battle.stacks, state.battle.params);
        }
      }
      break;
    case 'luck':
      showLabelAt(actor, action.luck === 'luck' ? '🍀 Удача!' : '⭐ Мораль!', -20);
      break;
    case 'initiative':
      if (actor && action.initiative !== undefined) {
        const oldVal = actor.initiative || 0;
        actor.initiative = action.initiative;
        if (oldVal !== action.initiative) {
          showLabelAt(actor, '⚡ ' + action.initiative + '%', -20);
        }
      }
      break;
    case 'initiative_change':
      if (actor) {
        const delta = action.initiative_delta || parseFloat(action.initiative_delta_text) || 0;
        if (delta) {
          actor.initiative = (actor.initiative || 0) + delta;
        }
      }
      showLabelAt(actor, '⚡ Иниц. изменена (' + (action.initiative_delta || action.initiative_delta_text || '') + ')', -20);
      break;
    case 'wait':
      showLabelAt(actor, '⏳ Ожидание', -20);
      break;
    case 'defence':
      showLabelAt(actor, '🛡 Защита', -20);
      break;
    case 'counterattack':
      showLabelAt(actor, '⚡ Контратака', -20);
      break;
    case 'knocking_shot':
      if (actor && target) {
        const apx = getStackPixel(actor);
        const tpx = getStackPixel(target);
        if (apx && tpx) fireProjectile(apx, tpx, 'arrow');
      }
      if (target && action.damage) { processDamage(actor, target, action); flashCell(target._col, target._row, 'rgba(255,0,0,0.2)', target.flags?.includes('big')); }
      playSound('arrow');
      showLabelAt(actor, '🏹 Выстрел', -20);
      break;
    case 'multi_attack':
      if (actor && target) {
        const apx = getStackPixel(actor);
        const tpx = getStackPixel(target);
        if (apx && tpx) fireProjectile(apx, tpx, 'arrow');
      }
      if (target && action.damage) { processDamage(actor, target, action); flashCell(target._col, target._row, 'rgba(255,0,0,0.2)', target.flags?.includes('big')); }
      showLabelAt(actor, '⚔️ Мультиатака', -20);
      break;
    case 'stun':
      showLabelAt(target, '💫 Оглушение', -20);
      break;
    case 'mana_drain':
      showLabelAt(target, '🔷 Кража маны', -20);
      break;
    case 'summon':
      showLabelAt(actor, '🔮 Призыв', -20);
      renderCreatures(state.battle.stacks, state.battle.params);
      break;
    case 'speed_up':
      showLabelAt(actor, '💨 Ускорение', -20);
      break;
    case 'mass_initiative':
      showLabelAt(actor, '⚡ Массовая иниц.', -30);
      break;
    case 'rune':
      showLabelAt(actor, '🔶 Руна', -20);
      break;
    case 'flee':
      showLabelAt(actor, '🏃 Бегство', -20);
      break;
    case 'corrosive_strike':
      if (target && action.damage) processDamage(actor, target, action);
      showLabelAt(actor, '☣ Кислотная атака', -20);
      break;
    case 'destined_strike':
      if (target && action.damage) processDamage(actor, target, action);
      showLabelAt(actor, '⚡ Роковой удар', -20);
      break;
    case 'knockback':
      if (target && action.damage) processDamage(actor, target, action);
      showLabelAt(actor, '💥 Отбрасывание', -20);
      break;
    case 'hint':
      if (action.text) showMsg(stripHtml(action.text), 3000);
      break;
    case 'stars':
      showLabelAt(actor, '⭐ Звёзды', -20);
      break;
    case 'finish':
      if (!finished) {
        showMsg(finishText(action), 10000);
        showBattleResult(finishText(action));
        finished = true;
      }
      break;
    default:
      if (label && label !== actionType) showLabelAt(actor, label, -20);
      break;
  }

  return false;
}

function stopReplay() {
  if (state.replayTimer) { clearInterval(state.replayTimer); state.replayTimer = null; }
  if (state.replayTween) { state.replayTween.destroy(); state.replayTween = null; }
  state.replayMove = null;
  state.replayAnimating = false;
}

function cleanupResources() {
  if (state.creatureLayer) {
    state.creatureLayer.getChildren().forEach((child) => {
      const tween = child.getAttr('_idleTween');
      if (tween) { tween.destroy(); child.setAttr('_idleTween', null); }
    });
    state.creatureLayer.destroyChildren();
  }
  if (state.overlayLayer) state.overlayLayer.destroyChildren();
  if (state.terrainLayer) state.terrainLayer.destroyChildren();
  if (state.bgLayer) state.bgLayer.destroyChildren();
  state.animCache.clear();
  state.imgCache.clear();
}

function jumpToAction(index) {
  if (!state.battle) return;
  stopReplay();
  state.paused = true;
  const pauseEl = document.getElementById('img-pause');
  const playEl = document.getElementById('img-play');
  if (pauseEl) pauseEl.style.display = 'none';
  if (playEl) playEl.style.display = '';

  const originalActions = state.battle._fullActions || state.replayActions;
  const snapshot = state.battle._initialStacks
    ? state.battle._initialStacks.map(s => ({ ...s }))
    : state.battle.stacks.map(s => ({ ...s }));

  const targetIdx = Math.min(index, originalActions.length - 1);
  const stacksCopy = snapshot.map(s => ({ ...s, _col: s._col, _row: s._row, count: s.count, alive: s.alive !== false, _initialCount: s._initialCount || s.count, _hp: 1 }));
  state.battle.stacks = stacksCopy;

  let lastActor = null;
  const runActions = originalActions.slice(0, targetIdx + 1);
  for (const act of runActions) {
    const actor = act.actor !== undefined ? stacksCopy.find(s => Number(s.msgId) === Number(act.actor)) : null;
    const target = act.target !== undefined ? stacksCopy.find(s => Number(s.msgId) === Number(act.target)) : null;

    if (act.action === 'move' && actor && act.to_x !== undefined) {
      actor._col = act.to_x + 1;
      actor._row = act.to_y + 1;
    }
    if ((act.action === 'damage' || act.action === 'hero_death') && target && act.damage) {
      target.count = Math.max(0, (target.count || 0) - Math.floor(act.damage / 100));
      if (target.count <= 0) target.alive = false;
      const ic = target._initialCount || target.count || 1;
      target._hp = Math.max(0, (target.count || 0) / ic);
    }
    if (actor) lastActor = actor;
  }

  updateLogHighlight(targetIdx);
  renderCreatures(stacksCopy, state.battle.params);
  if (currentActorMsgId !== null) {
    highlightStack({ msgId: currentActorMsgId }, false);
    currentActorMsgId = null;
  }
  if (lastActor) {
    currentActorMsgId = lastActor.msgId;
    highlightStack(lastActor, true);
    updateInitBar(lastActor.msgId);
  }
}

function stepReplay() {
  if (state.paused || state.replayAnimating || !state.battle) return;
  if (state.replayIndex >= state.replayActions.length) {
    stopReplay();
    if (currentActorMsgId !== null) {
      highlightStack({ msgId: currentActorMsgId }, false);
      currentActorMsgId = null;
    }
    return;
  }
  updateLogHighlight(state.replayIndex);
  const action = state.replayActions[state.replayIndex];
  state.replayIndex += 1;
  const wait = applyReplayAction(action);
  renderInitBar(state.battle.stacks);
  if (currentActorMsgId !== null) updateInitBar(currentActorMsgId);
  if (!wait) renderCreatures(state.battle.stacks, state.battle.params);
}

function startReplay(actions = []) {
  stopReplay();
  state.replayIndex = 0;
  state.replayActions = actions;
  finished = false;
  window.__replayTick = stepReplay;
  window.__setReplayPaused = (paused) => {
    if (!state.replayTween) return;
    if (paused) state.replayTween.pause();
    else state.replayTween.play();
  };
  state.replayTimer = setInterval(window.__replayTick, getReplayDelay());
}

async function loadAssets(stacks, loadText) {
  loadText.textContent = 'Загрузка спрайтов...';
  const urls = [...new Set(stacks.map((s) => s.imgUrl).filter(Boolean))];
  let loaded = 0;
  const onLoad = () => { loaded++; loadText.textContent = `Загрузка спрайтов ${loaded}/${urls.length}...`; };
  await preloadImages(urls, onLoad);
  loadText.textContent = `Загружено ${stacks.length} юнитов`;
}

function createInitBar() {
  const bar = document.createElement('div');
  bar.className = 'initiative-bar'; bar.id = 'initiative-bar';
  const area = document.getElementById('area_battlefield');
  if (area) area.appendChild(bar);
}

async function init() {
  const loadEl = document.getElementById('loading');
  const loadText = document.getElementById('loading-text');
  const combatRoot = document.getElementById('combat_root');
  try {
    const savedSpeed = parseInt(localStorage.getItem('replay_speed'));
    if (!isNaN(savedSpeed) && savedSpeed >= 0 && savedSpeed < state.speeds.length) {
      state.speedIdx = savedSpeed;
    }
    const params = new URLSearchParams(location.search);
    const warid = params.get('warid');
    if (!warid) throw new Error('warid не указан. Используйте: ?warid=123456');
    const showToken = params.get('show') || '';
    loadText.textContent = 'Загрузка данных...';
    const data = await fetchReplayData(warid, showToken);
    if (data.stacks.length === 0) throw new Error('Составы боя не найдены');
    await loadAssets(data.stacks, loadText);
    state.battle = { params: data.params, stacks: data.stacks, turns: data.turns, _fullActions: data.actions, _initialStacks: data.stacks.map(s => ({ ...s, _initialCount: s.count })) };
    for (const s of state.battle.stacks) { s._initialCount = s.count; s._hp = 1; }
    for (const s of state.battle._initialStacks) { s._initialCount = s.count; s._hp = 1; }
    combatRoot.style.display = '';
    loadEl.style.display = 'none';
    createInitBar();
    renderHeroPanels(data);
    renderHeroDolls(data.heroScripts);
    renderInitBar(data.stacks);
    initStage();
    resizeStage(data.params);
    renderAll();
    state.replayActions = data.actions;
    setLogJumpHandler(jumpToAction);
    initBattleLog();
    bindKeyboard();
    startReplay(data.actions);
    bindStageEvents(data.params);
    showMsg(`Бой #${warid} загружен · Ходов: ${data.turns || '?'}`);
  } catch (err) {
    if (loadEl) {
      const warid = new URLSearchParams(location.search).get('warid') || '';
      loadEl.innerHTML = `<div class="window loader_window" style="display:flex;flex-direction:column">
        <div class="info_head" style="color:#ff6b6b">Ошибка</div>
        <div style="color:#ff6b6b;margin-bottom:16px;font-size:13px">${err.message}</div>
        <div style="display:flex;gap:10px">
          <button onclick="location.reload()" style="padding:8px 20px;background:rgba(201,168,76,0.15);border:1px solid #c9a84c;border-radius:6px;color:#f0cf88;font-size:14px;cursor:pointer">Повторить</button>
          <button onclick="history.back()" style="padding:8px 20px;background:rgba(255,80,80,0.15);border:1px solid #ff6b6b;border-radius:6px;color:#ff6b6b;font-size:14px;cursor:pointer">Назад</button>
        </div>
      </div>`;
    }
  }
}

function initBindings() { bindControls(); init(); }

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBindings);
} else {
  initBindings();
}
