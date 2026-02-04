const mockState = {
  deckName: "Grixis Tempo",
  updatedAt: new Date().toISOString(),
};

const toast = document.querySelector(".toast");
const deckList = document.querySelector("#deck-list");
const searchInput = document.querySelector("#search-input");
const searchButton = document.querySelector("#search-button");
const searchResults = document.querySelector("#search-results");
const searchFilters = document.querySelector("#search-filters");
const formatSelect = document.querySelector("#format-select");
const formatNote = document.querySelector("#format-note");
const viewTabs = document.querySelector("#view-tabs");
const importFile = document.querySelector("#import-file");
const importRun = document.querySelector("#import-run");
const importProgress = document.querySelector("#import-progress");
const importSummary = document.querySelector("#import-summary");
const exportPdf = document.querySelector("#export-pdf");
const exportArena = document.querySelector("#export-arena");
const exportTxt = document.querySelector("#export-txt");
const dictUrlInput = document.querySelector("#dict-url");
const dictEncoding = document.querySelector("#dict-encoding");
const dictFetchButton = document.querySelector("#dict-fetch");
const dictFileInput = document.querySelector("#dict-file");
const dictStatus = document.querySelector("#dict-status");
const dictAuto = document.querySelector("#dict-auto");
const pdfPlayer = document.querySelector("#pdf-player");
const pdfDate = document.querySelector("#pdf-date");
const statTotal = document.querySelector("#stat-total");
const statCreature = document.querySelector("#stat-creature");
const statSpell = document.querySelector("#stat-spell");
const statLand = document.querySelector("#stat-land");
const statCmc = document.querySelector("#stat-cmc");
const curve1 = document.querySelector("#curve-1");
const curve2 = document.querySelector("#curve-2");
const curve3 = document.querySelector("#curve-3");
const curve4 = document.querySelector("#curve-4");
const curve5 = document.querySelector("#curve-5");
const colorW = document.querySelector("#color-w");
const colorU = document.querySelector("#color-u");
const colorB = document.querySelector("#color-b");
const colorR = document.querySelector("#color-r");
const colorG = document.querySelector("#color-g");
const clearDeck = document.querySelector("#deck-clear");
const printDate = document.querySelector("#print-date");
const printPlayer = document.querySelector("#print-player");
const printDay = document.querySelector("#print-day");
const printMainCount = document.querySelector("#print-main-count");
const printSideCount = document.querySelector("#print-side-count");
const printCreatureCount = document.querySelector("#print-creature-count");
const printLandCount = document.querySelector("#print-land-count");
const printMainList = document.querySelector("#print-main-list");
const printMainList2 = document.querySelector("#print-main-list-2");
const printSideList = document.querySelector("#print-side-list");
const printSideList2 = document.querySelector("#print-side-list-2");
const goldfishStart = document.querySelector("#goldfish-start");
const goldfishMulligan = document.querySelector("#goldfish-mulligan");
const goldfishBottom = document.querySelector("#goldfish-bottom");
const goldfishDraw = document.querySelector("#goldfish-draw");
const goldfishNext = document.querySelector("#goldfish-next");
const goldfishUndo = document.querySelector("#goldfish-undo");
const goldfishShuffle = document.querySelector("#goldfish-shuffle");
const goldfishReset = document.querySelector("#goldfish-reset");
const goldfishTurn = document.querySelector("#goldfish-turn");
const goldfishLibrary = document.querySelector("#goldfish-library");
const goldfishBottomNote = document.querySelector("#goldfish-bottom-note");
const goldfishHand = document.querySelector("#goldfish-hand");
const goldfishBattlefield = document.querySelector("#goldfish-battlefield");
const goldfishGraveyard = document.querySelector("#goldfish-graveyard");
const goldfishExile = document.querySelector("#goldfish-exile");
const builderViews = document.querySelectorAll(".view-builder");
const goldfishViews = document.querySelectorAll(".view-goldfish");

const deckState = {
  main: [],
  side: [],
};

const scryfallCache = new Map();
let dictionaryMap = null;
let searchTimer = null;
const lastSearchResults = new Map();
let activeSearchFilter = "all";
const goldfishState = {
  library: [],
  hand: [],
  battlefield: [],
  graveyard: [],
  exile: [],
  turn: 1,
  mulligans: 0,
  bottomPending: 0,
  selected: new Set(),
};
const goldfishHistory = [];
const DICT_URL_KEY = "mtg.dict.url";
const DICT_AUTO_KEY = "mtg.dict.auto";
const DICT_UPDATED_KEY = "mtg.dict.updated";

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2400);
}

function resetProgress() {
  if (importProgress) {
    importProgress.style.width = "0%";
  }
}

function setProgress(value) {
  if (importProgress) {
    importProgress.style.width = `${value}%`;
  }
}

function normalizeLine(line) {
  return line.replace(/\s+/g, " ").trim();
}

