import { state } from './state.js';

const STAT_ICONS = {
  attack: 'https://dcdn.heroeswm.ru/i/icons/attr_attack.png',
  defence: 'https://dcdn.heroeswm.ru/i/icons/attr_defense.png',
  magicpower: 'https://dcdn.heroeswm.ru/i/icons/attr_magicpower.png',
  knowledge: 'https://dcdn.heroeswm.ru/i/icons/attr_knowledge.png',
  fortune: 'https://dcdn.heroeswm.ru/i/icons/attr_fortune.png',
  morale: 'https://dcdn.heroeswm.ru/i/icons/attr_morale.png',
  initiative: 'https://dcdn.heroeswm.ru/i/icons/attr_initiative.png',
  ap: 'https://dcdn.heroeswm.ru/i/icons/attr_oa.png',
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

export function renderHeroPanels(data) {
  const leftEl = document.getElementById('war_hero_info_left');
  const rightEl = document.getElementById('war_hero_info_right');
  if (!leftEl || !rightEl) return;
  leftEl.innerHTML = '';
  rightEl.innerHTML = '';

  const leftHero = data?.heroes?.left;
  const rightHero = data?.heroes?.right;
  const heroData = data?.heroData || {};
  const fallbackPortrait = 'https://dcdn.heroeswm.ru/i/kukla_png/kukla6.png';

  const renderPanel = (container, heroInfo, idx, side) => {
    const hd = heroData[idx] || {};
    const fallbackName = idx === 1 ? 'Атакующий' : 'Защитник';

    const kukla = hd.kukla ? escapeHtml(hd.kukla) : 'kukla6';
    const portraitUrl = heroInfo?.imgUrl ? escapeHtml(heroInfo.imgUrl) : `https://dcdn.heroeswm.ru/i/kukla_png/${kukla}.png`;
    const heroName = escapeHtml(heroInfo?.name || hd.heroName || fallbackName);
    const clanHtml = hd.clan
      ? `<div class="hero_clan">[${escapeHtml(hd.clan.id)}] ${escapeHtml(hd.clan.name)} (ур.${escapeHtml(hd.clan.level)})</div>`
      : '';

    const panel = document.createElement('div');
    panel.className = 'hero_panel';

    let statsHtml = '';
    if (hd.ap) statsHtml += `<div class="hero_stat"><img src="${STAT_ICONS.ap}">${hd.ap}</div>`;
    if (hd.initiative) statsHtml += `<div class="hero_stat"><img src="${STAT_ICONS.initiative}">${hd.initiative}%</div>`;

    panel.innerHTML = `
      <div class="hero_row">
        <img class="hero_portrait_img" src="${portraitUrl}"
             onerror="this.src='${escapeHtml(fallbackPortrait)}'">
        <div>
          <div class="hero_name">${heroName}</div>
          ${clanHtml}
        </div>
      </div>
      ${statsHtml ? `<div class="hero_stats">${statsHtml}</div>` : ''}
    `;

    if (hd.army && hd.army.length > 0) {
      const armyDiv = document.createElement('div');
      armyDiv.className = 'hero_army';
      for (const u of hd.army) {
        const imgUrl = `https://dcdn.heroeswm.ru/i/png40/${u.sysName}.png`;
        const unitDiv = document.createElement('div');
        unitDiv.className = 'army_unit';
        unitDiv.innerHTML = `
          <img src="${escapeHtml(imgUrl)}" onerror="this.style.display='none'">
          <span>${escapeHtml(u.nameRu)}</span>
          <span class="army_count">×${escapeHtml(u.count)}</span>
        `;
        armyDiv.appendChild(unitDiv);
      }
      panel.appendChild(armyDiv);
    }

    if (hd.specialArts) {
      const specDiv = document.createElement('div');
      specDiv.className = 'hero_special';
      const lines = hd.specialArts.split('\n').filter(Boolean);

      let extraStatsHtml = '';
      for (const line of lines) {
        const trimmed = line.trim();
        const m = trimmed.match(/^([А-Яа-яA-Za-z\s%]+):\s*([+-]?\d+(?:\.\d+)?)%?$/);
        if (m && !trimmed.includes('ОА') && !trimmed.includes('Ин')) {
          extraStatsHtml += `<div class="hero_stat"><span>${m[1].trim()}</span><span style="color:#4caf50;margin-left:auto">${m[2]}%</span></div>`;
        } else {
          const d = document.createElement('div');
          d.textContent = trimmed;
          specDiv.appendChild(d);
        }
      }
      if (extraStatsHtml) {
        const extraDiv = document.createElement('div');
        extraDiv.className = 'hero_stats';
        extraDiv.style.marginTop = '4px';
        extraDiv.innerHTML = extraStatsHtml;
        specDiv.insertBefore(extraDiv, specDiv.firstChild);
      }
      panel.appendChild(specDiv);
    }

    container.appendChild(panel);
  };

  if (leftHero || heroData[1]) {
    renderPanel(leftEl, leftHero, 1, 'left');
  }
  if (rightHero || heroData[2]) {
    renderPanel(rightEl, rightHero, 2, 'right');
  }
}

export function renderInitBar(stacks) {
  const bar = document.getElementById('initiative-bar');
  if (!bar) return;

  // Filter alive, sort by initiative ascending (lowest = acts next)
  const sorted = [...stacks].filter(s => s.count > 0 && s.alive !== false)
    .sort((a, b) => ((a.initiative || 0) - (b.initiative || 0)));

  if (!sorted.length) { bar.innerHTML = ''; return; }

  // Calculate progress range for progress bars
  const vals = sorted.map(s => s.initiative || 0);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = Math.max(1, max - min);

  // Record old positions for FLIP
  const oldRects = {};
  for (const child of bar.children) {
    oldRects[child.dataset.msgId] = child.getBoundingClientRect();
  }

  const existing = {};
  for (const child of bar.children) {
    existing[child.dataset.msgId] = child;
  }

  const newIds = new Set(sorted.map(s => String(s.msgId)));

  // Fade out dead units
  for (const mid in existing) {
    if (!newIds.has(mid)) {
      const el = existing[mid];
      el.classList.add('init-exit');
      setTimeout(() => { if (el.parentNode) el.remove(); }, 350);
    }
  }

  // Reorder DOM to match sorted order
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const mid = String(s.msgId);
    const initVal = s.initiative || 0;
    const pct = Math.max(0, Math.min(100, ((max - initVal) / range) * 100));

    let el = existing[mid];
    if (!el) {
      el = document.createElement('div');
      el.className = `init-slot side${s.owner}`;
      el.dataset.msgId = mid;

      const fill = document.createElement('div');
      fill.className = 'init-fill';
      fill.style.width = pct + '%';
      el.appendChild(fill);

      const name = s.animUnit || s.sysName;
      if (name) {
        const img = document.createElement('img');
        img.src = `https://dcdn.heroeswm.ru/i/portraits/${name}p40.png`;
        img.onerror = () => { img.style.display = 'none'; };
        el.appendChild(img);
      }
      const lbl = document.createElement('div');
      lbl.className = 'init-label';
      lbl.textContent = initVal + '%';
      el.appendChild(lbl);

      const cnt = document.createElement('div');
      cnt.className = 'init-count';
      cnt.textContent = String(s.count);
      el.appendChild(cnt);
    } else {
      el.classList.toggle('side0', s.owner === 0);
      el.classList.toggle('side1', s.owner === 1);
      const fill = el.querySelector('.init-fill');
      if (fill) fill.style.width = pct + '%';
      const cntEl = el.querySelector('.init-count');
      if (cntEl) cntEl.textContent = String(s.count);
      const lbl = el.querySelector('.init-label');
      if (lbl) lbl.textContent = initVal + '%';
    }
    bar.appendChild(el);  // Move to correct position
  }

  // FLIP animation: compute deltas and animate
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      for (const child of bar.children) {
        const mid = child.dataset.msgId;
        const old = oldRects[mid];
        const cur = child.getBoundingClientRect();
        if (old && (old.left !== cur.left || old.top !== cur.top)) {
          const dx = old.left - cur.left;
          const dy = old.top - cur.top;
          child.style.transition = 'none';
          child.style.transform = `translate(${dx}px, ${dy}px)`;
          requestAnimationFrame(() => {
            child.style.transition = 'transform 0.4s ease';
            child.style.transform = '';
          });
        }
      }
    });
  });
}

