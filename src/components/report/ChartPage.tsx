import React from 'react';
import type { AnnualData } from '../../utils/simulationProjection';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area, ReferenceLine } from 'recharts';

interface ChartPageProps {
    projectionData: AnnualData[];
}

export const ChartPage: React.FC<ChartPageProps> = ({ projectionData }) => {
    return (
        <div className="report-page flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-end mb-5 border-b-2 border-blue-600 pb-2 flex-shrink-0">
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">長期収支シミュレーション</h2>
                <p className="text-blue-400 text-[10px] uppercase tracking-widest">Page 04 — 35年推移</p>
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

            {/* Sub Charts */}
            <div className="h-32 grid grid-cols-2 gap-4 flex-shrink-0">
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-3 flex flex-col">
                    <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider mb-1">累積キャッシュフロー</p>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={projectionData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1fae5" />
                                <XAxis dataKey="year" fontSize={8} tickLine={false} axisLine={false} />
                                <YAxis tickFormatter={(val) => `${val / 10000}万`} width={32} fontSize={8} tickLine={false} axisLine={false} />
                                <ReferenceLine y={0} stroke="#6ee7b7" />
                                <Area type="monotone" dataKey="accumulatedCashFlow" stroke="#059669" fill="#34d399" fillOpacity={0.2} isAnimationActive={false} strokeWidth={1.5} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="rounded-lg border border-violet-100 bg-violet-50/30 p-3 flex flex-col">
                    <p className="text-[9px] font-bold text-violet-500 uppercase tracking-wider mb-1">ローン残債推移</p>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={projectionData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ede9fe" />
                                <XAxis dataKey="year" fontSize={8} tickLine={false} axisLine={false} />
                                <YAxis tickFormatter={(val) => `${val / 10000}万`} width={32} fontSize={8} tickLine={false} axisLine={false} />
                                <Area type="monotone" dataKey="loanBalance" stroke="#7c3aed" fill="#a78bfa" fillOpacity={0.2} isAnimationActive={false} strokeWidth={1.5} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
