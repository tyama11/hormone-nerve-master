import { CATEGORY_CONFIG, DIFFICULTY_LABELS, getItemsForCategory, getOniRankInfo } from './data.ts';
import { byId, bySelector } from './dom.ts';
import { ONI_BONUS_SECONDS, ONI_PENALTY_SECONDS, ONI_TIME_LIMIT, buildOniQuestion, buildStandardCards, computeRemainingSeconds, isBonusCombo } from './game-logic.ts';
import { shuffleInPlace } from './random.ts';
import { createSoundFx } from './sound.ts';
import { createProgressStore, safeLocalStorage } from './storage.ts';
import type { Card, Category, Difficulty } from './types.ts';

const storage = safeLocalStorage();
const progress = createProgressStore(storage);
const SOUND_FX = createSoundFx(storage);

const state = {
    category: 'hormone' as Category,
    difficulty: 'easy' as Difficulty,
    score: 0,
    combo: 0,
    maxCombo: 0,
    totalQuestions: 0,
    selectedItemId: null as string | null,
    currentOniStageId: null as string | null,
    items: [] as Card[],
    nextUid: 0,
    timeLeft: ONI_TIME_LIMIT,
    lastTickSecond: -1,
    oniEndTime: 0,
    isPlaying: false,
    justUnlockedOni: false,
    timerInterval: null as ReturnType<typeof setInterval> | null,
    toastTimeout: null as ReturnType<typeof setTimeout> | null,
    returnTimeout: null as ReturnType<typeof setTimeout> | null
};

const els = {
    homeScreen: byId('home-screen'),
    gameScreen: byId('game-screen'),
    mainArea: bySelector('.main'),
    homeDesc: byId('home-desc'),
    earnedTitleBanner: byId('earned-title-banner'),
    ruleOniItem: byId('rule-oni-item'),
    btnOni: byId<HTMLButtonElement>('btn-oni'),
    homeMuteBtn: byId<HTMLButtonElement>('home-mute-btn'),
    gameMuteBtn: byId<HTMLButtonElement>('game-mute-btn'),
    tabScore1: byId('tab-score-1'),
    tabScore2: byId('tab-score-2'),
    categoryTabs: document.querySelectorAll<HTMLButtonElement>('.category-tab'),
    modeButtons: document.querySelectorAll<HTMLButtonElement>('.mode-btn'),
    homeBtn: byId<HTMLButtonElement>('home-btn'),
    modeDisplay: byId('mode-display'),
    trayTitleText: byId('tray-title-text'),
    trayHint: byId('tray-hint'),
    progressContainer: byId('progress-container'),
    timerBadge: byId('timer-badge'),
    timerText: byId('timer-text'),
    comboBadge: byId('combo-badge'),
    scoreText: byId('score-text'),
    progressFill: byId('progress-fill'),
    boardSvg: byId<SVGSVGElement>('board-svg'),
    cardList: byId('card-list'),
    toast: byId('toast'),
    clearOverlay: byId('clear-overlay'),
    clearTitle: byId('clear-title'),
    clearSubtitle: byId('clear-subtitle'),
    clearActions: byId('clear-actions'),
    autoReturnText: byId('auto-return-text'),
    retryBtn: byId<HTMLButtonElement>('retry-btn'),
    overlayHomeBtn: byId<HTMLButtonElement>('overlay-home-btn')
};

