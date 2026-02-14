import React from 'react';
import type { SimulationData } from '../../stores/useSimulationStore';
import { formatCurrency, formatPercent } from '../../utils/formatters';

interface ExecutiveSummaryPageProps {
    data: SimulationData;
    kpi: {
        grossYield: number;
        netYield: number;
        beforeTaxCashFlow: number;
        totalBudgetYen: number;
    };
}

export const ExecutiveSummaryPage: React.FC<ExecutiveSummaryPageProps> = ({ data, kpi }) => {
    return (
        <div className="report-page flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-end mb-6 border-b-2 border-blue-600 pb-2 flex-shrink-0">
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Executive Summary</h2>
                <p className="text-blue-400 text-[10px] uppercase tracking-widest">Page 02 — Investment Overview</p>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-4 gap-4 mb-6 flex-shrink-0">
                <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                    <p className="text-[9px] font-bold text-blue-500 uppercase tracking-wider">Gross Yield</p>
                    <p className="text-3xl font-extrabold text-blue-700 mt-1">{formatPercent(kpi.grossYield)}</p>
                    <p className="text-[9px] text-blue-400 mt-0.5">表面利回り</p>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
                    <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">NOI Yield</p>
                    <p className="text-3xl font-extrabold text-emerald-600 mt-1">{formatPercent(kpi.netYield)}</p>
                    <p className="text-[9px] text-emerald-400 mt-0.5">実質利回り</p>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
                    <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">Annual BTCF</p>
                    <p className="text-2xl font-bold text-amber-700 mt-1 leading-tight">{formatCurrency(kpi.beforeTaxCashFlow)}</p>
                    <p className="text-[9px] text-amber-400 mt-0.5">税引前キャッシュフロー</p>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200">
                    <p className="text-[9px] font-bold text-violet-500 uppercase tracking-wider">Total Investment</p>
                    <p className="text-2xl font-bold text-violet-700 mt-1 leading-tight">{formatCurrency(kpi.totalBudgetYen)}</p>
                    <p className="text-[9px] text-violet-400 mt-0.5">総事業費</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-2 gap-10 flex-1 min-h-0">
                {/* Funding Plan */}
                <div>
                    <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        Funding Structure
                    </h3>
                    <div className="space-y-0 text-sm">
                        <div className="flex justify-between py-2.5 border-b border-dashed border-slate-200">
                            <span className="text-slate-500">自己資金 (Equity)</span>
                            <span className="font-bold text-slate-700 font-mono text-xs">{formatCurrency(data.funding.ownCapital * 10000)}</span>
                        </div>
                        <div className="flex justify-between py-2.5 border-b border-dashed border-slate-200">
                            <span className="text-slate-500">借入金 (Debt)</span>
                            <span className="font-bold text-slate-700 font-mono text-xs">
                                {formatCurrency(data.funding.loans.reduce((acc, l) => acc + l.amount, 0) * 10000)}
                            </span>
                        </div>
                        <div className="flex justify-between py-2.5 border-b border-slate-200">
                            <span className="text-slate-500">その他 (Other)</span>
                            <span className="font-bold text-slate-700 font-mono text-xs">
                                {formatCurrency((data.funding.cooperationMoney + data.funding.securityDepositIn) * 10000)}
                            </span>
                        </div>
                        <div className="flex justify-between py-3 bg-blue-50 px-3 -mx-1 mt-1 rounded-lg border border-blue-100">
                            <span className="font-bold text-blue-800 text-xs uppercase">Total</span>
                            <span className="font-extrabold text-blue-800 font-mono">{formatCurrency(kpi.totalBudgetYen)}</span>
                        </div>
                    </div>
                </div>

                {/* Loan Details */}
                <div>
                    <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        Loan Conditions
                    </h3>
                    <table className="w-full text-xs text-left">
                        <thead>
                            <tr className="text-[9px] text-blue-400 uppercase border-b border-blue-100">
                                <th className="py-2 font-medium">Name</th>
                                <th className="py-2 text-right font-medium">Amount</th>
                                <th className="py-2 text-right font-medium">Rate</th>
                                <th className="py-2 text-right font-medium">Term</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.funding.loans.map((loan, i) => (
                                <tr key={i}>
                                    <td className="py-2.5 text-slate-700 font-medium">{loan.name}</td>
                                    <td className="py-2.5 text-right font-mono text-slate-600">{formatCurrency(loan.amount * 10000)}</td>
                                    <td className="py-2.5 text-right font-mono text-slate-600">{loan.rate}%</td>
                                    <td className="py-2.5 text-right font-mono text-slate-600">{loan.duration}年</td>
                                </tr>
                            ))}
                            {data.funding.loans.length === 0 && (
                                <tr><td colSpan={4} className="py-4 text-center text-slate-400 italic text-[10px]">No loans configured</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-4 border-t border-blue-100 text-[9px] text-slate-400 flex justify-between flex-shrink-0">
                <span>前提: 家賃下落率 {data.advancedSettings?.rentDeclineRate ?? 1.0}%/年 ｜ 空室率上昇 {data.advancedSettings?.vacancyRiseRate ?? 0.5}%/年</span>
                <span>CONFIDENTIAL</span>
            </div>
        </div>
    );
};
