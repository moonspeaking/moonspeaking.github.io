import { parsePoleParams, stackImageUrl } from './state.js';

function makePositions(defxn, defyn) {
  const atk = [];
  const def = [];
  if (defyn <= 4) {
    const atkRows = [1, 3, 1, 3, 0, 2];
    const defRows = [1, 3, 1, 3, 0, 2];
    for (let i = 0; i < 6; i++) {
      atk.push({ x: [0, 0, 1, 1, 2, 2][i], y: atkRows[i] });
      def.push({ x: [defxn-3, defxn-3, defxn-2, defxn-2, defxn-1, defxn-1][i], y: defRows[i] });
    }
  } else if (defyn <= 8) {
    const atkRows = [1, 5, 3, 7, 0, 4];
    const defRows = [1, 5, 3, 7, 0, 4];
    for (let i = 0; i < 6; i++) {
      atk.push({ x: [0, 0, 1, 1, 2, 2][i], y: atkRows[i] });
      def.push({ x: [defxn-3, defxn-3, defxn-2, defxn-2, defxn-1, defxn-1][i], y: defRows[i] });
    }
  } else {
    const atkRows = [1, 5, 3, 7, 0, 8];
    const defRows = [1, 5, 3, 7, 0, 8];
    for (let i = 0; i < 6; i++) {
      atk.push({ x: [0, 0, 1, 1, 2, 2][i], y: atkRows[i] });
      def.push({ x: [11, 11, 12, 12, 13, 13][i], y: defRows[i] });
    }
  }
  return { atk, def };
}

function buildWarlogStack(p) {
  if (!p.sysName) return null;
  const side = p.side || 0;
  return {
    owner: side,
    sysName: p.sysName,
    animUnit: p.animUnit || p.sysName,
    imgUrl: stackImageUrl({ animUnit: p.animUnit || p.sysName }),
    nameRu: p.nameRu,
    count: p.count || 0,
    flags: p.flags || [],
    msgId: p.msgId,
    // Боевые параметры из M-записи (уже с бонусами героя) — для окна информации.
    attack: p.attack, defense: p.defense, minDmg: p.min_dmg, maxDmg: p.max_dmg,
    hp: p.hp, speed: p.speed, initiative: p.initiative,
    shots: p.shots, range: p.range, morale: p.morale, luck: p.luck,
    _col: p.x !== undefined ? p.x + 1 : 8,
    _row: p.y !== undefined ? p.y + 1 : 2,
  };
}

function buildBattleStack(s, isDefender, index, defxn, defyn) {
  const { atk, def } = makePositions(defxn, defyn);
  const list = isDefender ? def : atk;
  const pos = list[index] || { x: isDefender ? defxn - 3 : 0, y: Math.floor(defyn / 2) };
  return {
    owner: isDefender ? 1 : 0,
    sysName: s.sysName,
    animUnit: s.animUnit || s.sysName,
    imgUrl: stackImageUrl({ animUnit: s.animUnit || s.sysName }),
    nameRu: s.nameRu,
    flags: s.flags || [],
    count: s.count || 1,
    attack: s.attack, defense: s.defense, minDmg: s.min_dmg, maxDmg: s.max_dmg,
    hp: s.hp, speed: s.speed, initiative: s.initiative, shots: s.shots,
    range: s.range, morale: s.morale, luck: s.luck, manaMax: s.mana_max,
    _col: pos.x + 1,
    _row: pos.y + 1,
  };
}

function buildWarlogStacks(parsedStacks = []) {
  return parsedStacks.map((p) => buildWarlogStack(p)).filter(Boolean);
}

function buildBattleStacks(rawStacks = [], defxn, defyn) {
  let defenderCount = 0;
  let attackerCount = 0;
  const stacks = [];

  for (const s of rawStacks) {
    if (!s.sysName || s.sysName.startsWith('comp-') || s.flags?.includes('hero')) continue;
    const isDefender = s.msgId >= 9;
    const index = isDefender ? defenderCount++ : attackerCount++;
    stacks.push(buildBattleStack(s, isDefender, index, defxn, defyn));
  }

  return stacks;
}

function buildExtraBattleStack(s, defxn, defyn) {
  const isDefender = s.msgId >= 9;
  const { atk, def } = makePositions(defxn, defyn);
  const pos = isDefender ? { x: defxn - 3, y: Math.floor(defyn / 2) } : { x: 0, y: Math.floor(defyn / 2) };
  const list = isDefender ? def : atk;
  const idx = Math.min(s.msgId - (isDefender ? 9 : 3), list.length - 1);
  const actualPos = list[idx] || pos;
  return {
    owner: isDefender ? 1 : 0,
    sysName: s.sysName,
    animUnit: s.animUnit || s.sysName,
    imgUrl: stackImageUrl({ animUnit: s.animUnit || s.sysName }),
    nameRu: s.nameRu || s.sysName,
    flags: s.flags || [],
    count: s.count || 1,
    msgId: s.msgId,
    _col: actualPos.x + 1,
    _row: actualPos.y + 1,
  };
}