function init(): void {
    els.categoryTabs.forEach((tab) => tab.addEventListener('click', () => {
        SOUND_FX.playTap();
        const cat = tab.dataset['category'] as Category;
        setCategory(cat);
    }));
    els.modeButtons.forEach((btn) => btn.addEventListener('click', () => {
        SOUND_FX.playTap();
        startGame(btn.dataset['difficulty'] as Difficulty);
    }));
    els.homeBtn.addEventListener('click', () => { SOUND_FX.playTap(); resetToHome(); });
    els.overlayHomeBtn.addEventListener('click', () => { SOUND_FX.playTap(); resetToHome(); });
    els.retryBtn.addEventListener('click', () => { SOUND_FX.playTap(); els.clearOverlay.classList.remove('active'); startGame(state.difficulty); });
    const mute = () => { SOUND_FX.toggleMute(); syncMute(); };
    els.homeMuteBtn.addEventListener('click', mute);
    els.gameMuteBtn.addEventListener('click', mute);
    syncMute();

    els.boardSvg.addEventListener('click', (e) => {
        if (!state.isPlaying || state.difficulty === 'oni' || !state.selectedItemId) return;
        const node = (e.target as Element | null)?.closest<SVGGElement>('.stage-node.interactive-target');
        if (node) attemptPlace(node.dataset['stage'] ?? '');
    });
    els.boardSvg.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && state.isPlaying && state.difficulty !== 'oni') {
            const node = (e.target as Element | null)?.closest<SVGGElement>('.stage-node.interactive-target');
            if (node) { e.preventDefault(); attemptPlace(node.dataset['stage'] ?? ''); }
        }
    });
    document.addEventListener('keydown', (e) => {
        if (!els.gameScreen.classList.contains('active') || !state.isPlaying) return;
        if (state.difficulty === 'oni' && /^[1-9]$/.test(e.key)) {
            const t = els.cardList.querySelectorAll<HTMLElement>('.bio-card')[Number(e.key) - 1];
            if (t) { e.preventDefault(); t.click(); }
        } else if (e.key === 'Escape' && state.selectedItemId) {
            state.selectedItemId = null; renderCards();
        }
    });
    setCategory('hormone');
    updateTabScores();
}

function syncMute(): void {
    const m = SOUND_FX.isMuted();
    els.homeMuteBtn.textContent = m ? '🔇 音OFF' : '🔊 音ON';
    els.gameMuteBtn.textContent = m ? '🔇' : '🔊';
}

function updateTabScores(): void {
    [['hormone', els.tabScore1], ['nerve', els.tabScore2]].forEach(([c, el]) => {
        const s = progress.getOniBest(c as Category);
        if (s !== null) { (el as HTMLElement).textContent = `👹 ${s}問`; (el as HTMLElement).hidden = false; }
        else (el as HTMLElement).hidden = true;
    });
    const saved = progress.getOniBest(state.category);
    if (saved === null) { els.earnedTitleBanner.hidden = true; return; }
    const r = getOniRankInfo(saved);
    els.earnedTitleBanner.className = `earned-title-banner ${r.className}`;
    els.earnedTitleBanner.textContent = `称号：${r.icon} ${r.title}`;
    els.earnedTitleBanner.hidden = false;
}

function setCategory(cat: Category): void {
    state.category = cat;
    els.categoryTabs.forEach((tab) => {
        const a = tab.dataset['category'] === cat;
        tab.classList.toggle('active', a);
        tab.setAttribute('aria-selected', String(a));
    });
    els.homeDesc.textContent = CATEGORY_CONFIG[cat].description;
    const unlocked = progress.isOniUnlocked(cat);
    els.ruleOniItem.hidden = !unlocked;
    els.btnOni.hidden = !unlocked;
    updateTabScores();
}

