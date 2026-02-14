import React from 'react';
import type { AnnualData } from '../../utils/simulationProjection';
import { formatCurrency } from '../../utils/formatters';

interface CashFlowPageProps {
    projection: AnnualData[];
    startYear: number;
    endYear: number;
    pageNumber: number;
}

export const CashFlowPage: React.FC<CashFlowPageProps> = ({ projection, startYear, endYear, pageNumber }) => {
    const sliceData = projection.filter(d => d.year >= startYear && d.year <= endYear);

    return (
        <div className="report-page flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-end mb-5 border-b-2 border-blue-600 pb-2 flex-shrink-0">
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Cashflow Details</h2>
                <p className="text-blue-400 text-[10px] uppercase tracking-widest">Page 0{pageNumber} — Year {startYear}–{endYear}</p>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
                <table className="w-full text-[10px] text-right border-collapse">
                    <thead>
                        <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[9px] uppercase tracking-wider">
                            <th className="py-2 px-2 text-center border-r border-blue-500/30 w-8 rounded-tl-lg">Yr</th>
                            <th className="py-2 px-1 border-r border-blue-500/30">Gross</th>
                            <th className="py-2 px-1 border-r border-blue-500/30">Vacancy</th>
                            <th className="py-2 px-1 border-r border-blue-500/30 bg-blue-700/30">EGI</th>
                            <th className="py-2 px-1 border-r border-blue-500/30">OPEX</th>
                            <th className="py-2 px-1 border-r border-blue-500/30 bg-blue-700/30">NOI</th>
                            <th className="py-2 px-1 border-r border-blue-500/30">ADS</th>
                            <th className="py-2 px-1 border-r border-blue-500/30 bg-blue-700/30 font-bold">BTCF</th>
                            <th className="py-2 px-1 border-r border-blue-500/30 text-blue-200">Loan Bal</th>
                            <th className="py-2 px-1 text-emerald-200 rounded-tr-lg">Acc. CF</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sliceData.map((row, i) => {
                            const isHighlight = row.year % 5 === 0;
                            return (
                                <tr key={row.year} className={`font-mono border-b border-slate-100 ${i % 2 !== 0 ? 'bg-blue-50/40' : 'bg-white'} ${isHighlight ? '!bg-blue-100/60 font-semibold' : ''}`}>
                                    <td className="py-1.5 px-2 text-center text-blue-600 border-r border-slate-100 font-bold tabular-nums">{row.year}</td>
                                    <td className="py-1.5 px-1 border-r border-slate-100 text-slate-600 tabular-nums">{formatCurrency(row.grossIncome)}</td>
                                    <td className="py-1.5 px-1 border-r border-slate-100 text-rose-400 tabular-nums">{formatCurrency(row.lostIncome)}</td>
                                    <td className="py-1.5 px-1 border-r border-slate-100 text-blue-700 bg-blue-50/30 tabular-nums">{formatCurrency(row.effectiveIncome)}</td>
                                    <td className="py-1.5 px-1 border-r border-slate-100 text-amber-600 tabular-nums">{formatCurrency(row.opex)}</td>
                                    <td className="py-1.5 px-1 border-r border-slate-100 text-blue-700 bg-blue-50/30 tabular-nums">{formatCurrency(row.noi)}</td>
                                    <td className="py-1.5 px-1 border-r border-slate-100 text-violet-500 tabular-nums">{formatCurrency(row.tmT)}</td>
                                    <td className="py-1.5 px-1 border-r border-slate-100 font-bold text-emerald-700 bg-emerald-50/30 tabular-nums">{formatCurrency(row.btcf)}</td>
                                    <td className="py-1.5 px-1 border-r border-slate-100 text-slate-400 tabular-nums">{formatCurrency(row.loanBalance)}</td>
                                    <td className="py-1.5 px-1 text-emerald-600 tabular-nums">{formatCurrency(row.accumulatedCashFlow)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