function normalizeNameKey(text) {
  return normalizeLine(text)
    .replace(/^["'「『《\[]+/, "")
    .replace(/["'」』》\]]+$/, "")
    .replace(/[’‘ʼʻ]/g, "'")
    .toLowerCase();
}

function isAscii(text) {
  return /^[\x00-\x7F]*$/.test(text);
}

function hasJapanese(text) {
  return /[ぁ-んァ-ン一-龯々]/.test(text);
}

function isBasicLand(card) {
  const names = ["Plains", "Island", "Swamp", "Mountain", "Forest", "平地", "島", "沼", "山", "森"];
  if (card.typeLine && /Basic Land/i.test(card.typeLine)) return true;
  if (card.name && names.includes(card.name)) return true;
  if (card.nameEn && names.includes(card.nameEn)) return true;
  if (card.nameJa && names.includes(card.nameJa)) return true;
  return false;
}

function classifyType(typeLine) {
  if (!typeLine) return "spell";
  if (/Land|土地/i.test(typeLine)) return "land";
  if (/Creature|クリーチャー/i.test(typeLine)) return "creature";
  if (/Artifact|アーティファクト/i.test(typeLine)) return "artifact";
  if (/Enchantment|エンチャント/i.test(typeLine)) return "enchantment";
  if (/Instant|インスタント/i.test(typeLine)) return "instant";
  if (/Sorcery|ソーサリー/i.test(typeLine)) return "sorcery";
  if (/Planeswalker|プレインズウォーカー/i.test(typeLine))
    return "planeswalker";
  return "spell";
}

function matchesSearchFilter(card) {
  if (activeSearchFilter === "all") return true;
  return card.typeCategory === activeSearchFilter;
}

function getSelectedFormat() {
  if (!formatSelect) return "all";
  return formatSelect.value || "all";
}

function isLegalForFormat(card, format) {
  if (!format || format === "all") return true;
  const status = card.legalities ? card.legalities[format] : null;
  return status === "legal" || status === "restricted";
}

function filterByFormat(list) {
  const format = getSelectedFormat();
  return list.filter((card) => isLegalForFormat(card, format));
}

async function fetchScryfallCard(name) {
  const key = name.toLowerCase();
  if (scryfallCache.has(key)) return scryfallCache.get(key);
  const url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(
    name
  )}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("not found");
    const data = await res.json();
    scryfallCache.set(key, data);
    return data;
  } catch (error) {
    scryfallCache.set(key, null);
    return null;
  }
}

async function fetchScryfallCardJa(name) {
  const key = `ja:${name.toLowerCase()}`;
  if (scryfallCache.has(key)) return scryfallCache.get(key);
  const url = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(
    name
  )}&lang=ja`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("not found");
    const data = await res.json();
    scryfallCache.set(key, data);
    return data;
  } catch (error) {
    scryfallCache.set(key, null);
    return null;
  }
}

async function fetchJapaneseName(name) {
  const normalized = name.replace(/[’‘]/g, "'").trim();
  const exactUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(
    normalized
  )}&lang=ja`;
  const fuzzyUrl = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(
    normalized
  )}&lang=ja`;
  const searchUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(
    `!"${normalized}" lang:ja`
  )}`;

  async function extractPrintedName(res) {
    if (!res.ok) throw new Error("not found");
    const data = await res.json();
    if (data.card_faces && data.card_faces.length) {
      const faces = data.card_faces
        .map((face) => face.printed_name || face.name)
        .filter(Boolean);
      return faces.join(" / ");
    }
    return data.printed_name || data.name || null;
  }

  async function extractFromSearch(res) {
    if (!res.ok) throw new Error("not found");
    const data = await res.json();
    const first = data.data && data.data.length ? data.data[0] : null;
    if (!first) return null;
    if (first.card_faces && first.card_faces.length) {
      const faces = first.card_faces
        .map((face) => face.printed_name || face.name)
        .filter(Boolean);
      return faces.join(" / ");
    }
    return first.printed_name || first.name || null;
  }

  try {
    return await extractPrintedName(await fetch(exactUrl));
  } catch (error) {
    // fall through
  }

  try {
    return await extractPrintedName(await fetch(fuzzyUrl));
  } catch (error) {
    // fall through
  }

  try {
    return await extractFromSearch(await fetch(searchUrl));
  } catch (error) {
    return null;
  }
}

async function searchScryfall(query) {
  const trimmed = normalizeLine(query);
  if (!trimmed) return [];
  const isJa = hasJapanese(trimmed);
  const params = new URLSearchParams({
    unique: "cards",
    order: "name",
  });
  if (isJa) {
    params.set("q", `lang:ja name:"${trimmed}"`);
  } else {
    params.set("q", trimmed);
  }
  const url = `https://api.scryfall.com/cards/search?${params.toString()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("search failed");
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    if (isJa) {
      const fallback = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(
        trimmed
      )}&lang=ja`;
      try {
        const res = await fetch(fallback);
        if (!res.ok) throw new Error("fallback failed");
        const data = await res.json();
        return [data];
      } catch (err) {
        return [];
      }
    }
    return [];
  }
}

function getCardImage(card) {
  if (card.image_uris && card.image_uris.normal) return card.image_uris.normal;
  if (card.card_faces && card.card_faces[0] && card.card_faces[0].image_uris) {
    return card.card_faces[0].image_uris.normal || "";
  }
  return "";
}

function normalizeResultCard(card, nameJaOverride) {
  const typeLine = card.type_line || "";
  const typeCategory = classifyType(typeLine);
  const nameEn = card.name || "";
  const nameJa = nameJaOverride || card.printed_name || null;
  const power =
    typeof card.power === "string"
      ? card.power
      : card.card_faces && card.card_faces[0]
      ? card.card_faces[0].power
      : null;
  const toughness =
    typeof card.toughness === "string"
      ? card.toughness
      : card.card_faces && card.card_faces[0]
      ? card.card_faces[0].toughness
      : null;
  return {
    id: card.id,
    nameEn,
    nameJa,
    name: nameJa || nameEn,
    typeLine,
    typeCategory,
    manaCost: card.mana_cost || "",
    cmc: typeof card.cmc === "number" ? card.cmc : null,
    colors: card.colors || [],
    imageUrl: getCardImage(card),
    legalities: card.legalities || {},
    colorIdentity: card.color_identity || [],
    power,
    toughness,
  };
}

async function resolveJapaneseName(card) {
  if (card.lang === "ja" && card.printed_name) return card.printed_name;
  const name = (card.name || "").replace(/[’‘]/g, "'");
  if (name.includes("//") || name.includes(" / ")) {
    const parts = name.split(/\s*\/\/\s*|\s*\/\s*/).map((part) => part.trim());
    const translatedParts = await Promise.all(
      parts.map((part) => fetchJapaneseName(part))
    );
    if (translatedParts.every(Boolean)) {
      return translatedParts.join(" / ");
    }
  }
  const dictName = translateFromDictionary(name);
  if (dictName) return dictName;
  return fetchJapaneseName(name);
}

async function runSearch(query) {
  if (!searchResults) return;
  searchResults.innerHTML = `<div class="search-empty">検索中...</div>`;
  const results = await searchScryfall(query);
  if (!results.length) {
    searchResults.innerHTML = `<div class="search-empty">該当カードがありません。</div>`;
    return;
  }

  const mapped = await mapLimit(results.slice(0, 12), 4, async (card) => {
    const nameJa = hasJapanese(query) ? card.printed_name : await resolveJapaneseName(card);
    return normalizeResultCard(card, nameJa);
  });

  const format = getSelectedFormat();
  const filtered = mapped.filter(
    (card) => isLegalForFormat(card, format) && matchesSearchFilter(card)
  );
  if (!filtered.length) {
    searchResults.innerHTML = `<div class="search-empty">このフォーマットで合法なカードがありません。</div>`;
    return;
  }
  lastSearchResults.clear();
  filtered.forEach((card) => lastSearchResults.set(card.id, card));
  renderSearchResults(filtered);
}