function renderBoardBackdropSvg(cat: Category): string {
    if (cat === 'hormone') {
        return `<g class="board-backdrop">
            <!-- Top panel: 血糖値を上げるホルモン（3つの経路） ↑ -->
            <rect x="16" y="10" width="668" height="168" rx="16" fill="#F0FDF4" stroke="#86EFAC" stroke-width="2" />
            <text x="32" y="32" font-size="13" font-weight="900" fill="#15803D">血糖値を上げるホルモン（3つの経路） ↑</text>
            <text x="125" y="64" text-anchor="middle" font-size="11" font-weight="700" fill="#166534">すい臓A細胞・グリコーゲン分解</text>
            <text x="350" y="64" text-anchor="middle" font-size="11" font-weight="700" fill="#166534">副腎髄質・グリコーゲン分解</text>
            <text x="575" y="64" text-anchor="middle" font-size="11" font-weight="700" fill="#166534">副腎皮質・糖新生</text>

            <!-- Middle panel: 血糖値を下げる唯一のホルモン ↓ -->
            <rect x="16" y="188" width="668" height="152" rx="16" fill="#FEF2F2" stroke="#FCA5A5" stroke-width="2" />
            <text x="32" y="210" font-size="13" font-weight="900" fill="#B91C1C">血糖値を下げる唯一のホルモン ↓</text>
            <rect x="36" y="246" width="190" height="54" rx="12" fill="#FFFFFF" stroke="#FCA5A5" stroke-width="1.5"/>
            <text x="131" y="269" text-anchor="middle" font-size="11" font-weight="700" fill="#991B1B">高血糖 → 副交感神経</text>
            <text x="131" y="287" text-anchor="middle" font-size="11" font-weight="700" fill="#991B1B">すい臓B細胞</text>
            <path d="M228 273 L254 273" stroke="#475569" stroke-width="2" marker-end="url(#arrow)" />
            <path d="M446 273 L472 273" stroke="#475569" stroke-width="2" marker-end="url(#arrow)" />
            <rect x="474" y="246" width="190" height="54" rx="12" fill="#FFFFFF" stroke="#FCA5A5" stroke-width="1.5"/>
            <text x="569" y="269" text-anchor="middle" font-size="11" font-weight="700" fill="#991B1B">グリコーゲン合成</text>
            <text x="569" y="287" text-anchor="middle" font-size="11" font-weight="700" fill="#991B1B">血糖値が低下</text>

            <!-- Bottom panel: 体液（水・塩分）・代謝調節とフィードバック -->
            <rect x="16" y="350" width="668" height="180" rx="16" fill="#EFF6FF" stroke="#93C5FD" stroke-width="2" />
            <text x="32" y="372" font-size="13" font-weight="900" fill="#1D4ED8">体液（水・塩分）・代謝調節とフィードバック</text>
            <text x="125" y="408" text-anchor="middle" font-size="11" font-weight="700" fill="#1E40AF">脳下垂体後葉・水再吸収</text>
            <text x="350" y="408" text-anchor="middle" font-size="11" font-weight="700" fill="#1E40AF">副腎皮質・Na⁺再吸収</text>
            <text x="575" y="408" text-anchor="middle" font-size="11" font-weight="700" fill="#1E40AF">甲状腺・全身の代謝促進</text>
        </g>`;
    } else {
        return `<g class="board-backdrop">
            <!-- Top: 自律神経の拮抗作用 -->
            <rect x="16" y="10" width="668" height="164" rx="16" fill="#FDF4FF" stroke="#F0ABFC" stroke-width="2" />
            <text x="32" y="32" font-size="13" font-weight="900" fill="#A21CAF">自律神経の拮抗作用（活動時 ⇔ 休息時）</text>
            <text x="185" y="64" text-anchor="middle" font-size="11" font-weight="700" fill="#86198F">闘争と逃走（心拍↑・瞳孔拡大）</text>
            <text x="350" y="122" text-anchor="middle" font-size="18" font-weight="900" fill="#A21CAF">⇔</text>
            <text x="515" y="64" text-anchor="middle" font-size="11" font-weight="700" fill="#86198F">リラックス（消化↑・心拍↓）</text>

            <!-- Middle: 神経系 vs 内分泌系 比較 -->
            <rect x="16" y="184" width="668" height="164" rx="16" fill="#FFFBEB" stroke="#FDE047" stroke-width="2" />
            <text x="32" y="206" font-size="13" font-weight="900" fill="#A16207">神経系 vs 内分泌系 比較</text>
            <text x="185" y="238" text-anchor="middle" font-size="11" font-weight="700" fill="#854D0E">速い・一時的（ミリ秒単位）</text>
            <text x="350" y="296" text-anchor="middle" font-size="15" font-weight="900" fill="#A16207">vs</text>
            <text x="515" y="238" text-anchor="middle" font-size="11" font-weight="700" fill="#854D0E">遅い・持続的（分〜時間単位）</text>

            <!-- Bottom: ホルモンの特異的作用 -->
            <rect x="16" y="358" width="668" height="172" rx="16" fill="#F0FDFA" stroke="#5EEAD4" stroke-width="2" />
            <text x="32" y="380" font-size="13" font-weight="900" fill="#0F766E">ホルモンの特異的作用（鍵と鍵穴の関係）</text>
            <rect x="44" y="430" width="182" height="56" rx="12" fill="#FFFFFF" stroke="#5EEAD4" stroke-width="1.5"/>
            <text x="135" y="462" text-anchor="middle" font-size="11" font-weight="700" fill="#0F766E">血液中のホルモン</text>
            <path d="M228 458 L254 458" stroke="#475569" stroke-width="2" marker-end="url(#arrow)" />
            <path d="M446 458 L472 458" stroke="#475569" stroke-width="2" marker-end="url(#arrow)" />
            <rect x="474" y="430" width="182" height="56" rx="12" fill="#FFFFFF" stroke="#5EEAD4" stroke-width="1.5"/>
            <text x="565" y="462" text-anchor="middle" font-size="11" font-weight="700" fill="#0F766E">特定の器官のみに作用</text>
        </g>`;
    }
}

