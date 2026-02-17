import React from 'react';
import type { SimulationData } from '../../stores/useSimulationStore';
import { formatCurrency } from '../../utils/formatters';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface IncomeExpensePageProps {
    data: SimulationData;
    expenseData: { name: string; value: number }[];
}

export const IncomeExpensePage: React.FC<IncomeExpensePageProps> = ({ data, expenseData }) => {
    const COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899']; // Blue, Cyan, Violet, Amber, Pink

    const totalMonthlyRent = data.rentRoll.roomTypes.reduce((acc, r) => acc + (r.rent + r.commonFee) * r.count, 0);
    const totalMonthlyParking = data.rentRoll.parkingCount * data.rentRoll.parkingFee;
    const monthlyGrossRevenue = totalMonthlyRent + totalMonthlyParking;

    const landCost = data.budget.landPrice * 10000;
    const buildingCost = (data.budget.demolitionCost + data.budget.buildingWorksCost) * 10000;
    const initialCost = (data.budget.stampDuty + data.budget.registrationTax + data.budget.acquisitionTax + data.budget.fireInsurancePrepaid + data.budget.waterContribution + data.budget.brokerageFee + data.budget.otherInitialCost + data.budget.constructionInterest) * 10000;
    const totalCost = landCost + buildingCost + initialCost;

    const budgetData = [
        { name: '土地', value: landCost },
        { name: '建物', value: buildingCost },
        { name: '諸経費', value: initialCost },
    ].filter(d => d.value > 0);

    return (
        <div className="report-page flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-end mb-6 border-b-2 border-blue-600 pb-2 flex-shrink-0">
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">収支詳細</h2>
                <p className="text-blue-400 text-[10px] uppercase tracking-widest">Page 03 — 収入と支出</p>
            </div>

            <div className="grid grid-cols-2 gap-12 flex-1 min-h-0">
                {/* Left: Investment Breakdown */}
                <div className="flex flex-col">
                    <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        初期投資内訳
                    </h3>

                    <div className="flex items-center gap-6 mb-4">
                        <div className="w-32 h-32 flex-shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={budgetData} cx="50%" cy="50%" innerRadius={25} outerRadius={55} paddingAngle={3} dataKey="value" isAnimationActive={false} stroke="none">
                                        {budgetData.map((_e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex-1 text-xs space-y-2">
                            {budgetData.map((d, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: COLORS[i] }}></span>
                                    <span className="text-slate-500 flex-1">{d.name}</span>
                                    <span className="font-mono font-medium text-slate-700">{formatCurrency(d.value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 flex justify-between items-center">
                        <span className="font-bold text-blue-800 text-xs uppercase">総事業費</span>
                        <span className="font-extrabold text-blue-800 font-mono text-base">{formatCurrency(totalCost)}</span>
                    </div>
                </div>

                {/* Right: Running Costs */}
                <div className="flex flex-col">
                    <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        年間収支詳細 (満室時)
                    </h3>

                    {/* Income */}
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg px-4 py-3 mb-5">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[9px] text-emerald-500 uppercase tracking-wider font-medium">満室想定年収 (GPI)</p>
                                <p className="text-xs text-emerald-400 mt-0.5">月額: {formatCurrency(monthlyGrossRevenue)}</p>
                            </div>
                            <p className="text-xl font-extrabold text-emerald-700">{formatCurrency(monthlyGrossRevenue * 12)}</p>
                        </div>
                    </div>

                    {/* Expenses */}
                    <div className="flex items-start gap-6 mb-4">
                        <div className="w-28 h-28 flex-shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={expenseData} cx="50%" cy="50%" innerRadius={20} outerRadius={48} paddingAngle={3} dataKey="value" isAnimationActive={false} stroke="none">
                                        {expenseData.map((_e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex-1 text-[11px] space-y-1.5">
                            {expenseData.map((e, i) => (
                                <div key={i} className="flex items-center gap-2 py-0.5 border-b border-slate-100 last:border-0">
                                    <span className="w-2.5 h-2.5 rounded flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                                    <span className="text-slate-500 flex-1">{e.name}</span>
                                    <span className="font-mono text-slate-600 text-[10px]">{formatCurrency(e.value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex justify-between items-center mt-auto">
                        <span className="font-bold text-amber-800 text-xs uppercase">運営費合計 (OPEX)</span>
                        <span className="font-extrabold text-amber-800 font-mono text-base">
                            {formatCurrency(expenseData.reduce((acc, c) => acc + c.value, 0))}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
