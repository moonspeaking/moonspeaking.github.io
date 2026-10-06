import { CELL_W, getLandId, state, getLandImageUrl, calcPoleData, getxa } from './state.js';

export function drawTerrain(params) {
  const bgLayer = state.bgLayer;
  if (!bgLayer) return;

  bgLayer.destroyChildren();
  state.bgImageRef = null;
  state.gridGroup = null;
  state.walls = null;

  const defxn = params._defxn;
  const defyn = params._defyn;
  const lid = getLandId(params._gtype);
  const container = document.getElementById('konva-container');
  const cw = container.clientWidth;
  const ch = container.clientHeight;

  initWalls(params);

  drawGrid(bgLayer, defxn, defyn, cw, ch);
  bgLayer.batchDraw();

  const imgUrl = getLandImageUrl(lid, params._warid);
  const img = new window.Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const natW = img.naturalWidth || img.width;
    const cropH = natW * Math.min(1, ch / cw);
    state.bgImageRef = new Konva.Image({
      x: 0, y: 0,
      width: cw, height: ch,
      image: img,
      crop: { x: 0, y: 0, width: natW, height: cropH },
    });
    bgLayer.add(state.bgImageRef);
    drawGrid(bgLayer, defxn, defyn, cw, ch);
    bgLayer.batchDraw();
  };
  img.onerror = () => {
    state.bgImageRef = null;
    drawGrid(bgLayer, defxn, defyn, cw, ch);
    bgLayer.batchDraw();
  };
  img.src = imgUrl;
}

function initWalls(params) {
  const defxn = params._defxn;
  const defyn = params._defyn;
  const btype = params._btype || 0;
  const gtype = params._gtype || 0;
  const lid = getLandId(gtype);
  const walls = [];

  for (let x = 0; x <= defxn; x++) {
    walls[x] = [];
    for (let y = 0; y <= defyn; y++) {
      walls[x][y] = 0;
    }
  }

  const bt = getbtype(btype);
  const winter = lid.replace('land_', '');

  if (bt === 8) {
    for (let i = 0; i <= defxn; i++) {
      for (let j = 0; j <= defyn; j++) {
        if (i === 0 || j === 0 || i === defxn || j === defyn) {
          walls[i][j] = 1;
        }
      }
    }
    if (defxn > 8 || defyn > 8) {
      walls[3][4] = 1;
      walls[3][5] = 1;
      walls[4][3] = 1;
      walls[5][3] = 1;
      walls[defxn - 3][4] = 1;
      walls[defxn - 3][5] = 1;
      walls[defxn - 4][3] = 1;
      walls[defxn - 5][3] = 1;
    }
  }

  if (bt === 9) {
    for (let i = 0; i <= defxn; i++) {
      for (let j = 0; j <= defyn; j++) {
        if (i === 0 || j === 0 || i === defxn || j === defyn) {
          walls[i][j] = 1;
        }
      }
    }
    if (defxn > 8 || defyn > 8) {
      walls[3][4] = 1;
      walls[3][5] = 1;
      walls[4][3] = 1;
      walls[5][3] = 1;
      walls[defxn - 3][4] = 1;
      walls[defxn - 3][5] = 1;
      walls[defxn - 4][3] = 1;
      walls[defxn - 5][3] = 1;
    }
  }

  if (winter === 'castle') {
    walls[1][1] = 1;
    walls[1][2] = 1;
    walls[1][defyn - 1] = 1;
    walls[1][defyn] = 1;
    walls[2][1] = 1;
    walls[2][defyn] = 1;
    walls[defxn - 2][1] = 1;
    walls[defxn - 2][defyn] = 1;
    walls[defxn - 1][1] = 1;
    walls[defxn - 1][2] = 1;
    walls[defxn - 1][defyn - 1] = 1;
    walls[defxn - 1][defyn] = 1;
    if (bt === 11 || bt === 16) {
      walls[Math.floor(defxn / 2)][1] = 1;
      walls[Math.floor(defxn / 2) + 1][1] = 1;
    }
  }

  if (bt === 11) {
    for (let i = 0; i <= defxn; i++) {
      for (let j = 0; j <= defyn; j++) {
        if (j === 0) walls[i][j] = 1;
      }
    }
    walls[2][defyn] = 1;
    walls[defxn - 2][defyn] = 1;
  }

  if (bt === 13) {
    walls[1][defyn] = 1;
    walls[defxn - 1][defyn] = 1;
  }

  if (bt === 10) {
    for (let i = 0; i <= defxn; i++) {
      for (let j = 0; j <= defyn; j++) {
        if (j === 0 || j === defyn) walls[i][j] = 1;
      }
    }
  }

  state.walls = walls;
}

function getbtype(btype) {
  switch (btype) {
    case 1: return 1;
    case 2: return 2;
    case 3: return 3;
    case 4: return 4;
    case 6: return 4;
    case 13: return 4;
    case 17: return 3;
    case 20: return 4;
    default: return 0;
  }
}