function renderSearchResults(list) {
  if (!searchResults) return;
  searchResults.innerHTML = "";
  list.forEach((card) => {
    const article = document.createElement("article");
    article.className = "result-card";
    const imageStyle = card.imageUrl ? `style="background-image:url('${card.imageUrl}')"` : "";
    article.innerHTML = `
      <div class="thumb" ${imageStyle}></div>
      <div>
        <h3>${card.name}</h3>
        <p>${card.nameEn} · ${card.typeLine || "—"}</p>
        <div class="meta">
          <span>${card.manaCost || "—"}</span>
          <span>${card.cmc !== null ? `CMC ${card.cmc}` : "CMC —"}</span>
        </div>
      </div>
      <div class="result-actions">
        <button class="ghost" data-action="add-main" data-id="${card.id}">+ メイン</button>
        <button class="ghost" data-action="add-side" data-id="${card.id}">+ サイド</button>
      </div>
    `;
    searchResults.appendChild(article);
  });
}

function addCardToBoard(board, card) {
  const format = getSelectedFormat();
  if (!isLegalForFormat(card, format)) {
    showToast("選択中のフォーマットでは使用できません。");
    return;
  }
  const list = board === "side" ? deckState.side : deckState.main;
  const existing = list.find((entry) => entry.nameEn === card.nameEn);
  if (existing) {
    if (!isBasicLand(existing) && existing.quantity >= 4) {
      showToast("同名カードは4枚までです。");
      return;
    }
    existing.quantity += 1;
  } else {
    list.push({
      ...card,
      quantity: 1,
    });
  }
  updateSummary(countQty(deckState.main), countQty(deckState.side));
  refreshViews();
  showToast("カードを追加しました。");
}