export function updateInitBar(activeMsgId) {
  const bar = document.getElementById('initiative-bar');
  if (!bar) return;
  for (const slot of bar.children) {
    slot.classList.toggle('active', slot.dataset.msgId === String(activeMsgId));
    if (slot.dataset.msgId === String(activeMsgId)) {
      setTimeout(() => {
        const slotLeft = slot.offsetLeft;
        const slotRight = slotLeft + slot.offsetWidth;
        const barScroll = bar.scrollLeft;
        const barWidth = bar.clientWidth;
        if (slotLeft < barScroll || slotRight > barScroll + barWidth) {
          bar.scrollTo({ left: Math.max(0, slotLeft - barWidth / 2 + slot.offsetWidth / 2), behavior: 'smooth' });
        }
      }, 100);
    }
  }
}

export function showMsg(text, duration = 3000) {
  const el = document.getElementById('combat-msg');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

export function togglePause() {
  state.paused = !state.paused;
  if (window.__setReplayPaused) window.__setReplayPaused(state.paused);
  const pauseEl = document.getElementById('img-pause');
  const playEl = document.getElementById('img-play');
  if (pauseEl) pauseEl.style.display = state.paused ? 'none' : '';
  if (playEl) playEl.style.display = state.paused ? '' : 'none';
}

function restartActiveMoveTween(speed) {
  if (state.paused) return;
  const move = state.replayMove;
  if (!move || !state.replayTween || !move.group) return;
  try { state.replayTween.pause(); } catch (_) {}
  const now = performance.now();
  const elapsed = (now - move.startedAt) / 1000;
  const remaining = Math.max(0.2, (move.duration - elapsed) / speed);
  const current = { x: move.group.x(), y: move.group.y() };
  state.replayMove = { group: move.group, from: current, to: move.to, startedAt: now, duration: remaining };
  state.replayTween = new Konva.Tween({
    node: move.group,
    x: move.to.x,
    y: move.to.y,
    duration: remaining,
    easing: Konva.Easings.Linear,
    onFinish: () => {
      state.replayTween = null;
      state.replayMove = null;
      if (window.__replayTick) window.__replayTick();
    },
  });
  state.replayTween.play();
}

export function cycleSpeed() {
  state.speedIdx = (state.speedIdx + 1) % state.speeds.length;
  try { localStorage.setItem('replay_speed', state.speedIdx); } catch (_) {}
  const speedImgs = ['btn_play_05.png', 'btn_play_1.png', 'btn_play_2.png'];
  const el = document.getElementById('img-speed');
  if (el) el.src = `/web/img/buttons/${speedImgs[state.speedIdx]}`;
  const speed = state.speeds[state.speedIdx] || 1;
  restartActiveMoveTween(speed);
  if (state.replayTimer && window.__replayTick) {
    clearInterval(state.replayTimer);
    state.replayTimer = setInterval(window.__replayTick, Math.max(120, Math.round(900 / speed)));
  }
  showSpeedIndicator();
}

function showSpeedIndicator() {
  const speed = state.speeds[state.speedIdx] || 1;
  const el = document.getElementById('speed-indicator');
  if (el) {
    el.textContent = `x${speed}`;
    el.classList.remove('speed-hide');
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => el.classList.add('speed-hide'), 1500);
  }
}

