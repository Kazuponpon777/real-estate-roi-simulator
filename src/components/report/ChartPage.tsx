import React from 'react';
import type { AnnualData } from '../../utils/simulationProjection';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Legend, ReferenceLine } from 'recharts';

interface ChartPageProps {
    projectionData: AnnualData[];
    pageNumber?: number;
}

export const ChartPage: React.FC<ChartPageProps> = ({ projectionData, pageNumber }) => {
    // 手残り累計がローン残高を上回る「実質完済可能年（損益分岐）」と ローン完済年の計算
    const paybackYear = projectionData.find(p => p.accumulatedCashFlow >= p.loanBalance && p.year > 0)?.year ?? null;
    const loanFinishYear = projectionData.find(p => p.loanBalance === 0 && p.year > 0)?.year ?? null;

    return (
        <div className="report-page flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-end mb-5 border-b-2 border-blue-600 pb-2 flex-shrink-0">
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">長期収支シミュレーション</h2>
                <p className="text-blue-400 text-[10px] uppercase tracking-widest">Page 0{pageNumber || 5} — 35年推移</p>
            </div>

            {/* Main Chart */}
            <div className="flex-1 min-h-0 flex flex-col mb-4">
                <p className="text-[9px] font-bold text-blue-500 uppercase tracking-wider mb-2">収支と返済の推移</p>
                <div className="flex-1 min-h-0 bg-blue-50/30 rounded-lg border border-blue-100 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={projectionData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e7ff" />
                            <XAxis dataKey="year" fontSize={9} tickLine={false} axisLine={false} />
                            <YAxis yAxisId="left" tickFormatter={(val) => `${val / 10000}万`} fontSize={9} tickLine={false} axisLine={false} width={36} />
                            <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '4px' }} iconSize={7} />
                            <Bar yAxisId="left" dataKey="effectiveIncome" name="EGI" fill="#60a5fa" radius={[2, 2, 0, 0]} barSize={10} isAnimationActive={false} />
                            <Bar yAxisId="left" dataKey="opex" name="OPEX" stackId="a" fill="#fbbf24" isAnimationActive={false} />
                            <Bar yAxisId="left" dataKey="tmT" name="ADS" stackId="a" fill="#c084fc" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                            <Line yAxisId="left" type="monotone" dataKey="btcf" name="BTCF" stroke="#059669" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Sub Chart: 投資回収・損益分岐 (累積CF vs ローン残債) */}
            <div className="h-32 flex flex-col flex-shrink-0 mt-2">
                <p className="text-[9px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    投資回収・損益分岐 (累積手残り vs ローン残高) — 実質完済可能年: {paybackYear ? `${paybackYear}年目` : '35年超'}
                </p>
                <div className="flex-1 min-h-0 bg-slate-50 border border-slate-200 rounded-lg p-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={projectionData} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="year" fontSize={8} tickLine={false} axisLine={false} />
                            <YAxis tickFormatter={(val) => `${val / 10000}万`} width={32} fontSize={8} tickLine={false} axisLine={false} />
                            <Legend wrapperStyle={{ fontSize: '8px', paddingTop: '2px' }} iconSize={6} />
                            <ReferenceLine y={0} stroke="#cbd5e1" />
                            {paybackYear && (
                                <ReferenceLine 
                                    x={paybackYear} 
                                    stroke="#dc2626" 
                                    strokeDasharray="3 3" 
                                    strokeWidth={1.5} 
                                    label={{ 
                                        value: `損益分岐: ${paybackYear}年`, 
                                        position: 'insideTopLeft', 
                                        fill: '#dc2626', 
                                        fontSize: 8, 
                                        fontWeight: 'bold' 
                                    }} 
                                />
                            )}
                            {loanFinishYear && (
                                <ReferenceLine 
                                    x={loanFinishYear} 
                                    stroke="#2563eb" 
                                    strokeDasharray="3 3" 
                                    strokeWidth={1.5} 
                                    label={{ 
                                        value: `完済: ${loanFinishYear}年`, 
                                        position: 'insideTopRight', 
                                        fill: '#2563eb', 
                                        fontSize: 8, 
                                        fontWeight: 'bold' 
                                    }} 
                                />
                            )}
                            <Line type="monotone" dataKey="loanBalance" name="ローン残高" stroke="#8c6114" strokeWidth={2} dot={false} isAnimationActive={false} />
                            <Line type="monotone" dataKey="accumulatedCashFlow" name="累積手残り(CF)" stroke="#1e3d2f" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