function drawGrid(layer, defxn, defyn, stageW, stageH) {
  const pd = calcPoleData(stageW, stageH, defxn, defyn);
  const walls = state.walls;
  if (!walls) return;
  if (state.gridGroup) state.gridGroup.destroy();
  const gridGroup = new Konva.Group({ listening: false });
  const sw = Math.max(1, Math.round(pd.scaling * 1.5));
  const fillAlpha = 0.05;

  for (let x = 1; x <= defxn - 2; x++) {
    for (let y = 1; y <= defyn; y++) {
      const cellType = walls[x][y];
      const a = getxa(x, y, pd, defxn, defyn);
      const isWall = cellType !== 0 && cellType !== 3;
      const isAlt = (x + y) % 2 === 0;
      const wallLeft = !isWall && ((walls[x - 1] && walls[x - 1][y] !== 0 && walls[x - 1][y] !== 3) || x === 1);
      const wallRight = !isWall && ((walls[x + 1] && walls[x + 1][y] !== 0 && walls[x + 1][y] !== 3) || x === defxn - 2);
      const wallTop = !isWall && ((walls[x][y - 1] !== 0 && walls[x][y - 1] !== 3) || y === 1);
      const wallBottom = !isWall && ((walls[x][y + 1] !== 0 && walls[x][y + 1] !== 3) || y === defyn);

      if (isWall) {
        gridGroup.add(new Konva.Line({
          points: [a.x0, a.y0, a.x1, a.y0, a.x2, a.y2, a.x3, a.y2],
          fill: isAlt ? 'rgba(55,42,35,0.6)' : 'rgba(45,35,30,0.65)',
          closed: true,
          stroke: 'rgba(80,60,50,0.5)',
          strokeWidth: sw,
          lineCap: 'round', lineJoin: 'round',
          hitGraphEnabled: false, listening: false,
        }));
        continue;
      }

      const fillColor = isAlt
        ? `rgba(255,255,255,${fillAlpha})`
        : `rgba(0,0,0,${fillAlpha})`;

      gridGroup.add(new Konva.Line({
        points: [a.x0, a.y0, a.x1, a.y0, a.x2, a.y2, a.x3, a.y2],
        fill: fillColor,
        closed: true,
        stroke: 'rgba(200,168,76,0.2)',
        strokeWidth: sw,
        lineCap: 'round', lineJoin: 'round',
        hitGraphEnabled: false, listening: false,
      }));

      if (wallLeft) {
        gridGroup.add(new Konva.Line({
          points: [a.x3, a.y2, a.x0, a.y0],
          stroke: 'rgba(100,75,50,0.7)',
          strokeWidth: sw * 2,
          lineCap: 'round', listening: false, hitGraphEnabled: false,
        }));
      }
      if (wallRight) {
        gridGroup.add(new Konva.Line({
          points: [a.x1, a.y0, a.x2, a.y2],
          stroke: 'rgba(100,75,50,0.7)',
          strokeWidth: sw * 2,
          lineCap: 'round', listening: false, hitGraphEnabled: false,
        }));
      }
      if (wallTop) {
        gridGroup.add(new Konva.Line({
          points: [a.x0, a.y0, a.x1, a.y0],
          stroke: 'rgba(100,75,50,0.7)',
          strokeWidth: sw * 2,
          lineCap: 'round', listening: false, hitGraphEnabled: false,
        }));
      }
      if (wallBottom) {
        gridGroup.add(new Konva.Line({
          points: [a.x3, a.y2, a.x2, a.y2],
          stroke: 'rgba(100,75,50,0.7)',
          strokeWidth: sw * 2,
          lineCap: 'round', listening: false, hitGraphEnabled: false,
        }));
      }
    }
  }

  layer.add(gridGroup);
  state.gridGroup = gridGroup;
}

export function resizeStage(params = state.battle?.params) {
  const stage = state.konvaStage;
  if (!stage || !params) return;

  const container = document.getElementById('konva-container');
  const cw = container.clientWidth;
  const ch = container.clientHeight;

  stage.width(cw);
  stage.height(ch);

  if (state.bgLayer && state.bgImageRef) {
    const img = state.bgImageRef.image();
    if (img) {
      const natW = img.naturalWidth || img.width;
      const cropH = natW * Math.min(1, ch / cw);
      state.bgImageRef.width(cw);
      state.bgImageRef.height(ch);
      state.bgImageRef.crop({ x: 0, y: 0, width: natW, height: cropH });
    }
  }

  if (state.bgLayer && state.walls) {
    if (state.gridGroup) {
      state.gridGroup.destroy();
      state.gridGroup = null;
    }
    drawGrid(state.bgLayer, params._defxn, params._defyn, cw, ch);
  }

  for (const layer of [state.terrainLayer, state.creatureLayer]) {
    if (!layer) continue;
    layer.scaleX(1);
    layer.scaleY(1);
    layer.x(0);
    layer.y(0);
  }

  stage.batchDraw();
}

export function clearHover() {
  state.hoveredHex = null;
}

export function updateHover(pos, params) {
  const cellSize = CELL_W * state.terrainLayer.scaleX();
  const col = Math.floor(pos.x / cellSize);
  const row = Math.floor(pos.y / cellSize);
  const nextHex = (col >= 0 && col < params._defxn && row >= 0 && row < params._defyn)
    ? { col, row }
    : null;

  if (state.hoveredHex && nextHex && state.hoveredHex.col === nextHex.col && state.hoveredHex.row === nextHex.row) {
    return;
  }

  clearHover();
  state.hoveredHex = nextHex;
}
