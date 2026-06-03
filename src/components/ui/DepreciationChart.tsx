/**
 * ============================================================
 *  AI組織型コードレビュー済み
 *  レビュー日: 2026-06-01
 *  レビュー部署: バグチェック部 / セキュリティ部 / 改善提案部
 *  統合修正: 開発部
 * ============================================================
 */

import React from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceDot, ReferenceArea } from 'recharts';
import { formatCurrency } from '../../utils/formatters';

interface ChartRow {
    year: number;
    depreciation: number;
    depreciationBuilding?: number;  // 日本語コメント: 建物本体の減価償却費
    depreciationEquipment?: number; // 日本語コメント: 設備の減価償却費
    principal: number;
    atcf: number;
}

interface DepreciationChartProps {
    data: ChartRow[];               // 35年間の予測データ
    deadCrossYear: number | null;   // デッドクロス発生年度
}

/**
 * 減価償却費 vs ローン元金返済額 の重ね合わせ Composed チャート
 * デッドクロスの発生ポイントを視覚的に捉えられる美麗グラフ
 */
export const DepreciationChart: React.FC<DepreciationChartProps> = ({ data, deadCrossYear }) => {
    // デッドクロス発生年度のデータを特定して交差ドットを打つ
    const deadCrossRow = deadCrossYear 
        ? data.find(r => r.year === deadCrossYear) 
        : null;

    const totalYears = data.length > 0 ? data[data.length - 1].year : 35;
    // 日本語コメント: デッドクロス突入地点の横方向の割合(%)を計算し、グラデーション位置にマッピング
    const deadCrossPercent = deadCrossYear 
        ? Math.min(100, Math.max(0, (deadCrossYear / totalYears) * 100))
        : 100;

    return (
        <div className="w-full h-80 bg-[#fcf9f2] rounded-2xl border border-[#ebd9c5] p-4 shadow-sm relative">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 25, right: 30, left: 15, bottom: 5 }}>
                    <defs>
                        {/* 建物本体用の美しいブロンズブラウン・グラデーション */}
                        <linearGradient id="colorBuilding" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8c6114" stopOpacity={0.35}/>
                            <stop offset="95%" stopColor="#8c6114" stopOpacity={0.0}/>
                        </linearGradient>
                        {/* 設備用の美しい淡ゴールド・シャンパングラデーション */}
                        <linearGradient id="colorEquipment" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#d4af37" stopOpacity={0.35}/>
                            <stop offset="95%" stopColor="#d4af37" stopOpacity={0.0}/>
                        </linearGradient>
                        {/* 日本語コメント: デッドクロス安全期（ゴールドベージュ）から危険期（サビ朱色）へのシームレス横グラデーション背景 */}
                        <linearGradient id="deadCrossBg" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#d4af37" stopOpacity={0.03}/>
                            <stop offset={`${Math.max(0, deadCrossPercent - 8)}%`} stopColor="#d4af37" stopOpacity={0.03}/>
                            <stop offset={`${Math.min(100, deadCrossPercent + 2)}%`} stopColor="#a30000" stopOpacity={0.06}/>
                            <stop offset="100%" stopColor="#a30000" stopOpacity={0.06}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ebd9c5/40" />
                    <XAxis 
                        dataKey="year" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        stroke="#8c6c59"
                        label={{ value: '経過年数 (年)', position: 'insideBottomRight', offset: -10, fontSize: 10, fill: '#8c6c59' }}
                    />
                    <YAxis 
                        tickFormatter={(val) => `${val / 10000}万円`} 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        width={70} 
                        stroke="#8c6c59"
                    />
                    <Tooltip 
                        isAnimationActive={false}
                        useTranslate3d={true}
                        formatter={(value: any, name: any) => [formatCurrency(Number(value)), name]} 
                        contentStyle={{ 
                            borderRadius: '16px', 
                            border: '1px solid #ebd9c5', 
                            boxShadow: '0 10px 15px -3px rgba(43, 23, 14, 0.1)', 
                            backdropFilter: 'blur(8px)', 
                            backgroundColor: 'rgba(253, 250, 245, 0.95)',
                            color: '#23150d'
                        }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: '#23150d' }} />
                    
                    {/* 日本語コメント: チャート全体の背景にシームレスな安全・危険判定のグラデーションを適用 */}
                    <ReferenceArea 
                        x1={1} 
                        x2={totalYears} 
                        fill="url(#deadCrossBg)" 
                        stroke="none"
                        zIndex={-1}
                    />

                    {/* 建物本体の減価償却費 (積層面グラフ) */}
                    <Area 
                        type="monotone" 
                        dataKey="depreciationBuilding" 
                        stackId="depr"
                        name="建物本体 減価償却" 
                        stroke="#8c6114" 
                        strokeWidth={2}
                        fill="url(#colorBuilding)" 
                    />

                    {/* 建物附属設備の減価償却費 (積層面グラフ) */}
                    <Area 
                        type="monotone" 
                        dataKey="depreciationEquipment" 
                        stackId="depr"
                        name="建物附属設備 減価償却" 
                        stroke="#d4af37" 
                        strokeWidth={2}
                        fill="url(#colorEquipment)" 
                    />
                    
                    {/* ローン元金返済額 (折れ線グラフ: エスプレッソ) */}
                    <Line 
                        type="monotone" 
                        dataKey="principal" 
                        name="ローン元金返済額 (経費外支出)" 
                        stroke="#23150d" 
                        strokeWidth={3} 
                        dot={false}
                        activeDot={{ r: 6 }} 
                    />

                    {/* デッドクロス交差補助線 (点線: 上品なダークレッド) */}
                    {deadCrossYear && (
                        <ReferenceLine 
                            x={deadCrossYear} 
                            stroke="#a30000" 
                            strokeWidth={1.5}
                            strokeDasharray="4 4" 
                            label={{ value: `⚠️ デッドクロス突入 (${deadCrossYear}年目)`, position: 'top', fill: '#a30000', fontSize: 10, fontWeight: 'extrabold' }} 
                        />
                    )}

                    {/* デッドクロス交差年度の強調ドット (ダークレッド) */}
                    {deadCrossRow && (
                        <ReferenceDot 
                            x={deadCrossRow.year} 
                            y={deadCrossRow.depreciation} 
                            r={7} 
                            fill="#a30000" 
                            stroke="#ffffff" 
                            strokeWidth={2.5} 
                        />
                    )}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};
