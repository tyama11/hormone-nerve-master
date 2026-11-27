                                           

export const BOARD_VIEWBOX = { width: 700, height: 540 }         ;
export const STAGE_BOX_HEIGHT = 60;

export function getStageBoxWidth(name        )         {
    return name.length >= 14 ? 236 : (name.length >= 12 ? 216 : 180);
}

export function getStageLabelFontSize(txt        )         {
    return txt.length >= 15 ? 11 : (txt.length >= 12 ? 12 : 14);
}

export function renderBoardBackdropSvg(cat          )         {
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


//# sourceURL=board-svg.ts