function renderBoardSvg(oniBlankStageId: string | null): void {
    const items = getItemsForCategory(state.category);
    const backdrop = renderBoardBackdropSvg(state.category);
    const isEasy = state.difficulty === 'easy';

    // Count numbered blanks for normal mode
    let blankIndex = 0;

    const nodes = items.map((s) => {
        const isTargetBlank = oniBlankStageId !== null ? s.stageId === oniBlankStageId : true;
        let cls = 'stage-node';
        let txt = '';
        let showBoxLabel = true;

        if (oniBlankStageId !== null) {
            if (isTargetBlank) {
                cls += ' oni-target-blank interactive-target';
                txt = '？';
                showBoxLabel = false;
            } else {
                cls += ' solved';
                txt = s.name;
            }
        } else if (isEasy) {
            cls += ' interactive-target masked';
            txt = '？';
            showBoxLabel = true;
        } else {
            blankIndex++;
            cls += ' interactive-target masked';
            txt = `【 ${blankIndex} 】`;
            showBoxLabel = false;
        }

        const boxW = s.name.length >= 14 ? 236 : (s.name.length >= 12 ? 216 : 180);
        const halfW = boxW / 2;
        const labelFontSize = txt.length >= 15 ? 11 : (txt.length >= 12 ? 12 : 14);
        const boxLabelSvg = showBoxLabel ? `<text x="0" y="-10" text-anchor="middle" font-size="11" font-weight="700" fill="#5B6E82">${s.boxLabel}</text>` : '';
        const yOffset = showBoxLabel ? 12 : 5;

        return `<g class="${cls}" data-stage="${s.stageId}" tabindex="0" role="button" transform="translate(${s.x}, ${s.y})">
            <g class="stage-visual">
                <rect class="stage-box ${isTargetBlank && oniBlankStageId ? 'oni-focus-box' : ''}" x="${-halfW}" y="-30" width="${boxW}" height="60" rx="14" fill="#FFFFFF" stroke="#6F7977" stroke-width="2.5" />
                ${boxLabelSvg}
                <text class="stage-label" x="0" y="${yOffset}" text-anchor="middle" font-size="${labelFontSize}" font-weight="800" fill="#161D1C">${txt}</text>
            </g>
        </g>`;
    }).join('');
    els.boardSvg.innerHTML = `<defs><marker id="arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#475569"/></marker></defs>${backdrop}${nodes}`;
}

function updateComboBadge(): void {
    if (state.difficulty === 'oni' && state.combo >= 2) {
        els.comboBadge.textContent = `${state.combo} 連続正解！`;
        els.comboBadge.classList.add('show');
    } else {
        els.comboBadge.classList.remove('show');
    }
}

function triggerErrorShake(el: HTMLElement): void {
    el.classList.add('error-shake');
    setTimeout(() => el.classList.remove('error-shake'), 400);
}

function createConfetti(): void {
    const container = document.body;
    for (let i = 0; i < 40; i++) {
        const conf = document.createElement('div');
        conf.className = 'confetti-piece';
        conf.style.left = `${Math.random() * 100}vw`;
        conf.style.top = `-20px`;
        conf.style.backgroundColor = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][Math.floor(Math.random() * 5)]!;
        conf.style.transform = `rotate(${Math.random() * 360}deg)`;
        conf.style.animation = `confetti-fall ${1 + Math.random() * 1.5}s linear forwards`;
        container.appendChild(conf);
        setTimeout(() => conf.remove(), 2500);
    }
}