function parseJSString(str) {
  if (!str) return '';
  str = str.trim();
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\n/g, '\n');
  }
  return str;
}

function parseJSArrayLiteral(str) {
  str = str.trim();
  if (!str.startsWith('Array(')) return null;
  let depth = 0;
  let i = 6;
  const items = [];
  let current = '';
  while (i < str.length) {
    const ch = str[i];
    if (ch === '(') { depth++; current += ch; }
    else if (ch === ')') {
      if (depth === 0) break;
      depth--;
      current += ch;
    }
    else if (ch === ',' && depth === 0) {
      const trimmed = current.trim();
      if (trimmed) items.push(trimmed);
      current = '';
    }
    else if (ch === '"' || ch === "'") {
      const quote = ch;
      current += ch;
      i++;
      while (i < str.length && str[i] !== quote) {
        if (str[i] === '\\') { current += str[i]; i++; if (i < str.length) { current += str[i]; } }
        else { current += str[i]; }
        i++;
      }
      if (i < str.length) current += str[i];
    }
    else {
      current += ch;
    }
    i++;
  }
  const trimmed = current.trim();
  if (trimmed) items.push(trimmed);
  return items;
}

function parseArmyArray(arrStr) {
  const nested = parseJSArrayLiteral(arrStr);
  if (!nested) return [];
  return nested.map((item) => {
    const parts = parseJSArrayLiteral(item);
    if (!parts || parts.length < 2) return null;
    return {
      sysName: parseJSString(parts[0]),
      count: parseInt(parts[1], 10) || 0,
      nameRu: parts.length >= 4 ? parseJSString(parts[3]) : parseJSString(parts[0]),
    };
  }).filter(Boolean);
}

function parseClanArray(arrStr) {
  if (!arrStr || arrStr === 'Array()') return null;
  const parts = parseJSArrayLiteral(arrStr);
  if (!parts || parts.length < 2) return null;
  return {
    id: parseInt(parts[0], 10) || 0,
    name: parseJSString(parts[1]),
    level: parseInt(parts[2], 10) || 0,
  };
}

function extractDepthValue(text, key, idx) {
  const re = new RegExp(`${key}\\[${idx}\\]\\s*=\\s*`);
  const m = re.exec(text);
  if (!m) return null;
  let pos = m.index + m[0].length;
  const ch = text[pos];
  if (ch === '"' || ch === "'") {
    const quote = ch;
    pos++;
    let end = pos;
    while (end < text.length && text[end] !== quote) {
      if (text[end] === '\\') end++;
      end++;
    }
    return text.slice(pos, end);
  }
  if (ch >= '0' && ch <= '9' || ch === '-') {
    let end = pos;
    while (end < text.length && /[0-9.-]/.test(text[end])) end++;
    return text.slice(pos, end);
  }
    if (text.startsWith('Array(', pos)) {
    let depth = 1;
    let end = pos + 6;
    while (depth > 0 && end < text.length) {
      if (text[end] === '(') depth++;
      else if (text[end] === ')') depth--;
      end++;
    }
    return text.slice(pos, end);
  }
  return null;
}

function extractSpecialText(text, idx) {
  const re = new RegExp(`hero_special_arts\\[${idx}\\]\\s*=\\s*\"([^\"]+)\"`);
  const m = text.match(re);
  return m ? m[1].replace(/<BR>/g, '\n').replace(/&nbsp;/g, ' ') : '';
}

function parseHeroScripts(heroScripts) {
  const heroes = { 1: {}, 2: {} };
  if (!heroScripts) return heroes;

  for (const idx of [1, 2]) {
    const apStr = extractDepthValue(heroScripts, 'hero_ap', idx);
    heroes[idx].ap = apStr ? parseInt(apStr, 10) || 0 : 0;

    const initStr = extractDepthValue(heroScripts, 'hero_init', idx);
    heroes[idx].initiative = initStr ? parseInt(initStr, 10) || 0 : 0;

    const clanStr = extractDepthValue(heroScripts, 'hero_clan', idx);
    heroes[idx].clan = parseClanArray(clanStr);

    const armyStr = extractDepthValue(heroScripts, 'hero_army', idx);
    heroes[idx].army = armyStr ? parseArmyArray(armyStr) : [];

    heroes[idx].specialArts = extractSpecialText(heroScripts, idx);
  }

  return heroes;
}

