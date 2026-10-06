import { calcPoleData, cellToPixel, state } from './state.js';

export function preloadImages(urls, onProgress) {
  let done = 0;
  return Promise.all(urls.map((url) => {
    if (state.imgCache.has(url)) { done++; if (onProgress) onProgress(done); return Promise.resolve(); }
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { state.imgCache.set(url, img); done++; if (onProgress) onProgress(done); resolve(); };
      img.onerror = () => { done++; if (onProgress) onProgress(done); resolve(); };
      img.src = url;
    });
  }));
}

function stackKey(stack) {
  return stack.msgId !== undefined ? `stack_${stack.msgId}` : `stack_${stack.sysName || 'unknown'}`;
}

export function findCreatureGroup(msgId) {
  if (!state.creatureLayer) return null;
  return state.creatureLayer.findOne(`.stack_${msgId}`);
}

let highlightNode = null;

export function highlightStack(stack, active) {
  const group = stack ? findCreatureGroup(stack.msgId) : null;
  if (!group) return;
  const layer = state.overlayLayer || state.creatureLayer;
  if (!layer) return;
  if (active) {
    const rect = group.getClientRect();
    const padding = 8;
    if (!highlightNode) {
      highlightNode = new Konva.Rect({
        stroke: '#ffdd44', strokeWidth: 4,
        shadowColor: '#ffdd44', shadowBlur: 20, shadowEnabled: true,
        listening: false, perfectDrawEnabled: false,
      });
      layer.add(highlightNode);
    }
    highlightNode.x(rect.x - padding);
    highlightNode.y(rect.y - padding);
    highlightNode.width(rect.width + padding * 2);
    highlightNode.height(rect.height + padding * 2);
    highlightNode.moveToTop();
    group.moveToTop();
    layer.batchDraw();
  } else {
    if (highlightNode) { highlightNode.destroy(); highlightNode = null; layer.batchDraw(); }
  }
}

export function showDamage(x, y, amount, isHeal = false) {
  const layer = state.creatureLayer || state.bgLayer;
  if (!layer) return;
  const fmt = (n) => {
    if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };
  const text = new Konva.Text({
    x: x - 30, y: y - 35, text: fmt(amount),
    fontSize: Math.min(26, Math.max(16, Math.floor(Math.log2(Math.abs(amount) + 1) * 4))),
    fontFamily: 'Arial', fontStyle: 'bold',
    fill: isHeal ? '#44ff44' : '#ff4444',
    stroke: '#000', strokeWidth: 3, align: 'center',
  });
  layer.add(text); layer.batchDraw();
  new Konva.Tween({
    node: text, duration: 1.0, y: text.y() - 50, opacity: 0,
    onFinish: () => { text.destroy(); layer.batchDraw(); },
  }).play();
}

export function showCombatMsg(text, x, y) {
  const layer = state.creatureLayer || state.bgLayer;
  if (!layer) return;
  const t = new Konva.Text({
    x: x - 30, y: y - 50, text,
    fontSize: 14, fontFamily: 'Arial', fontStyle: 'bold',
    fill: '#ffcc00', stroke: '#000', strokeWidth: 2, align: 'center',
  });
  layer.add(t); layer.batchDraw();
  new Konva.Tween({
    node: t, duration: 1.5, y: t.y() - 30, opacity: 0,
    onFinish: () => { t.destroy(); layer.batchDraw(); },
  }).play();
}

export function animateStackCount(group, fromCount, toCount) {
  if (!group) return;
  const lbl = group.findOne('Text');
  if (!lbl) return;
  const start = fromCount;
  const end = toCount;
  const duration = 400;
  const startTime = performance.now();
  (function update() {
    const t = Math.min(1, (performance.now() - startTime) / duration);
    lbl.text(Math.round(start + (end - start) * t).toString());
    if (t < 1) requestAnimationFrame(update);
  })();
}

export function fadeOutGroup(msgId, callback) {
  const group = findCreatureGroup(msgId);
  if (!group) { if (callback) callback(); return; }
  new Konva.Tween({
    node: group, duration: 0.5, opacity: 0, scaleX: 0.3, scaleY: 0.3,
    onFinish: () => {
      group.destroy();
      if (state.creatureLayer) state.creatureLayer.batchDraw();
      if (callback) callback();
    },
  }).play();
}

export function flashCell(col, row, color, isBig) {
  const layer = state.overlayLayer || state.creatureLayer;
  if (!layer || !state.battle?.params || !state.konvaStage) return;
  const params = state.battle.params;
  const pd = calcPoleData(state.konvaStage.width(), state.konvaStage.height(), params._defxn, params._defyn);
  const { x: sx, y: sy } = cellToPixel(col, row, pd, params._defxn, params._defyn);
  const { x: sxe, y: sye } = cellToPixel(col + 1, row + 1, pd, params._defxn, params._defyn);
  const w = Math.abs(sxe - sx);
  const h = Math.abs(sye - sy);
  const flash = new Konva.Rect({
    x: sx, y: sy, width: isBig ? w * 2 : w, height: isBig ? h * 2 : h,
    fill: color || 'rgba(255,255,0,0.25)', listening: false,
  });
  layer.add(flash); layer.batchDraw();
  new Konva.Tween({
    node: flash, duration: 0.4, opacity: 0,
    onFinish: () => { flash.destroy(); layer.batchDraw(); },
  }).play();
}