function parseDictionary(text) {
  const map = new Map();
  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const bracketStart = line.indexOf("《");
    const bracketEnd = line.indexOf("》");
    if (bracketStart !== -1 && bracketEnd !== -1 && bracketEnd > bracketStart) {
      const inside = line.slice(bracketStart + 1, bracketEnd);
      const slashIndex = inside.search(/\/(?=.*[A-Za-z])/);
      if (slashIndex !== -1) {
        const jaRaw = inside.slice(0, slashIndex);
        const enRaw = inside.slice(slashIndex + 1);
        const ja = jaRaw.replace(/[〈〉《》「」『』"]/g, "").trim();
        const en = enRaw
          .replace(/["'“”]/g, "")
          .replace(/\s*\([^)]*\)\s*$/, "")
          .trim();
        const key = normalizeNameKey(en);
        if (key && ja) {
          map.set(key, ja);
          continue;
        }
      }
    }

    let tokens = [];
    if (line.includes("\t")) {
      tokens = line.split("\t");
    } else if (line.includes(" / ")) {
      tokens = line.split(" / ");
    } else if (line.includes("/")) {
      tokens = line.split("/");
    } else if (line.includes(",")) {
      tokens = line.split(",");
    } else {
      tokens = line.split(" ");
    }

    const cleaned = tokens.map((token) => token.trim()).filter(Boolean);
    if (cleaned.length < 2) continue;

    const englishToken = cleaned.find((token) => /[A-Za-z]/.test(token));
    const japaneseToken = cleaned.find((token) => hasJapanese(token));

    if (!englishToken || !japaneseToken) continue;
    const key = normalizeNameKey(englishToken.replace(/\s*\([^)]*\)\s*$/, ""));
    if (!key) continue;
    map.set(key, japaneseToken);
    const altKey = key.replace(/'/g, "");
    if (altKey && !map.has(altKey)) {
      map.set(altKey, japaneseToken);
    }
  }
  return map;
}

function translateFromDictionary(name) {
  if (!dictionaryMap) return null;
  const split = name.split(/\s*\/\/\s*|\s*\/\s*/);
  if (split.length > 1) {
    const translated = split.map((part) => translateFromDictionary(part));
    if (translated.every(Boolean)) return translated.join(" / ");
  }
  const direct = dictionaryMap.get(normalizeNameKey(name));
  if (direct) return direct;
  const altKey = normalizeNameKey(name).replace(/'/g, "");
  return dictionaryMap.get(altKey) || null;
}

function openDictDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("mtg-dict", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("dict")) {
        db.createObjectStore("dict");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveDictText(text) {
  const db = await openDictDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("dict", "readwrite");
    tx.objectStore("dict").put(text, "wg-dict");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadDictText() {
  const db = await openDictDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("dict", "readonly");
    const request = tx.objectStore("dict").get("wg-dict");
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

function setDictStatus(text) {
  if (dictStatus) dictStatus.textContent = text;
}

async function loadDictionaryFromText(text) {
  dictionaryMap = parseDictionary(text);
  await saveDictText(text);
  const updatedAt = new Date().toLocaleString("ja-JP");
  localStorage.setItem(DICT_UPDATED_KEY, updatedAt);
  setDictStatus(`辞書読み込み済み (${dictionaryMap.size}件) / 更新: ${updatedAt}`);
}

function getSelectedEncoding() {
  if (!dictEncoding) return "shift_jis";
  return dictEncoding.value || "shift_jis";
}

async function loadDictionaryFromUrl() {
  if (!dictUrlInput || !dictUrlInput.value) {
    showToast("辞書URLを入力してください。");
    return;
  }
  setDictStatus("辞書を取得中...");
  try {
    const res = await fetch(dictUrlInput.value.trim());
    if (!res.ok) throw new Error("fetch failed");
    const buffer = await res.arrayBuffer();
    const decoder = new TextDecoder(getSelectedEncoding());
    const text = decoder.decode(buffer);
    await loadDictionaryFromText(text);
    localStorage.setItem(DICT_URL_KEY, dictUrlInput.value.trim());
    showToast("辞書を読み込みました。");
  } catch (error) {
    setDictStatus("辞書取得に失敗しました。");
    showToast("辞書の取得に失敗しました。");
  }
}

async function loadDictionaryFromFile(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    const buffer = reader.result instanceof ArrayBuffer ? reader.result : null;
    if (!buffer) {
      setDictStatus("辞書読み込みに失敗しました。");
      showToast("辞書の読み込みに失敗しました。");
      return;
    }
    const decoder = new TextDecoder(getSelectedEncoding());
    const text = decoder.decode(buffer);
    await loadDictionaryFromText(text);
    showToast("辞書を読み込みました。");
  };
  reader.onerror = () => {
    setDictStatus("辞書読み込みに失敗しました。");
    showToast("辞書の読み込みに失敗しました。");
  };
  reader.readAsArrayBuffer(file);
}

async function mapLimit(items, limit, mapper) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await mapper(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

async function enrichDeckList(list) {
  return mapLimit(list, 4, async (card) => {
    const nameEn = card.name;
    if (!isAscii(nameEn)) {
      const dataJa = await fetchScryfallCardJa(nameEn);
      if (dataJa) {
        const typeLine = dataJa.type_line || "";
        return {
          ...card,
          nameEn: dataJa.name || nameEn,
          nameJa: dataJa.printed_name || nameEn,
          typeLine,
          typeCategory: classifyType(typeLine),
          legalities: dataJa.legalities || {},
          colors: dataJa.colors || [],
          colorIdentity: dataJa.color_identity || [],
          cmc: typeof dataJa.cmc === "number" ? dataJa.cmc : null,
          imageUrl: getCardImage(dataJa),
          manaCost: dataJa.mana_cost || "",
          power:
            typeof dataJa.power === "string"
              ? dataJa.power
              : dataJa.card_faces && dataJa.card_faces[0]
              ? dataJa.card_faces[0].power
              : null,
          toughness:
            typeof dataJa.toughness === "string"
              ? dataJa.toughness
              : dataJa.card_faces && dataJa.card_faces[0]
              ? dataJa.card_faces[0].toughness
              : null,
        };
      }
      return {
        ...card,
        nameEn,
        nameJa: card.name,
        typeLine: "",
        typeCategory: "spell",
        legalities: {},
        colors: [],
        colorIdentity: [],
        cmc: null,
        imageUrl: "",
        manaCost: "",
        power: null,
        toughness: null,
      };
    }

    const dictName = translateFromDictionary(nameEn);
    const data = await fetchScryfallCard(nameEn);
    if (!data) {
      return {
        ...card,
        nameEn,
        nameJa: dictName || null,
        typeLine: "",
        typeCategory: "spell",
        legalities: {},
        colors: [],
        colorIdentity: [],
        cmc: null,
        imageUrl: "",
      };
    }

    const typeLine = data.type_line || "";
    const typeCategory = classifyType(typeLine);
    const nameJa = dictName || (await fetchJapaneseName(nameEn));

    return {
      ...card,
      nameEn,
      nameJa: nameJa || null,
      typeLine,
      typeCategory,
      legalities: data.legalities || {},
      colors: data.colors || [],
      colorIdentity: data.color_identity || [],
      cmc: typeof data.cmc === "number" ? data.cmc : null,
      imageUrl: getCardImage(data),
      manaCost: data.mana_cost || "",
      power:
        typeof data.power === "string"
          ? data.power
          : data.card_faces && data.card_faces[0]
          ? data.card_faces[0].power
          : null,
      toughness:
        typeof data.toughness === "string"
          ? data.toughness
          : data.card_faces && data.card_faces[0]
          ? data.card_faces[0].toughness
          : null,
    };
  });
}

function parseDeckText(text) {
  const rawLines = text.split(/\r?\n/);
  const main = [];
  const side = [];
  let section = "main";
  let hasMain = false;

  for (const rawLine of rawLines) {
    const trimmed = normalizeLine(rawLine);
    if (!trimmed) {
      if (hasMain) section = "side";
      continue;
    }
    if (trimmed.startsWith("#")) continue;

    const isSideTag = /^SB:/i.test(trimmed);
    const clean = isSideTag ? trimmed.replace(/^SB:\s*/i, "") : trimmed;
    const match = clean.match(/^(\d+)x?\s+(.+)$/);
    if (!match) continue;
    const quantity = Number(match[1]);
    const name = match[2];
    const entry = { name, quantity };
    if (isSideTag || section === "side") {
      side.push(entry);
    } else {
      main.push(entry);
      hasMain = true;
    }
  }

  return { main, side };
}

function renderDeck(main, side, container, emptyMessage) {
  if (!container) return;
  container.innerHTML = "";
  if (!main.length && !side.length) {
    container.innerHTML =
      `<div class="deck-row"><div><h4>カードがありません</h4><p>${
        emptyMessage || "インポートするか検索から追加してください。"
      }</p></div></div>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  const mainHeader = document.createElement("div");
  mainHeader.className = "deck-section";
  mainHeader.textContent = "Main Deck";
  fragment.appendChild(mainHeader);

  main.forEach((card) => {
    const row = document.createElement("div");
    row.className = "deck-row";
    const colorClass = getCardColorClass(card);
    if (colorClass) row.classList.add(colorClass);
    row.innerHTML = `
      <div>
        <h4>${card.name}</h4>
        <p>インポート</p>
      </div>
      <div class="count">
        <span>${card.quantity}</span>
      </div>
    `;
    fragment.appendChild(row);
  });

  if (side.length) {
    const sideHeader = document.createElement("div");
    sideHeader.className = "deck-section";
    sideHeader.textContent = "Sideboard";
    fragment.appendChild(sideHeader);

    side.forEach((card) => {
      const row = document.createElement("div");
      row.className = "deck-row";
      const colorClass = getCardColorClass(card);
      if (colorClass) row.classList.add(colorClass);
      row.innerHTML = `
        <div>
          <h4>${card.name}</h4>
          <p>インポート</p>
        </div>
        <div class="count">
          <span>${card.quantity}</span>
        </div>
      `;
      fragment.appendChild(row);
    });
  }

  container.appendChild(fragment);
}

function updateStats(list) {
  const total = countQty(list);
  if (statTotal) statTotal.textContent = `${total}`;
  const creatures = list.filter((card) => card.typeCategory === "creature");
  const lands = list.filter((card) => card.typeCategory === "land");
  const spells = list.filter((card) => card.typeCategory === "spell");
  if (statCreature) statCreature.textContent = `${countQty(creatures)}`;
  if (statLand) statLand.textContent = `${countQty(lands)}`;
  if (statSpell) statSpell.textContent = `${countQty(spells)}`;

  const cmcCards = list.filter(
    (card) => typeof card.cmc === "number" && card.typeCategory !== "land"
  );
  const cmcTotal = cmcCards.reduce(
    (sum, card) => sum + card.cmc * card.quantity,
    0
  );
  const cmcCount = cmcCards.reduce((sum, card) => sum + card.quantity, 0);
  if (statCmc) {
    statCmc.textContent = cmcCount ? (cmcTotal / cmcCount).toFixed(2) : "-";
  }

  updateManaCurve(cmcCards);
  updateColorDistribution(list);
}

function updateManaCurve(list) {
  if (!curve1 || !curve2 || !curve3 || !curve4 || !curve5) return;
  const buckets = [0, 0, 0, 0, 0];
  list.forEach((card) => {
    const cmc = Math.floor(card.cmc || 0);
    if (cmc <= 1) buckets[0] += card.quantity;
    else if (cmc === 2) buckets[1] += card.quantity;
    else if (cmc === 3) buckets[2] += card.quantity;
    else if (cmc === 4) buckets[3] += card.quantity;
    else buckets[4] += card.quantity;
  });
  const max = Math.max(...buckets, 1);
  const heights = buckets.map((count) => `${Math.round((count / max) * 100)}%`);
  curve1.style.height = heights[0];
  curve2.style.height = heights[1];
  curve3.style.height = heights[2];
  curve4.style.height = heights[3];
  curve5.style.height = heights[4];
  curve1.textContent = "1";
  curve2.textContent = "2";
  curve3.textContent = "3";
  curve4.textContent = "4";
  curve5.textContent = "5+";
}

function updateColorDistribution(list) {
  const total = countQty(list);
  const counts = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  list.forEach((card) => {
    const colors = card.colorIdentity && card.colorIdentity.length ? card.colorIdentity : card.colors || [];
    colors.forEach((c) => {
      if (counts[c] !== undefined) counts[c] += card.quantity;
    });
  });
  const pct = (key) =>
    total ? Math.round((counts[key] / total) * 100) : 0;
  if (colorW) colorW.textContent = `${pct("W")}%`;
  if (colorU) colorU.textContent = `${pct("U")}%`;
  if (colorB) colorB.textContent = `${pct("B")}%`;
  if (colorR) colorR.textContent = `${pct("R")}%`;
  if (colorG) colorG.textContent = `${pct("G")}%`;
}

function updateSummary(mainCount, sideCount) {
  if (!importSummary) return;
  importSummary.textContent = `メイン ${mainCount}枚 / サイド ${sideCount}枚 をインポートしました。`;
}

function buildArenaText() {
  const lines = [];
  deckState.main.forEach((card) => {
    const name = card.nameEn || card.name || "";
    lines.push(`${card.quantity} ${name}`);
  });
  if (deckState.side.length) {
    lines.push("");
    deckState.side.forEach((card) => {
      const name = card.nameEn || card.name || "";
      lines.push(`SB: ${card.quantity} ${name}`);
    });
  }
  return lines.join("\n");
}

function buildJapaneseText() {
  const lines = [];
  deckState.main.forEach((card) => {
    const name = card.nameJa || card.name || card.nameEn || "";
    lines.push(`${card.quantity} ${name}`);
  });
  if (deckState.side.length) {
    lines.push("");
    deckState.side.forEach((card) => {
      const name = card.nameJa || card.name || card.nameEn || "";
      lines.push(`SB: ${card.quantity} ${name}`);
    });
  }
  return lines.join("\n");
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("クリップボードにコピーしました。");
  } catch (error) {
    showToast("コピーできなかったため、ダウンロードします。");
    downloadText(text, "decklist.txt");
  }
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function countQty(list) {
  return list.reduce((sum, card) => sum + card.quantity, 0);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function snapshotGoldfish() {
  goldfishHistory.push({
    library: structuredClone(goldfishState.library),
    hand: structuredClone(goldfishState.hand),
    battlefield: structuredClone(goldfishState.battlefield),
    graveyard: structuredClone(goldfishState.graveyard),
    exile: structuredClone(goldfishState.exile),
    turn: goldfishState.turn,
    mulligans: goldfishState.mulligans,
    bottomPending: goldfishState.bottomPending,
    selected: new Set(goldfishState.selected),
  });
}

function restoreGoldfish() {
  const prev = goldfishHistory.pop();
  if (!prev) return;
  goldfishState.library = prev.library;
  goldfishState.hand = prev.hand;
  goldfishState.battlefield = prev.battlefield;
  goldfishState.graveyard = prev.graveyard;
  goldfishState.exile = prev.exile;
  goldfishState.turn = prev.turn;
  goldfishState.mulligans = prev.mulligans;
  goldfishState.bottomPending = prev.bottomPending;
  goldfishState.selected = prev.selected;
  renderGoldfish();
}

function buildLibraryFromDeck() {
  const library = [];
  deckState.main.forEach((card) => {
    const name = card.nameJa || card.name || card.nameEn || "";
    for (let i = 0; i < card.quantity; i += 1) {
      library.push({
        id: `${card.nameEn || card.name}-${i}-${Math.random().toString(36).slice(2)}`,
        name,
        nameEn: card.nameEn || card.name,
        imageUrl: card.imageUrl || "",
        manaCost: card.manaCost || "",
        typeLine: card.typeLine || "",
        cmc: typeof card.cmc === "number" ? card.cmc : null,
        power: card.power || null,
        toughness: card.toughness || null,
        colors: card.colors || [],
        colorIdentity: card.colorIdentity || [],
      });
    }
  });
  return library;
}

function drawCards(count) {
  const drawn = [];
  for (let i = 0; i < count; i += 1) {
    if (!goldfishState.library.length) break;
    drawn.push(goldfishState.library.pop());
  }
  goldfishState.hand.push(...drawn);
}

function startGoldfish() {
  goldfishHistory.length = 0;
  goldfishState.library = buildLibraryFromDeck();
  goldfishState.hand = [];
  goldfishState.battlefield = [];
  goldfishState.graveyard = [];
  goldfishState.exile = [];
  goldfishState.turn = 1;
  goldfishState.mulligans = 0;
  goldfishState.bottomPending = 0;
  goldfishState.selected.clear();
  shuffle(goldfishState.library);
  drawCards(7);
  renderGoldfish();
}

function mulliganGoldfish() {
  snapshotGoldfish();
  const allCards = [
    ...goldfishState.library,
    ...goldfishState.hand,
    ...goldfishState.battlefield,
    ...goldfishState.graveyard,
    ...goldfishState.exile,
  ];
  goldfishState.library = allCards;
  goldfishState.hand = [];
  goldfishState.battlefield = [];
  goldfishState.graveyard = [];
  goldfishState.exile = [];
  goldfishState.mulligans += 1;
  goldfishState.bottomPending = goldfishState.mulligans;
  goldfishState.selected.clear();
  shuffle(goldfishState.library);
  drawCards(7);
  renderGoldfish();
}

function confirmBottom() {
  if (!goldfishState.bottomPending) return;
  snapshotGoldfish();
  const selectedIds = new Set(goldfishState.selected);
  if (!selectedIds.size) return;
  const remaining = [];
  const bottomed = [];
  goldfishState.hand.forEach((card) => {
    if (selectedIds.has(card.id)) {
      bottomed.push(card);
    } else {
      remaining.push(card);
    }
  });
  goldfishState.hand = remaining;
  goldfishState.library = bottomed.concat(goldfishState.library);
  goldfishState.bottomPending = Math.max(
    0,
    goldfishState.bottomPending - bottomed.length
  );
  goldfishState.selected.clear();
  renderGoldfish();
}

function moveCard(cardId, from, to) {
  snapshotGoldfish();
  const fromList = goldfishState[from];
  const toList = goldfishState[to];
  const index = fromList.findIndex((card) => card.id === cardId);
  if (index === -1) return;
  const [card] = fromList.splice(index, 1);
  toList.push(card);
  renderGoldfish();
}

function getCardColorClass(card) {
  if (/Land|土地/i.test(card.typeLine || "")) return "";
  if (/Artifact|アーティファクト/i.test(card.typeLine || "")) return "artifact";
  const colors =
    (card.colorIdentity && card.colorIdentity.length
      ? card.colorIdentity
      : card.colors) || [];
  if (!colors.length) return "colorless";
  if (colors.length > 1) return "gold";
  const c = colors[0];
  return `color-${c.toLowerCase()}`;
}

function renderZone(list, container, actions) {
  if (!container) return;
  container.innerHTML = "";
  if (!list.length) {
    container.innerHTML = '<div class="search-empty">カードなし</div>';
    return;
  }
  list.forEach((card) => {
    const row = document.createElement("div");
    row.className = "zone-card";
    if (container === goldfishHand) {
      const colorClass = getCardColorClass(card);
      if (colorClass) row.classList.add(colorClass);
    }
    if (goldfishState.selected.has(card.id)) {
      row.classList.add("selected");
    }
    const thumbStyle = card.imageUrl
      ? `style="background-image:url('${card.imageUrl}')"`
      : "";
    const pt =
      card.power && card.toughness ? ` ${card.power}/${card.toughness}` : "";
    row.innerHTML = `
      <div class="zone-thumb" ${thumbStyle}></div>
      <div>
        <div>${card.name}</div>
        <div class="zone-meta">${card.manaCost || "—"} · ${
      card.typeLine || "—"
    }${pt}</div>
      </div>
      <div class="zone-actions">
        ${actions
          .map(
            (action) =>
              `<button data-action="${action.action}" data-id="${card.id}">${action.label}</button>`
          )
          .join("")}
      </div>
    `;
    container.appendChild(row);
  });
}

function renderGoldfish() {
  if (goldfishTurn) goldfishTurn.textContent = `${goldfishState.turn}`;
  if (goldfishLibrary)
    goldfishLibrary.textContent = `${goldfishState.library.length}`;
  if (goldfishBottomNote) {
    goldfishBottomNote.textContent = `マリガン後にボトムする枚数: ${goldfishState.bottomPending}`;
  }

  const handSorted = [...goldfishState.hand].sort((a, b) => {
    const aIsLand = /Land|土地/i.test(a.typeLine || "");
    const bIsLand = /Land|土地/i.test(b.typeLine || "");
    if (aIsLand !== bIsLand) return aIsLand ? -1 : 1;
    const aCmc = typeof a.cmc === "number" ? a.cmc : 99;
    const bCmc = typeof b.cmc === "number" ? b.cmc : 99;
    if (aCmc !== bCmc) return aCmc - bCmc;
    return (a.name || "").localeCompare(b.name || "");
  });

  renderZone(handSorted, goldfishHand, [
    { action: "select", label: "選択" },
    { action: "battlefield", label: "戦場" },
    { action: "graveyard", label: "墓地" },
    { action: "exile", label: "追放" },
  ]);
  renderZone(goldfishState.battlefield, goldfishBattlefield, [
    { action: "hand", label: "手札" },
    { action: "graveyard", label: "墓地" },
  ]);
  renderZone(goldfishState.graveyard, goldfishGraveyard, [
    { action: "hand", label: "手札" },
    { action: "battlefield", label: "戦場" },
  ]);
  renderZone(goldfishState.exile, goldfishExile, [
    { action: "hand", label: "手札" },
  ]);
}

function renderPrintGroup(target, title, list) {
  if (!target) return;
  const group = document.createElement("div");
  group.className = "print-group";
  const heading = document.createElement("div");
  heading.className = "print-group-title";
  heading.textContent = title;
  group.appendChild(heading);
  list.forEach((card) => {
    const row = document.createElement("div");
    row.className = "print-row";
    row.innerHTML = `<span>${card.quantity}</span><span>${card.name}</span>`;
    group.appendChild(row);
  });
  target.appendChild(group);
}

function renderPrintList(leftTarget, rightTarget, list) {
  if (!leftTarget || !rightTarget) return;
  leftTarget.innerHTML = "";
  rightTarget.innerHTML = "";
  const countQty = (items) =>
    items.reduce((sum, card) => sum + card.quantity, 0);
  const groups = [];
  const lands = list.filter((card) => card.typeCategory === "land");
  const creatures = list.filter((card) => card.typeCategory === "creature");
  const artifacts = list.filter((card) => card.typeCategory === "artifact");
  const enchantments = list.filter((card) => card.typeCategory === "enchantment");
  const instants = list.filter((card) => card.typeCategory === "instant");
  const sorceries = list.filter((card) => card.typeCategory === "sorcery");
  const planeswalkers = list.filter((card) => card.typeCategory === "planeswalker");
  const others = list.filter(
    (card) =>
      ![
        "land",
        "creature",
        "artifact",
        "enchantment",
        "instant",
        "sorcery",
        "planeswalker",
      ].includes(card.typeCategory)
  );

  if (lands.length) groups.push({ title: `土地 (${countQty(lands)})`, list: lands });
  if (creatures.length)
    groups.push({ title: `クリーチャー (${countQty(creatures)})`, list: creatures });
  if (artifacts.length)
    groups.push({ title: `アーティファクト (${countQty(artifacts)})`, list: artifacts });
  if (enchantments.length)
    groups.push({ title: `エンチャント (${countQty(enchantments)})`, list: enchantments });
  if (instants.length)
    groups.push({ title: `インスタント (${countQty(instants)})`, list: instants });
  if (sorceries.length)
    groups.push({ title: `ソーサリー (${countQty(sorceries)})`, list: sorceries });
  if (planeswalkers.length)
    groups.push({
      title: `プレインズウォーカー (${countQty(planeswalkers)})`,
      list: planeswalkers,
    });
  if (others.length) groups.push({ title: `その他 (${countQty(others)})`, list: others });

  let leftCount = 0;
  let rightCount = 0;
  groups.forEach((group) => {
    const groupCount = countQty(group.list);
    if (leftCount <= rightCount) {
      renderPrintGroup(leftTarget, group.title, group.list);
      leftCount += groupCount;
    } else {
      renderPrintGroup(rightTarget, group.title, group.list);
      rightCount += groupCount;
    }
  });
}

function updatePrintLayout() {
  const now = new Date();
  const dateString = now.toISOString().split("T")[0];
  if (pdfDate && !pdfDate.value) {
    pdfDate.value = dateString;
  }
  const player = pdfPlayer ? pdfPlayer.value.trim() : "";
  if (printDate) {
    const local = now.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    printDate.textContent = local.replace(/\//g, "/");
  }
  if (printPlayer) printPlayer.textContent = player || "-";
  if (printDay) printDay.textContent = pdfDate ? pdfDate.value || dateString : dateString;

  const mainVisible = deckState.main;
  const sideVisible = deckState.side;
  const mainCount = countQty(deckState.main);
  const sideCount = countQty(deckState.side);
  if (printMainCount) printMainCount.textContent = `${mainCount}`;
  if (printSideCount) printSideCount.textContent = `${sideCount}`;
  if (printCreatureCount) {
    const creatureCount = mainVisible
      .filter((card) => card.typeCategory === "creature")
      .reduce((sum, card) => sum + card.quantity, 0);
    printCreatureCount.textContent = `${creatureCount}`;
  }
  if (printLandCount) {
    const landCount = mainVisible
      .filter((card) => card.typeCategory === "land")
      .reduce((sum, card) => sum + card.quantity, 0);
    printLandCount.textContent = `${landCount}`;
  }

  renderPrintList(printMainList, printMainList2, mainVisible);
  renderPrintList(printSideList, printSideList2, sideVisible);
}

function updateFormatNote(hiddenMain, hiddenSide) {
  if (!formatNote) return;
  const format = getSelectedFormat();
  const labels = {
    all: "なし",
    standard: "スタンダード",
    modern: "モダン",
    pioneer: "パイオニア",
    legacy: "レガシー",
    vintage: "ヴィンテージ",
    pauper: "パウパー",
    commander: "統率者戦",
    historic: "ヒストリック",
    alchemy: "アルケミー",
    explorer: "エクスプローラー",
    timeless: "タイムレス",
  };
  const label = labels[format] || format;
  if (format === "all") {
    formatNote.textContent = "フォーマット制限: なし";
    return;
  }
  if (hiddenMain || hiddenSide) {
    formatNote.textContent = `フォーマット制限: ${label}（非合法: メイン${hiddenMain}枚 / サイド${hiddenSide}枚）`;
  } else {
    formatNote.textContent = `フォーマット制限: ${label}`;
  }
}

function refreshViews() {
  const mainVisible = filterByFormat(deckState.main);
  const sideVisible = filterByFormat(deckState.side);
  const mainTotal = countQty(deckState.main);
  const sideTotal = countQty(deckState.side);
  const mainVisibleCount = countQty(mainVisible);
  const sideVisibleCount = countQty(sideVisible);
  const hiddenMain = Math.max(0, mainTotal - mainVisibleCount);
  const hiddenSide = Math.max(0, sideTotal - sideVisibleCount);
  const emptyMessage =
    getSelectedFormat() !== "all" && (hiddenMain || hiddenSide)
      ? "フォーマット制限により非表示のカードがあります。"
      : null;
  renderDeck(mainVisible, sideVisible, deckList, emptyMessage);
  updateStats(mainVisible);
  updatePrintLayout();
  updateFormatNote(hiddenMain, hiddenSide);
}

function setActiveView(view) {
  if (view === "goldfish") {
    builderViews.forEach((el) => el.classList.add("hidden"));
    goldfishViews.forEach((el) => el.classList.remove("hidden"));
  } else {
    builderViews.forEach((el) => el.classList.remove("hidden"));
    goldfishViews.forEach((el) => el.classList.add("hidden"));
  }
}

function runImport() {
  if (!importFile || !importFile.files || !importFile.files[0]) {
    showToast("インポートするファイルを選択してください。");
    return;
  }

  const file = importFile.files[0];
  resetProgress();
  setProgress(10);
  importRun.disabled = true;

  const reader = new FileReader();
  reader.onload = async () => {
    setProgress(55);
    const text = typeof reader.result === "string" ? reader.result : "";
    const parsed = parseDeckText(text);
    setProgress(65);
    if (importSummary) {
      importSummary.textContent = "Scryfallと照合中...";
    }
    const [mainEnriched, sideEnriched] = await Promise.all([
      enrichDeckList(parsed.main),
      enrichDeckList(parsed.side),
    ]);
    deckState.main = mainEnriched.map((card) => ({
      ...card,
      name: card.nameJa || card.nameEn || card.name,
    }));
    deckState.side = sideEnriched.map((card) => ({
      ...card,
      name: card.nameJa || card.nameEn || card.name,
    }));
    updateSummary(countQty(deckState.main), countQty(deckState.side));
    refreshViews();
    setProgress(100);
    showToast("インポートが完了しました。");
    importRun.disabled = false;
  };
  reader.onerror = () => {
    setProgress(0);
    importSummary.textContent = "読み込みに失敗しました。";
    showToast("ファイルの読み込みに失敗しました。");
    importRun.disabled = false;
  };
  reader.readAsText(file);
}

const installButton = document.querySelector(".header-actions .ghost");
if (installButton) {
  installButton.addEventListener("click", () => {
    alert("PWAインストールは実装予定です。");
  });
}

if (importRun) {
  importRun.addEventListener("click", runImport);
}

if (clearDeck) {
  clearDeck.addEventListener("click", () => {
    deckState.main = [];
    deckState.side = [];
    updateSummary(0, 0);
    refreshViews();
    showToast("デッキをクリアしました。");
  });
}

if (exportPdf) {
  exportPdf.addEventListener("click", () => {
    updatePrintLayout();
    showToast("PDF出力の準備中...");
    // iOS Safari blocks async print; call immediately in the user gesture.
    window.print();
  });
}

if (exportArena) {
  exportArena.addEventListener("click", () => {
    const text = buildArenaText();
    copyToClipboard(text);
  });
}

if (exportTxt) {
  exportTxt.addEventListener("click", () => {
    const text = buildJapaneseText();
    downloadText(text, "decklist-ja.txt");
    showToast("テキストをダウンロードしました。");
  });
}

if (goldfishStart) {
  goldfishStart.addEventListener("click", startGoldfish);
}

if (goldfishMulligan) {
  goldfishMulligan.addEventListener("click", mulliganGoldfish);
}

if (goldfishBottom) {
  goldfishBottom.addEventListener("click", confirmBottom);
}

if (goldfishDraw) {
  goldfishDraw.addEventListener("click", () => {
    snapshotGoldfish();
    drawCards(1);
    renderGoldfish();
  });
}

if (goldfishNext) {
  goldfishNext.addEventListener("click", () => {
    snapshotGoldfish();
    goldfishState.turn += 1;
    drawCards(1);
    renderGoldfish();
  });
}

if (goldfishUndo) {
  goldfishUndo.addEventListener("click", () => {
    restoreGoldfish();
  });
}

if (goldfishShuffle) {
  goldfishShuffle.addEventListener("click", () => {
    snapshotGoldfish();
    shuffle(goldfishState.library);
    renderGoldfish();
  });
}

if (goldfishReset) {
  goldfishReset.addEventListener("click", () => {
    goldfishHistory.length = 0;
    goldfishState.library = [];
    goldfishState.hand = [];
    goldfishState.battlefield = [];
    goldfishState.graveyard = [];
    goldfishState.exile = [];
    goldfishState.turn = 1;
    goldfishState.mulligans = 0;
    goldfishState.bottomPending = 0;
    goldfishState.selected.clear();
    renderGoldfish();
  });
}

if (goldfishHand) {
  goldfishHand.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.getAttribute("data-action");
    const id = button.getAttribute("data-id");
    if (action === "select") {
      if (goldfishState.selected.has(id)) {
        goldfishState.selected.delete(id);
      } else {
        goldfishState.selected.add(id);
      }
      renderGoldfish();
      return;
    }
    if (action === "battlefield") moveCard(id, "hand", "battlefield");
    if (action === "graveyard") moveCard(id, "hand", "graveyard");
    if (action === "exile") moveCard(id, "hand", "exile");
  });
}

if (goldfishHand) {
  goldfishHand.addEventListener("click", (event) => {
    const thumb = event.target.closest(".zone-thumb");
    if (!thumb) return;
    thumb.classList.toggle("is-zoomed");
  });
}

if (goldfishBattlefield) {
  goldfishBattlefield.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.getAttribute("data-action");
    const id = button.getAttribute("data-id");
    if (action === "hand") moveCard(id, "battlefield", "hand");
    if (action === "graveyard") moveCard(id, "battlefield", "graveyard");
  });
}

if (goldfishBattlefield) {
  goldfishBattlefield.addEventListener("click", (event) => {
    const thumb = event.target.closest(".zone-thumb");
    if (!thumb) return;
    thumb.classList.toggle("is-zoomed");
  });
}

if (goldfishGraveyard) {
  goldfishGraveyard.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.getAttribute("data-action");
    const id = button.getAttribute("data-id");
    if (action === "hand") moveCard(id, "graveyard", "hand");
    if (action === "battlefield") moveCard(id, "graveyard", "battlefield");
  });
}

if (goldfishGraveyard) {
  goldfishGraveyard.addEventListener("click", (event) => {
    const thumb = event.target.closest(".zone-thumb");
    if (!thumb) return;
    thumb.classList.toggle("is-zoomed");
  });
}

if (goldfishExile) {
  goldfishExile.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.getAttribute("data-action");
    const id = button.getAttribute("data-id");
    if (action === "hand") moveCard(id, "exile", "hand");
  });
}

if (goldfishExile) {
  goldfishExile.addEventListener("click", (event) => {
    const thumb = event.target.closest(".zone-thumb");
    if (!thumb) return;
    thumb.classList.toggle("is-zoomed");
  });
}

if (pdfPlayer) {
  pdfPlayer.addEventListener("input", updatePrintLayout);
}

if (pdfDate) {
  pdfDate.addEventListener("change", updatePrintLayout);
}

console.log("Mock UI ready", mockState);

refreshViews();

loadDictText()
  .then((text) => {
    if (text) {
      dictionaryMap = parseDictionary(text);
      const updatedAt = localStorage.getItem(DICT_UPDATED_KEY) || "不明";
      setDictStatus(`辞書読み込み済み (${dictionaryMap.size}件) / 更新: ${updatedAt}`);
    }
  })
  .catch(() => {
    setDictStatus("辞書未読み込み");
  });

if (dictUrlInput) {
  const savedUrl = localStorage.getItem(DICT_URL_KEY);
  if (savedUrl) dictUrlInput.value = savedUrl;
  dictUrlInput.addEventListener("change", () => {
    if (dictUrlInput.value) {
      localStorage.setItem(DICT_URL_KEY, dictUrlInput.value.trim());
    }
  });
}

if (dictAuto) {
  const autoSaved = localStorage.getItem(DICT_AUTO_KEY);
  dictAuto.checked = autoSaved === "1";
  dictAuto.addEventListener("change", () => {
    localStorage.setItem(DICT_AUTO_KEY, dictAuto.checked ? "1" : "0");
  });
}

if (dictFetchButton) {
  dictFetchButton.addEventListener("click", loadDictionaryFromUrl);
}

if (dictFileInput) {
  dictFileInput.addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) loadDictionaryFromFile(file);
  });
}

if (localStorage.getItem(DICT_AUTO_KEY) === "1") {
  const url = localStorage.getItem(DICT_URL_KEY);
  if (url && dictUrlInput) {
    dictUrlInput.value = url;
    loadDictionaryFromUrl();
  }
}

if (searchInput) {
  searchInput.addEventListener("input", (event) => {
    const value = event.target.value;
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      runSearch(value);
    }, 300);
  });
}

if (searchButton && searchInput) {
  searchButton.addEventListener("click", () => {
    runSearch(searchInput.value);
  });
}

if (searchResults) {
  searchResults.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const id = button.getAttribute("data-id");
    const action = button.getAttribute("data-action");
    const card = id ? lastSearchResults.get(id) : null;
    if (!card) return;
    addCardToBoard(action === "add-side" ? "side" : "main", card);
  });
}

if (searchResults) {
  searchResults.addEventListener("click", (event) => {
    const thumb = event.target.closest(".thumb");
    if (!thumb) return;
    thumb.classList.toggle("is-zoomed");
  });
}

if (formatSelect) {
  formatSelect.addEventListener("change", () => {
    refreshViews();
    if (searchInput && searchInput.value) {
      runSearch(searchInput.value);
    }
  });
}

if (searchFilters) {
  searchFilters.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (!chip) return;
    const filter = chip.getAttribute("data-filter") || "all";
    activeSearchFilter = filter;
    searchFilters.querySelectorAll(".chip").forEach((el) => {
      el.classList.toggle("active", el === chip);
    });
    if (searchInput && searchInput.value) {
      runSearch(searchInput.value);
    }
  });
}

if (viewTabs) {
  viewTabs.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view]");
    if (!button) return;
    const view = button.getAttribute("data-view") || "builder";
    viewTabs.querySelectorAll("button[data-view]").forEach((el) => {
      el.classList.toggle("active", el === button);
    });
    setActiveView(view);
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("Service worker registration failed", err);
    });
  });
}