export function showHelp() {
  showMsg(
    'Space: пауза | +\-: скорость (x0.5/x1/x2) | ←→: шаг | R: рестарт | F: fullscreen | L: лог | H: герои | I: статистика | M: звук',
    8000
  );
}

export function toggleHeroPanels() {
  const left = document.getElementById('war_hero_info_left');
  const right = document.getElementById('war_hero_info_right');
  left?.classList.toggle('hero_hidden');
  right?.classList.toggle('hero_hidden');
}

function parseKuklaHtml(kuklaStr) {
  if (!kuklaStr) return { portrait: null, slots: [] };
  const div = document.createElement('div');
  div.innerHTML = kuklaStr;
  const portrait = div.querySelector('#inv_kukla')?.getAttribute('src') || null;
  const slots = [];
  const artDivs = div.querySelectorAll('[id^="slot"][art_id]');
  for (const s of artDivs) {
    const slotId = s.id;
    const img = s.querySelector('img.cre_mon_image2');
    const hint = s.querySelector('.show_hint');
    const link = s.querySelector('a');
    slots.push({
      slotId,
      imgSrc: img?.getAttribute('src') || null,
      hint: hint?.getAttribute('hint') || hint?.getAttribute('title') || '',
      name: link?.getAttribute('name') || '',
    });
  }
  return { portrait, slots };
}

function extractJSString(text, pos) {
  if (pos >= text.length) return null;
  const quote = text[pos];
  if (quote !== "'" && quote !== '"') return null;
  let result = '';
  let i = pos + 1;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\\') {
      result += text[i] + (text[i + 1] || '');
      i += 2;
    } else if (ch === quote) {
      return { value: result, end: i + 1 };
    } else {
      result += ch;
      i++;
    }
  }
  return null;
}