function startGame(difficulty: Difficulty): void {
    stopTimers();
    state.difficulty = difficulty;
    state.score = 0; state.combo = 0; state.maxCombo = 0;
    state.selectedItemId = null; state.currentOniStageId = null;
    state.timeLeft = ONI_TIME_LIMIT; state.lastTickSecond = -1; state.isPlaying = true;

    const isOni = difficulty === 'oni';
    els.progressContainer.classList.toggle('oni-active', isOni);
    els.timerBadge.hidden = !isOni;
    els.scoreText.hidden = !isOni;
    els.progressFill.classList.toggle('timer-fill', isOni);
    els.modeDisplay.textContent = `${CATEGORY_CONFIG[state.category].label} / ${DIFFICULTY_LABELS[difficulty]}`;

    if (isOni) {
        els.trayTitleText.textContent = '❓ ？に入るのは？';
        els.trayHint.textContent = '👆クリック または 1・2・3キーで回答';
        nextOni();
        updateOniHud();
        state.oniEndTime = Date.now() + ONI_TIME_LIMIT * 1000;
        state.timerInterval = setInterval(() => {
            const rem = Math.max(0, state.oniEndTime - Date.now());
            state.timeLeft = computeRemainingSeconds(state.oniEndTime, Date.now());
            if (state.timeLeft <= 10 && state.timeLeft > 0 && state.timeLeft !== state.lastTickSecond) {
                state.lastTickSecond = state.timeLeft; SOUND_FX.playTick();
            }
            updateOniHud(rem);
            if (rem <= 0) { stopTimers(); handleOniTimeUp(); }
        }, 100);
    } else {
        els.trayTitleText.textContent = CATEGORY_CONFIG[state.category].trayTitle;
        els.trayHint.textContent = '👆カードを選んで図の枠をクリック';
        renderBoardSvg(null);
        const built = buildStandardCards(state.category, state.nextUid);
        state.nextUid = built.nextUid;
        state.items = shuffleInPlace(built.items);
        state.totalQuestions = state.items.length;
        els.progressFill.style.width = '0%';
        renderCards();
    }
    els.homeScreen.classList.remove('active');
    els.gameScreen.classList.add('active');
}

function nextOni(): void {
    const q = buildOniQuestion(state.category, state.currentOniStageId, state.nextUid);
    state.currentOniStageId = q.target.stageId;
    state.nextUid = q.nextUid;
    state.items = q.choices;
    els.trayTitleText.textContent = q.askHint ? '❓ ？の時期・項目はどれ？' : '❓ ？に入る名称は？';
    renderBoardSvg(q.target.stageId);
    renderCards();
}

function renderCards(): void {
    els.cardList.innerHTML = '';
    const isOni = state.difficulty === 'oni';
    const isEasy = state.difficulty === 'easy';
    els.cardList.classList.toggle('oni-choices', isOni);
    state.items.forEach((item, idx) => {
        const card = document.createElement('div');
        const sel = state.selectedItemId === item.id;
        card.className = `bio-card${sel ? ' selected' : ''}`;
        card.tabIndex = 0;
        const iconHtml = isEasy ? `<div class="feature-icon">${item.emoji}</div>` : '';
        const hintHtml = item.hint && !isOni ? `<div class="hint">${item.hint}</div>` : '';
        card.innerHTML = `${iconHtml}<div class="info"><div class="name">${item.name}</div>${hintHtml}</div>`;
        if (isOni && idx < 9) card.insertAdjacentHTML('afterbegin', `<span class="key-badge">${idx + 1}</span>`);
        card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); } });
        card.addEventListener('click', () => {
            if (!state.isPlaying) return;
            if (isOni) {
                if (item.stageId === state.currentOniStageId) {
                    state.score++; state.combo++; state.maxCombo = Math.max(state.maxCombo, state.combo);
                    updateComboBadge();
                    if (isBonusCombo(state.combo)) { state.oniEndTime += ONI_BONUS_SECONDS * 1000; SOUND_FX.playBonus(); showToast(`🔥 ${state.combo}連続！ +3秒！`); }
                    else { SOUND_FX.playCorrect(state.combo); showToast('⭕ 正解！'); }
                    if (state.score > 0) createConfetti();
                    updateOniHud(); nextOni();
                } else {
                    state.combo = 0; updateComboBadge(); SOUND_FX.playWrong(); state.oniEndTime -= ONI_PENALTY_SECONDS * 1000;
                    triggerErrorShake(card);
                    showToast(`❌ ミス！ -${ONI_PENALTY_SECONDS}秒`);
                    const rem = Math.max(0, state.oniEndTime - Date.now());
                    if (rem <= 0) { stopTimers(); handleOniTimeUp(); } else { updateOniHud(rem); nextOni(); }
                }
                return;
            }
            SOUND_FX.playTap();
            state.selectedItemId = sel ? null : item.id;
            renderCards();
        });
        els.cardList.appendChild(card);
    });
}

