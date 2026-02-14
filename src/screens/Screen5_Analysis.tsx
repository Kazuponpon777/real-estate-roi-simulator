import React, { useMemo } from 'react';
import { useSimulationStore } from '../stores/useSimulationStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ArrowLeft, FileText, Download, Upload, Save, FileJson, LineChart as LineChartIcon, TrendingUp } from 'lucide-react';
import { calculatePmt } from '../utils/calculations';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { downloadCSV } from '../utils/csvExport';
import { saveProjectJSON, loadProjectJSON, importCSV } from '../utils/fileHandler';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ComposedChart, Line, AreaChart, Area, Legend, ReferenceLine } from 'recharts';
import { calculateLongTermProjection, getInvestmentMetrics } from '../utils/simulationProjection';
import { Slider } from '../components/ui/Slider';
import { PrintLayout } from '../components/PrintLayout';

// New Landscape Report Components
import { ReportCover } from '../components/report/ReportCover';
import { ExecutiveSummaryPage } from '../components/report/ExecutiveSummaryPage';
import { IncomeExpensePage } from '../components/report/IncomeExpensePage';
import { ChartPage } from '../components/report/ChartPage';
import { CashFlowPage } from '../components/report/CashFlowPage';

export const Screen5_Analysis: React.FC = () => {
    const { data, updateData, prevStep } = useSimulationStore();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const csvInputRef = React.useRef<HTMLInputElement>(null);

    const projectionData = useMemo(() => calculateLongTermProjection(data), [data]);

    const handleLoadJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const loadedData = await loadProjectJSON(file);
            updateData(loadedData);
            alert('プロジェクトを読み込みました');
        } catch (err) {
            console.error(err);
            alert('ファイルの読み込みに失敗しました');
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const newData = await importCSV(file, data);
            updateData(newData);
            alert('CSVデータをインポートしました');
        } catch (err) {
            console.error(err);
            alert('CSVの読み込みに失敗しました');
        }
        if (csvInputRef.current) csvInputRef.current.value = '';
    };

    // --- Calculations ---

    // 1. Total Investment
    const totalBudget =
        data.budget.landPrice +
        data.budget.demolitionCost +
        data.budget.buildingWorksCost +
        data.budget.stampDuty +
        data.budget.registrationTax +
        data.budget.acquisitionTax +
        data.budget.fireInsurancePrepaid +
        data.budget.waterContribution +
        data.budget.brokerageFee +
        data.budget.otherInitialCost +
        data.budget.constructionInterest;

    const totalBudgetYen = totalBudget * 10000;

    // 2. Income
    const totalMonthlyRent = data.rentRoll.roomTypes.reduce((acc, r) => acc + (r.rent + r.commonFee) * r.count, 0);
    const totalMonthlyParking = data.rentRoll.parkingCount * data.rentRoll.parkingFee;
    const monthlyGrossIncome = totalMonthlyRent + totalMonthlyParking; // Assuming 100% occupancy for Potential Gross
    const annualPotentialGrossIncome = (monthlyGrossIncome + data.rentRoll.otherRevenue) * 12;

    // Effective Gross Income (EGI)
    const vacancyLoss = annualPotentialGrossIncome * (data.rentRoll.occupancyRate ? (100 - data.rentRoll.occupancyRate) / 100 : 0.05);
    const effectiveGrossIncome = annualPotentialGrossIncome - vacancyLoss;

    // 3. Operating Expenses (OPEX)

    // Management Fee
    let annualManagementFee = 0;
    if (data.expenses.managementFeeMode === 'ratio') {
        annualManagementFee = effectiveGrossIncome * (data.expenses.managementFeeRatio / 100);
    } else {
        annualManagementFee = data.expenses.managementFeeFixed * 12;
    }

    // Other monthly to annual
    const annualBuildingMaintenance = data.expenses.buildingMaintenance * 12;
    const annualMaintenanceReserve = data.expenses.maintenanceReserve * 12; // Assuming input is monthly total

    const annualTaxes =
        data.expenses.fixedAssetTaxLand +
        data.expenses.cityPlanningTaxLand +
        data.expenses.fixedAssetTaxBuilding +
        data.expenses.cityPlanningTaxBuilding;

    const totalOpex =
        annualManagementFee +
        annualBuildingMaintenance +
        annualMaintenanceReserve +
        annualTaxes +
        data.expenses.fireInsuranceAnnual +
        data.expenses.otherExpenses;

    // 4. Net Operating Income (NOI)
    const noi = effectiveGrossIncome - totalOpex;

    // 5. Debt Service (ADS)
    let annualDebtService = 0;
    data.funding.loans.forEach(loan => {
        const pmt = calculatePmt(loan.amount * 10000, loan.rate, loan.duration);
        annualDebtService += pmt * 12;
    });

    // 6. Cash Flow
    const beforeTaxCashFlow = noi - annualDebtService;

    // 7. Yields
    const grossYield = totalBudgetYen > 0 ? (annualPotentialGrossIncome / totalBudgetYen) * 100 : 0;
    const netYield = totalBudgetYen > 0 ? (noi / totalBudgetYen) * 100 : 0;

    // Investment Metrics
    const investmentMetrics = useMemo(() => getInvestmentMetrics(data, projectionData), [data, projectionData]);


    // --- Chart Data ---
    const expenseData = [
        { name: '管理費', value: annualManagementFee },
        { name: 'BM・清掃', value: annualBuildingMaintenance },
        { name: '修繕積立', value: annualMaintenanceReserve },
        { name: '固都税', value: annualTaxes },
        { name: 'その他', value: data.expenses.fireInsuranceAnnual + data.expenses.otherExpenses },
    ];

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in pb-20">
            <div className="flex items-center justify-between no-print">
                <h2 className="text-2xl font-bold text-slate-800">収支分析結果 (Analysis)</h2>
                <div className="flex gap-2">
                    <PrintLayout>
                        {/* Page 1: Cover */}
                        <ReportCover data={data} />
                        {/* Page 2: Executive Summary */}
                        <ExecutiveSummaryPage data={data} kpi={{ grossYield, netYield, beforeTaxCashFlow, totalBudgetYen }} />
                        {/* Page 3: Income & Expenses */}
                        <IncomeExpensePage data={data} expenseData={expenseData} />
                        {/* Page 4: Long-term Analysis */}
                        <ChartPage projectionData={projectionData} />
                        {/* Page 5: Cash Flow (1-20 years) */}
                        <CashFlowPage projection={projectionData} startYear={1} endYear={20} pageNumber={5} />
                        {/* Page 6: Cash Flow (21-35 years) */}
                        <CashFlowPage projection={projectionData} startYear={21} endYear={35} pageNumber={6} />
                    </PrintLayout>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Data Management */}
                <Card className="md:col-span-3 border-none bg-white/50 backdrop-blur-sm no-print">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Save className="h-5 w-5 text-indigo-600" />
                                データ管理
                            </h3>
                            <p className="text-sm text-slate-500">シミュレーション保存、読み込み、エクスポート</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {/* Hidden Inputs */}
                            <input type="file" ref={fileInputRef} onChange={handleLoadJSON} accept=".json" className="hidden" />
                            <input type="file" ref={csvInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />

                            <Button variant="outline" onClick={() => saveProjectJSON(data)} className="flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                                <FileJson className="h-4 w-4" /> プロジェクト保存
                            </Button>
                            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 border-slate-200">
                                <Upload className="h-4 w-4" /> プロジェクト読込
                            </Button>
                            <div className="w-px h-8 bg-slate-300 mx-1 hidden md:block"></div>
                            <Button variant="outline" onClick={() => downloadCSV(data)} className="flex items-center gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                                <FileText className="h-4 w-4" /> CSVエクスポート
                            </Button>
                            <Button variant="outline" onClick={() => csvInputRef.current?.click()} className="flex items-center gap-2 border-slate-200">
                                <Download className="h-4 w-4" /> CSVインポート
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* KPIS */}
                <Card className="md:col-span-3 border-emerald-100 !bg-white !bg-none shadow-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        <div>
                            <p className="text-slate-500 text-sm font-bold uppercase">表面利回り</p>
                            <p className="text-4xl font-extrabold mt-2 text-indigo-600">{formatPercent(grossYield)}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 text-sm font-bold uppercase">実質利回り (NOI)</p>
                            <p className="text-4xl font-extrabold mt-2 text-emerald-600">{formatPercent(netYield)}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 text-sm font-bold uppercase">年間手取り (BTCF)</p>
                            <p className="text-3xl font-bold mt-2 text-slate-800">{formatCurrency(beforeTaxCashFlow)}</p>
                        </div>
                        <div>
                            <p className="text-slate-500 text-sm font-bold uppercase">総事業費</p>
                            <p className="text-3xl font-bold mt-2 text-slate-800">{formatCurrency(totalBudgetYen)}</p>
                        </div>
                    </div>
                </Card>

                {/* Advanced Investment Metrics */}
                <Card className="md:col-span-3 border-blue-100 !bg-gradient-to-r from-slate-50 to-blue-50/30 !bg-none shadow-lg">
                    <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" /> 投資分析指標
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
                            <p className="text-slate-400 text-[10px] font-bold uppercase">IRR (税引後)</p>
                            <p className="text-2xl font-extrabold mt-1 text-indigo-600">
                                {investmentMetrics.irr !== null ? formatPercent(investmentMetrics.irr * 100) : 'N/A'}
                            </p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
                            <p className="text-slate-400 text-[10px] font-bold uppercase">DSCR (初年度)</p>
                            <p className={`text-2xl font-extrabold mt-1 ${investmentMetrics.year1Dscr >= 1.2 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {investmentMetrics.year1Dscr === Infinity ? '∞' : investmentMetrics.year1Dscr.toFixed(2)}倍
                            </p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
                            <p className="text-slate-400 text-[10px] font-bold uppercase">CCR (自己資金回収率)</p>
                            <p className="text-2xl font-extrabold mt-1 text-blue-600">
                                {formatPercent(investmentMetrics.year1Ccr * 100)}
                            </p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
                            <p className="text-slate-400 text-[10px] font-bold uppercase">投資回収期間</p>
                            <p className="text-2xl font-extrabold mt-1 text-amber-600">
                                {investmentMetrics.paybackYear ? `${investmentMetrics.paybackYear}年` : '35年超'}
                            </p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
                            <p className="text-slate-400 text-[10px] font-bold uppercase">BER (損益分岐稼働率)</p>
                            <p className={`text-2xl font-extrabold mt-1 ${investmentMetrics.ber <= 0.7 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {formatPercent(investmentMetrics.ber * 100)}
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Detailed Tables */}
                <Card title="年間収支詳細" className="md:col-span-2">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                            <span className="text-slate-600">満室想定年収</span>
                            <span className="text-lg font-bold">{formatCurrency(annualPotentialGrossIncome)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                            <span className="text-slate-600">空室損 ({100 - (data.rentRoll.occupancyRate || 100)}%)</span>
                            <span className="text-red-500 font-medium">▲ {formatCurrency(vacancyLoss)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100 bg-blue-50/50 px-2 -mx-2 rounded">
                            <span className="text-blue-900 font-bold">有効総収入 (EGI)</span>
                            <span className="text-xl font-bold text-blue-900">{formatCurrency(effectiveGrossIncome)}</span>
                        </div>

                        <div className="flex justify-between items-center py-2 border-b border-slate-100 pl-4 text-sm">
                            <span className="text-slate-500">運営費計 (OPEX)</span>
                            <span className="text-slate-700">▲ {formatCurrency(totalOpex)}</span>
                        </div>

                        <div className="flex justify-between items-center py-2 border-b border-slate-100 bg-indigo-50/50 px-2 -mx-2 rounded">
                            <span className="text-indigo-900 font-bold">営業純利益 (NOI)</span>
                            <span className="text-xl font-bold text-indigo-900">{formatCurrency(noi)}</span>
                        </div>

                        <div className="flex justify-between items-center py-2 border-b border-slate-100 pl-4 text-sm">
                            <span className="text-slate-500">年間返済額 (ADS)</span>
                            <span className="text-slate-700">▲ {formatCurrency(annualDebtService)}</span>
                        </div>

                        <div className="flex justify-between items-center py-3 bg-green-50 px-4 -mx-4 rounded-lg mt-2">
                            <span className="text-green-900 font-bold text-lg">税引前キャッシュフロー</span>
                            <span className="text-2xl font-bold text-green-700">{formatCurrency(beforeTaxCashFlow)}</span>
                        </div>
                    </div>
                </Card>

                {/* Charts */}
                <div className="space-y-6">
                    <Card title="支出内訳 (OPEX)">
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={expenseData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {expenseData.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number | undefined) => [formatCurrency(value || 0), '金額']} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-2 mt-4">
                            {expenseData.map((entry, index) => (
                                <div key={index} className="flex justify-between text-xs items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                        <span className="text-slate-600">{entry.name}</span>
                                    </div>
                                    <span className="font-medium">{formatCurrency(entry.value)}</span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card title="返済後手残り">
                        <div className="h-40 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[{ name: 'CF', flow: beforeTaxCashFlow }]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" hide />
                                    <YAxis hide />
                                    <Tooltip formatter={(value: number | undefined) => [formatCurrency(value || 0), '金額']} />
                                    <Bar dataKey="flow" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Sensitivity Analysis */}
            <div className="space-y-6 mt-12 bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                    シミュレーション条件 (感度分析)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Slider
                        label="家賃下落率 (年率)"
                        value={data.advancedSettings?.rentDeclineRate ?? 1.0}
                        min={0}
                        max={5.0}
                        step={0.1}
                        onChange={(val) => updateData({ advancedSettings: { ...data.advancedSettings, rentDeclineRate: val } })}
                        unit="%"
                        description="年間の家賃下落率。1%の場合、毎年家賃収入が1%ずつ減少します。"
                    />
                    <Slider
                        label="空室率上昇 (年率)"
                        value={data.advancedSettings?.vacancyRiseRate ?? 0.5}
                        min={0}
                        max={5.0}
                        step={0.1}
                        onChange={(val) => updateData({ advancedSettings: { ...data.advancedSettings, vacancyRiseRate: val } })}
                        unit="%"
                        description="年間の空室率上昇幅。0.5%の場合、毎年空室率が0.5ポイント悪化します。"
                    />
                </div>
            </div>

            {/* Long Term Charts */}
            <div className="space-y-8 mt-12 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <LineChartIcon className="h-5 w-5 text-indigo-600" />
                    長期シミュレーション (35年)
                </h3>

                {/* Chart 1: Cash Flow Transition */}
                <Card title="年間収支推移 (収入 vs 支出・返済)" className="bg-white">
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={projectionData} margin={{ top: 20, right: 30, left: 60, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="year" label={{ value: '年数', position: 'insideBottomRight', offset: -5 }} />
                                <YAxis tickFormatter={(val) => `${val / 10000}万`} width={80} />
                                <Tooltip formatter={(value: number | undefined) => formatCurrency(value || 0)} />
                                <Legend />
                                <Bar dataKey="effectiveIncome" name="有効総収入(EGI)" fill="#818cf8" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="opex" name="運営費(OPEX)" stackId="a" fill="#f87171" />
                                <Bar dataKey="tmT" name="ローン返済(ADS)" stackId="a" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                                <Line type="monotone" dataKey="btcf" name="手残り(BTCF)" stroke="#10b981" strokeWidth={3} dot={{ r: 2 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Chart 2: Accumulated CF */}
                    <Card title="累積キャッシュフロー推移" className="bg-white">
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={projectionData} margin={{ top: 10, right: 30, left: 60, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="year" />
                                    <YAxis tickFormatter={(val) => `${val / 10000}万`} />
                                    <Tooltip formatter={(value: number | undefined) => formatCurrency(value || 0)} />
                                    <ReferenceLine y={0} stroke="#666" />
                                    <Area type="monotone" dataKey="accumulatedCashFlow" name="累積CF" stroke="#059669" fill="#10b981" fillOpacity={0.2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* Chart 3: Loan Balance */}
                    <Card title="ローン残債推移" className="bg-white">
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={projectionData} margin={{ top: 10, right: 30, left: 60, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="year" />
                                    <YAxis tickFormatter={(val) => `${val / 10000}万`} />
                                    <Tooltip formatter={(value: number | undefined) => formatCurrency(value || 0)} />
                                    <Area type="monotone" dataKey="loanBalance" name="ローン残債" stroke="#6366f1" fill="#818cf8" fillOpacity={0.2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            </div>

            <div className="flex justify-start pt-6 border-t border-slate-200 no-print">
                <Button variant="ghost" onClick={prevStep} className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" /> 戻る (条件変更)
                </Button>
            </div>


        </div>
    );
};