export function startIdleAnimation(group) {
  if (!group || group.getAttr('_idleTween')) return;
  const baseScale = group.scaleX();
  const tween = new Konva.Tween({
    node: group, duration: 1.8 + Math.random() * 0.6,
    scaleX: baseScale * 1.02, scaleY: group.scaleY() * 1.02, y: group.y() - 2,
    easing: Konva.Easings.EaseInOut,
    onFinish: () => {
      const tween2 = new Konva.Tween({
        node: group, duration: 1.8 + Math.random() * 0.6,
        scaleX: baseScale, scaleY: group.scaleY() / 1.02, y: group.y() + 2,
        easing: Konva.Easings.EaseInOut,
        onFinish: () => { group.setAttr('_idleTween', null); startIdleAnimation(group); },
      });
      group.setAttr('_idleTween', tween2); tween2.play();
    },
  });
  group.setAttr('_idleTween', tween); tween.play();
}

export function stopIdleAnimation(group) {
  const tween = group?.getAttr('_idleTween');
  if (tween) { tween.destroy(); group.setAttr('_idleTween', null); }
}

export function renderCreatures(stacks, params) {
  const layer = state.creatureLayer;
  if (!layer || state.replayTween) return;
  layer.getChildren().forEach(stopIdleAnimation);
  layer.destroyChildren();
  const defxn = params._defxn;
  const defyn = params._defyn;
  const pd = calcPoleData(layer.getStage().width(), layer.getStage().height(), defxn, defyn);

  for (const s of stacks) {
    if (s._col === undefined || s.count <= 0 || s.alive === false) continue;
    const isBig = s.flags?.includes('big');
    const { x: sx, y: sy } = cellToPixel(s._col, s._row, pd, defxn, defyn);
    const { x: sxe, y: sye } = isBig ? cellToPixel(s._col + 1, s._row + 1, pd, defxn, defyn) : { x: sx, y: sy };
    const size = isBig ? Math.abs(sxe - sx) * 0.95 : Math.min(Math.abs(sxe - sx), Math.abs(sye - sy)) * 0.75;
    const cx = (sx + sxe) / 2;
    const cy = (sy + sye) / 2;
    const group = new Konva.Group({ x: cx, y: cy });

    const imgUrl = s.imgUrl;
    if (imgUrl && state.imgCache.has(imgUrl)) {
      const img = state.imgCache.get(imgUrl);
      if (img && img.complete && img.naturalWidth > 0) {
        const scale = size / Math.max(img.naturalWidth, img.naturalHeight);
        group.add(new Konva.Image({
          image: img, x: -img.naturalWidth / 2, y: -img.naturalHeight / 2,
          width: img.naturalWidth, height: img.naturalHeight,
          scaleX: scale, scaleY: scale,
        }));
      } else {
        group.add(new Konva.Circle({
          radius: size / 3, fill: s.owner === 1 ? '#ff6666' : '#66ff88',
          stroke: '#000', strokeWidth: 1,
        }));
      }
    } else {
      group.add(new Konva.Circle({
        radius: size / 3, fill: s.owner === 1 ? '#ff6666' : '#66ff88',
        stroke: '#000', strokeWidth: 1,
      }));
    }

    group.addName(stackKey(s));

    if (s.count > 0) {
      const lbl = new Konva.Text({
        x: -10, y: size * 0.35, text: s.count.toString(),
        fontSize: Math.max(10, size * 0.22),
        fontFamily: 'Arial', fontStyle: 'bold', fill: '#fff', align: 'center',
      });
      group.add(new Konva.Rect({
        x: lbl.x() - 3, y: lbl.y() - 2,
        width: lbl.width() + 6, height: lbl.height() + 4,
        fill: s.owner === 1 ? 'rgba(216,59,59,0.85)' : 'rgba(59,143,216,0.85)',
        stroke: '#111', strokeWidth: 1, cornerRadius: 3,
      }));
      group.add(lbl);
    }

    const hpPct = s._hp !== undefined ? s._hp : 1;
    if (hpPct > 0 && s.count > 0) {
      const barW = Math.max(16, size * 0.6);
      const barH = Math.max(3, size * 0.06);
      const barY = -size * 0.45;
      group.add(new Konva.Rect({ x: -barW / 2, y: barY, width: barW, height: barH, fill: '#333', stroke: '#111', strokeWidth: 0.5, cornerRadius: 1.5 }));
      group.add(new Konva.Rect({ x: -barW / 2, y: barY, width: barW * Math.max(0.02, hpPct), height: barH, fill: hpPct > 0.5 ? '#4caf50' : (hpPct > 0.25 ? '#ff9800' : '#f44336'), cornerRadius: 1.5 }));
    }

    layer.add(group);
    startIdleAnimation(group);
  }
  layer.batchDraw();
}