export async function fetchReplayData(warid, showToken = '') {
  const params = { _defxn: 12, _defyn: 10, _warid: parseInt(warid, 10), _gtype: 1 };
  let warlogData = null;
  let battleData = null;
  let stacks = [];

  let warlogUrl = `/api/warlog/${warid}`;
  if (showToken) warlogUrl += `?show=${encodeURIComponent(showToken)}`;

  const warlogResponse = await fetch(warlogUrl);
  if (warlogResponse.ok) {
    try {
      warlogData = await warlogResponse.json();
    } catch (_) {
      warlogData = null;
    }
  }

  if (warlogData && !warlogData.error) {
    if (warlogData.pole_params) Object.assign(params, parsePoleParams(warlogData.pole_params));
    if (warlogData.parsed_stacks && warlogData.parsed_stacks.length > 0) {
      stacks = buildWarlogStacks(warlogData.parsed_stacks);
    }
  }

  let battleUrl = `/api/battle/${warid}`;
  if (showToken) battleUrl += `?show=${encodeURIComponent(showToken)}`;

  const battleResponse = await fetch(battleUrl);
  if (battleResponse.ok) {
    try {
      battleData = await battleResponse.json();
    } catch (_) {
      battleData = null;
    }
  }

  if (stacks.length === 0 && battleData && !battleData.error && battleData.stacks && battleData.stacks.length > 0) {
    const sorted = battleData.stacks.slice().sort((a, b) => a.msgId - b.msgId);
    const battleStacks = buildBattleStacks(sorted, params._defxn, params._defyn);
    if (battleStacks.length > 0) stacks = battleStacks;
  }

  if (battleData && battleData.stacks && stacks.length > 0) {
    const battleStacks = battleData.stacks.filter((bs) => bs.sysName && !bs.sysName.startsWith('comp-'));
    const flagMap = {};
    for (const bs of battleStacks) {
      if (!bs.flags) continue;
      if (bs.msgId) flagMap[`msg:${bs.msgId}`] = bs.flags;
      if (!flagMap[`name:${bs.sysName}`] || !flagMap[`name:${bs.sysName}`].includes('big')) {
        flagMap[`name:${bs.sysName}`] = bs.flags;
      }
    }
    const representedIds = new Set(stacks.map((s) => s.msgId).filter(Boolean));
    const usedIds = new Set(representedIds);
    const unassigned = stacks.filter((ws) => !ws.msgId);
    for (const ws of unassigned) {
      const match = battleStacks.find((bs) =>
        bs.sysName === ws.sysName && bs.msgId && !usedIds.has(bs.msgId)
      );
      if (match) {
        ws.msgId = match.msgId;
        usedIds.add(match.msgId);
      }
    }
    for (const s of stacks) {
      const flags = s.msgId ? flagMap[`msg:${s.msgId}`] : flagMap[`name:${s.sysName}`];
      if (flags) {
        const merged = new Set([...(s.flags || []), ...flags]);
        s.flags = [...merged];
      }
    }
    const extraBattle = battleStacks
      .filter((bs) => bs.msgId && !usedIds.has(bs.msgId) && !bs.flags?.includes('hero'))
      .sort((a, b) => a.msgId - b.msgId);
    for (const bs of extraBattle) {
      const ws = buildExtraBattleStack(bs, params._defxn, params._defyn);
      if (ws) stacks.push(ws);
    }
  }

  const heroes = {};
  if (battleData && !battleData.error && battleData.stacks) {
    const heroEntries = battleData.stacks.filter(s => s.flags && s.flags.includes('hero'));
    let heroSideIndex = 0;
    for (const h of heroEntries) {
      const side = heroSideIndex++ === 0 ? 'left' : 'right';
      const sysName = h.sysName || '';
      heroes[side] = {
        sysName,
        name: h.nameRu || sysName,
        imgUrl: sysName ? `https://dcdn.heroeswm.ru/i/portraits/${sysName}p30.png` : '',
        heroExtra: h.extra || '',
      };
    }
  }

  let heroData = {};
  if (warlogData && warlogData.hero_scripts) {
    heroData = parseHeroScripts(warlogData.hero_scripts);
  }

  return {
    params,
    stacks,
    turns: battleData?.turns,
    heroes,
    heroData,
    actions: battleData?.actions || [],
    heroScripts: warlogData?.hero_scripts || '',
  };
}