function extractKuklaValue(scripts, idx) {
  const marker = `hero_kukla[${idx}]`;
  const start = scripts.indexOf(marker);
  if (start < 0) return null;
  const afterMarker = scripts.indexOf('=', start);
  if (afterMarker < 0) return null;
  let pos = afterMarker + 1;
  while (pos < scripts.length && scripts[pos] === ' ') pos++;
  if (pos >= scripts.length) return null;
  const parsed = extractJSString(scripts, pos);
  return parsed ? parsed.value : null;
}

export function renderHeroDolls(heroScripts) {
  const left = document.getElementById('war_hero_info_left');
  const right = document.getElementById('war_hero_info_right');
  if (!left || !right || !heroScripts) return;

  const parseKukla = (idx) => {
    const kuklaStr = extractKuklaValue(heroScripts, idx);
    return parseKuklaHtml(kuklaStr);
  };

  const renderDoll = (container, heroData) => {
    if (!heroData.portrait) return;
    const panel = container.querySelector('.hero_panel') || container;
    let dollDiv = panel.querySelector('.hero-doll');
    if (dollDiv) dollDiv.innerHTML = '';
    else {
      dollDiv = document.createElement('div');
      dollDiv.className = 'hero-doll';
      panel.appendChild(dollDiv);
    }

    const img = document.createElement('img');
    img.className = 'hero-doll-bg';
    img.src = heroData.portrait;
    img.alt = '';
    dollDiv.appendChild(img);

    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'hero-doll-items';
    for (const slot of heroData.slots) {
      if (!slot.imgSrc) continue;
      const item = document.createElement('div');
      item.className = 'hero-doll-item';
      const itemImg = document.createElement('img');
      itemImg.src = slot.imgSrc;
      itemImg.alt = slot.name || '';
      item.title = slot.hint;
      item.appendChild(itemImg);
      itemsDiv.appendChild(item);
    }
    dollDiv.appendChild(itemsDiv);
  };

  for (const idx of [1, 2]) {
    const hd = parseKukla(idx);
    const el = idx === 1 ? left : right;
    if (hd.portrait) renderDoll(el, hd);
  }
}

export function initBattleLog() {
  const logContainer = document.getElementById('battle-log');
  if (!logContainer || !state.battle) return;
  logContainer.innerHTML = '';
  if (!state.replayActions || state.replayActions.length === 0) {
    logContainer.innerHTML = '<div class="log-empty">Нет действий</div>';
    return;
  }
  for (let i = 0; i < state.replayActions.length; i++) {
    const act = state.replayActions[i];
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.dataset.index = i;

    let label = '';
    if (act.action === 'move') label = '🚶 Ход';
    else if (act.action === 'damage') label = '⚔️ Урон';
    else if (act.action === 'heal') label = '💚 Лечение';
    else if (act.action === 'spell') label = '🔮 ' + (act.spell_name || 'Заклинание');
    else if (act.action === 'luck') label = '🍀 ' + (act.luck === 'luck' ? 'Удача' : 'Мораль');
    else if (act.action === 'hero_death') label = '💀 Смерть';
    else if (act.action === 'finish') label = '🏁 Финал';
    else label = act.action_label || act.action || '?';

    const text = document.createElement('span');
    text.textContent = label;
    entry.appendChild(text);

    if (act.target !== undefined) {
      const sub = document.createElement('span');
      sub.className = 'log-sub';
      sub.textContent = ` #${act.target}`;
      entry.appendChild(sub);
    }
    if (act.damage) {
      const dmg = document.createElement('span');
      dmg.className = 'log-dmg';
      dmg.textContent = ` ${act.damage}`;
      entry.appendChild(dmg);
    }

    entry.onclick = () => jumpToLogEntry(i);
    logContainer.appendChild(entry);
  }
}

let _logJumpListener = null;

export function setLogJumpHandler(fn) {
  _logJumpListener = fn;
}

function jumpToLogEntry(index) {
  if (_logJumpListener) _logJumpListener(index);
}

export function updateLogHighlight(index) {
  const entries = document.querySelectorAll('.log-entry');
  for (const e of entries) {
    e.classList.toggle('active', parseInt(e.dataset.index) === index);
  }
  if (index >= 0) {
    const active = document.querySelector(`.log-entry[data-index="${index}"]`);
    if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}
