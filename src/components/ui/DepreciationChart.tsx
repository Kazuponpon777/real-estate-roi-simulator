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
    depreciationBuilding?: number;  // [修正] 改善提案部の指摘: 建物本体の減価償却費
    depreciationEquipment?: number; // [修正] 改善提案部の指摘: 設備の減価償却費
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

    return (
        <div className="w-full h-80 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 25, right: 30, left: 15, bottom: 5 }}>
                    <defs>
                        {/* 建物本体用の美しいパープルグラデーション */}
                        <linearGradient id="colorBuilding" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#818cf8" stopOpacity={0.35}/>
                            <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0}/>
                        </linearGradient>
                        {/* 設備用の美しいエメラルドグリーン・グラデーション */}
                        <linearGradient id="colorEquipment" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                        dataKey="year" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        label={{ value: '経過年数 (年)', position: 'insideBottomRight', offset: -10, fontSize: 10, fill: '#94a3b8' }}
                    />
                    <YAxis 
                        tickFormatter={(val) => `${val / 10000}万円`} 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        width={70} 
                        stroke="#94a3b8"
                    />
                    <Tooltip 
                        formatter={(value: any, name: any) => [formatCurrency(Number(value)), name]} 
                        contentStyle={{ 
                            borderRadius: '16px', 
                            border: '1px solid #e2e8f0', 
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', 
                            backdropFilter: 'blur(8px)', 
                            backgroundColor: 'rgba(255, 255, 255, 0.95)' 
                        }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    
                    {/* 建物本体の減価償却費 (積層面グラフ) */}
                    <Area 
                        type="monotone" 
                        dataKey="depreciationBuilding" 
                        stackId="depr"
                        name="建物本体 減価償却" 
                        stroke="#6366f1" 
                        strokeWidth={2}
                        fill="url(#colorBuilding)" 
                    />

                    {/* 建物附属設備の減価償却費 (積層面グラフ) */}
                    <Area 
                        type="monotone" 
                        dataKey="depreciationEquipment" 
                        stackId="depr"
                        name="建物附属設備 減価償却" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        fill="url(#colorEquipment)" 
                    />
                    
                    {/* ローン元金返済額 (折れ線グラフ: ゴールド) */}
                    <Line 
                        type="monotone" 
                        dataKey="principal" 
                        name="ローン元金返済額 (経費外支出)" 
                        stroke="#eab308" 
                        strokeWidth={3} 
                        dot={false}
                        activeDot={{ r: 6 }} 
                    />

                    {/* デッドクロス発生後の危険ゾーン背景シェーディング (ソフトレッドでゾーニング) */}
                    {deadCrossYear && (
                        <ReferenceArea 
                            x1={deadCrossYear} 
                            x2={data[data.length - 1]?.year} 
                            fill="#f43f5e" 
                            fillOpacity={0.06} 
                            stroke="none"
                        />
                    )}

                    {/* デッドクロス交差補助線 (点線: 赤) */}
                    {deadCrossYear && (
                        <ReferenceLine 
                            x={deadCrossYear} 
                            stroke="#f43f5e" 
                            strokeWidth={1.5}
                            strokeDasharray="4 4" 
                            label={{ value: `⚠️ デッドクロス突入 (${deadCrossYear}年目)`, position: 'top', fill: '#e11d48', fontSize: 10, fontWeight: 'extrabold' }} 
                        />
                    )}

                    {/* デッドクロス交差年度の強調ドット (赤) */}
                    {deadCrossRow && (
                        <ReferenceDot 
                            x={deadCrossRow.year} 
                            y={deadCrossRow.depreciation} 
                            r={7} 
                            fill="#f43f5e" 
                            stroke="#ffffff" 
                            strokeWidth={2.5} 
                        />
                    )}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};
