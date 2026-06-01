import React from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceDot } from 'recharts';
import { formatCurrency } from '../../utils/formatters';

interface ChartRow {
    year: number;
    depreciation: number;
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
                        {/* 減価償却費エリア用の美しいパープルグラデーション */}
                        <linearGradient id="colorDepr" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#818cf8" stopOpacity={0.35}/>
                            <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0}/>
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
                    
                    {/* 減価償却費 (面グラフ: 半透明パープル) */}
                    <Area 
                        type="monotone" 
                        dataKey="depreciation" 
                        name="減価償却費 (支出なし経費)" 
                        stroke="#6366f1" 
                        strokeWidth={2.5} 
                        fill="url(#colorDepr)" 
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

                    {/* デッドクロス交差補助線 (点線: 赤) */}
                    {deadCrossYear && (
                        <ReferenceLine 
                            x={deadCrossYear} 
                            stroke="#f43f5e" 
                            strokeDasharray="4 4" 
                            label={{ value: `デッドクロス (${deadCrossYear}年目)`, position: 'top', fill: '#f43f5e', fontSize: 10, fontWeight: 'bold' }} 
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