function attemptPlace(stageId: string): void {
    const idx = state.items.findIndex((i) => i.id === state.selectedItemId);
    if (idx === -1) return;
    const item = state.items[idx]!;
    if (item.stageId === stageId) {
        state.score++;
        SOUND_FX.playCorrect(1);
        showToast(`⭕ 正解！ ${item.name}`);
        const node = els.boardSvg.querySelector<SVGGElement>(`[data-stage="${stageId}"]`);
        if (node) {
            node.classList.remove('masked', 'interactive-target');
            node.classList.add('solved');
            const lbl = node.querySelector('.stage-label');
            if (lbl) lbl.textContent = item.name;
        }
        state.items.splice(idx, 1);
        state.selectedItemId = null;
        els.progressFill.style.width = `${(state.score / state.totalQuestions) * 100}%`;
        renderCards();
        if (state.score >= state.totalQuestions) {
            createConfetti();
            handleGameClear();
        }
    } else {
        SOUND_FX.playWrong();
        const node = els.boardSvg.querySelector<SVGGElement>(`[data-stage="${stageId}"]`);
        if (node) triggerErrorShake(els.mainArea);
        showToast('❌ 違うみたい…');
        state.selectedItemId = null;
        renderCards();
    }
}

function updateOniHud(rem = state.timeLeft * 1000): void {
    els.timerText.textContent = String(state.timeLeft);
    els.scoreText.textContent = `🏆 ${state.score}問`;
    els.progressFill.style.width = `${Math.min(100, (rem / (ONI_TIME_LIMIT * 1000)) * 100)}%`;
}

function showToast(msg: string): void {
    els.toast.innerHTML = msg;
    els.toast.style.backgroundColor = msg.includes('❌') ? 'rgba(239, 68, 68, 0.95)' : 'rgba(13, 148, 136, 0.95)';
    els.toast.classList.add('show');
    if (state.toastTimeout !== null) clearTimeout(state.toastTimeout);
    state.toastTimeout = setTimeout(() => els.toast.classList.remove('show'), 1200);
}

function handleGameClear(): void {
    state.isPlaying = false;
    let unlockedNow = false;
    const k = state.category;
    if (state.difficulty === 'normal' && !progress.isOniUnlocked(k)) {
        progress.unlockOni(k); state.justUnlockedOni = true; unlockedNow = true;
    }
    SOUND_FX.playClear(unlockedNow);
    els.clearTitle.innerHTML = '🎊 素晴らしい！ 🎊';
    els.clearSubtitle.innerHTML = unlockedNow ? 'すべてマスターしました！<div class="unlock-message">どこかでとびらがひらいたようだ…！</div>' : 'すべてマスターしました！';
    els.clearActions.hidden = true; els.autoReturnText.hidden = false;
    els.clearOverlay.classList.add('active');
    state.returnTimeout = setTimeout(resetToHome, unlockedNow ? 4500 : 3000);
}

function handleOniTimeUp(): void {
    state.isPlaying = false;
    const k = state.category;
    const prev = progress.getOniBest(k) ?? -1;
    const best = Math.max(prev, state.score);
    if (state.score > prev) progress.setOniBest(k, best);
    updateTabScores();
    const r = getOniRankInfo(state.score);
    SOUND_FX.playTimeUp(r.rank === 'S' || r.rank === 'A');
    els.clearTitle.innerHTML = '⏱️ タイムアップ！';
    els.clearSubtitle.innerHTML = `<div class="rank-showcase ${r.className}"><span class="rank-letter">${r.rank}</span><span class="rank-title-text">${r.icon} ${r.title}</span></div><div style="font-size:40px;font-weight:900;color:var(--primary);">${state.score}問正解！</div><div>ベスト記録：<b>${best} 問</b></div>`;
    els.clearActions.hidden = false; els.autoReturnText.hidden = true;
    els.clearOverlay.classList.add('active');
}

function stopTimers(): void {
    if (state.timerInterval !== null) clearInterval(state.timerInterval);
    if (state.returnTimeout !== null) clearTimeout(state.returnTimeout);
    state.timerInterval = null; state.returnTimeout = null;
}

function resetToHome(): void {
    stopTimers(); state.isPlaying = false;
    els.clearOverlay.classList.remove('active');
    els.gameScreen.classList.remove('active');
    els.homeScreen.classList.add('active');
    setCategory(state.category);
    state.justUnlockedOni = false;
}

init();
