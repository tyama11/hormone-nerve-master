import type { Category, Difficulty, RankInfo, StageItem } from './types.ts';

export const TAB1_ITEMS: readonly StageItem[] = [
    { stageId: 'h1', name: 'グルカゴン', emoji: '📈', hint: 'すい臓A細胞から分泌・グリコーゲンを分解し血糖上昇', x: 140, y: 115, boxLabel: '血糖上昇①' },
    { stageId: 'h2', name: 'アドレナリン', emoji: '⚡', hint: '副腎髄質から分泌・グリコーゲンを分解し血糖上昇', x: 350, y: 115, boxLabel: '血糖上昇②' },
    { stageId: 'h3', name: '糖質コルチコイド', emoji: '🥩', hint: '副腎皮質から分泌・糖新生で血糖上昇', x: 560, y: 115, boxLabel: '血糖上昇③' },
    { stageId: 'h4', name: 'インスリン', emoji: '📉', hint: 'すい臓B細胞から分泌・血糖値を下げる唯一のホルモン', x: 350, y: 265, boxLabel: '血糖低下（唯一）' },
    { stageId: 'h5', name: 'バソプレシン', emoji: '💧', hint: '脳下垂体後葉・腎臓での水の再吸収を促進', x: 140, y: 415, boxLabel: '水の再吸収' },
    { stageId: 'h6', name: '鉱質コルチコイド', emoji: '🧂', hint: '副腎皮質・ナトリウムイオンの再吸収を促進', x: 350, y: 415, boxLabel: '塩分の再吸収' },
    { stageId: 'h7', name: 'チロキシン', emoji: '🔥', hint: '甲状腺から分泌・全身の代謝を活性化', x: 560, y: 415, boxLabel: '代謝活性' }
];

export const TAB2_ITEMS: readonly StageItem[] = [
    { stageId: 'v1', name: '交感神経', emoji: '🦁', hint: '闘争と逃走（心拍増加・瞳孔拡大）', x: 175, y: 115, boxLabel: '活動時' },
    { stageId: 'v2', name: '副交感神経', emoji: '🍵', hint: 'リラックス（消化管促進・心拍減少）', x: 525, y: 115, boxLabel: '休息時' },
    { stageId: 'v3', name: '電気信号＋伝達物質', emoji: '⚡', hint: '神経系の情報伝達物質', x: 175, y: 270, boxLabel: '神経の伝達' },
    { stageId: 'v4', name: 'ホルモン（血液）', emoji: '🩸', hint: '内分泌系の伝達物質と経路（分〜時間単位）', x: 525, y: 270, boxLabel: 'ホルモンの伝達' },
    { stageId: 'v5', name: '標的細胞・受容体', emoji: '🔑', hint: '特定のホルモンと鍵と鍵穴の関係で結合', x: 350, y: 420, boxLabel: '作用する相手' }
];

export const CATEGORY_CONFIG: Readonly<Record<Category, { label: string; description: string; trayTitle: string }>> = {
    'hormone': {
        label: '💉 ホルモンと血糖調節で覚える',
        description: '血糖値を上げる3つ・下げる1つと、体液・代謝のホルモンを正しい位置に当てはめよう！',
        trayTitle: '💉 ホルモンカード'
    },
    'nerve': {
        label: '⚡ 神経系 ＆ 恒常性比較で覚える',
        description: '自律神経（交感・副交感）と、神経系・内分泌系の違いを整理して覚えよう！',
        trayTitle: '⚡ 神経・比較カード'
    }
};

export const DIFFICULTY_LABELS: Readonly<Record<Difficulty, string>> = {
    easy: '🔰 かんたん',
    normal: '🧪 ふつう',
    oni: '👹 おに (60秒TA)'
};

export function getItemsForCategory(cat: Category): readonly StageItem[] {
    return cat === 'hormone' ? TAB1_ITEMS : TAB2_ITEMS;
}

export function getOniRankInfo(score: number): RankInfo {
    if (score >= 20) return { rank: 'S', icon: '👑', title: '神経とホルモンの神', className: 'rank-s' };
    if (score >= 14) return { rank: 'A', icon: '🔬', title: '熟練研究者', className: 'rank-a' };
    if (score >= 8) return { rank: 'B', icon: '🧪', title: '一人前ラボ員', className: 'rank-b' };
    return { rank: 'C', icon: '🌱', title: '見習い観察者', className: 'rank-c' };
}
