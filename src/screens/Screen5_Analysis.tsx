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
import { generateExitTable } from '../utils/exitStrategy';
import { calculateDepreciation } from '../utils/taxCalculations';
import { generateScenarios, generateSensitivityMatrix } from '../utils/scenarioAnalysis';

// New Landscape Report Components
import { ReportCover } from '../components/report/ReportCover';
import { ExecutiveSummaryPage } from '../components/report/ExecutiveSummaryPage';
import { IncomeExpensePage } from '../components/report/IncomeExpensePage';
import { ChartPage } from '../components/report/ChartPage';
import { CashFlowPage } from '../components/report/CashFlowPage';
import { AppendicesPage } from '../components/report/AppendicesPage';

export const Screen5_Analysis: React.FC = () => {
    const { data, updateData, updateAdvancedSettings, prevStep } = useSimulationStore();
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
    const annualPotentialGrossIncome = (monthlyGrossIncome + data.rentRoll.otherRevenue + (data.rentRoll.solarPowerIncome || 0)) * 12;

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

    // Exit Strategy
    const exitCapRate = data.advancedSettings?.exitCapRate ?? 6.0;
    const depInfo = useMemo(() => calculateDepreciation(
        data.property.structure,
        data.budget.buildingWorksCost * 10000,
        data.advancedSettings?.equipmentRatio ?? 0.2,
        data.mode === 'investment_used',
        data.advancedSettings?.buildingAge ?? 0,
    ), [data.property.structure, data.budget.buildingWorksCost, data.advancedSettings?.equipmentRatio, data.mode, data.advancedSettings?.buildingAge]);

    const exitTable = useMemo(() => generateExitTable(
        projectionData,
        exitCapRate,
        data.budget.buildingWorksCost * 10000,
        data.budget.landPrice * 10000,
        data.funding.ownCapital * 10000,
        depInfo,
    ), [projectionData, exitCapRate, data.budget.buildingWorksCost, data.budget.landPrice, data.funding.ownCapital, depInfo]);

    // Scenario Comparison
    const scenarios = useMemo(() => generateScenarios(data), [data]);
    const sensitivityMatrix = useMemo(() => generateSensitivityMatrix(data), [data]);
    const rentDeclineHeaders = [0, 0.5, 1.0, 1.5, 2.0];


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
                <h2 className="text-2xl font-bold text-slate-800">収支分析結果</h2>
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
                        {/* Page 7: Appendices (Map & Documents) */}
                        <AppendicesPage data={data} pageNumber={7} />
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

            {/* Exit Strategy Section */}
            <Card className="!bg-gradient-to-br from-violet-50 to-indigo-50 border-violet-200 shadow-lg no-print">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-violet-800 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" /> 出口戦略シミュレーション
                    </h3>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-violet-600 font-medium">売却時Cap Rate:</span>
                        <Slider
                            label=""
                            min={3}
                            max={12}
                            step={0.5}
                            value={exitCapRate}
                            onChange={(v) => updateAdvancedSettings({ exitCapRate: v })}
                        />
                        <span className="text-lg font-bold text-violet-700 w-16">{exitCapRate.toFixed(1)}%</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-violet-600 text-white text-xs uppercase tracking-wider">
                                <th className="py-2 px-3 text-center rounded-tl-lg">売却年</th>
                                <th className="py-2 px-3 text-right">売却価格</th>
                                <th className="py-2 px-3 text-right">ローン残債</th>
                                <th className="py-2 px-3 text-right">売却請経費</th>
                                <th className="py-2 px-3 text-right">譲渡所得税</th>
                                <th className="py-2 px-3 text-right">売却手取り</th>
                                <th className="py-2 px-3 text-right">期間累CF</th>
                                <th className="py-2 px-3 text-right">トータルリターン</th>
                                <th className="py-2 px-3 text-right rounded-tr-lg">年率リターン</th>
                            </tr>
                        </thead>
                        <tbody>
                            {exitTable.map((row, i) => (
                                <tr key={row.saleYear} className={`border-b border-violet-100 ${i % 2 !== 0 ? 'bg-violet-50/50' : 'bg-white'} ${row.saleYear === 5 ? '!bg-amber-50 font-semibold' : ''}`}>
                                    <td className="py-2 px-3 text-center font-bold text-violet-700">{row.saleYear}年目{row.saleYear <= 5 ? ' ✨' : ''}</td>
                                    <td className="py-2 px-3 text-right font-mono">{formatCurrency(row.salePrice)}</td>
                                    <td className="py-2 px-3 text-right font-mono text-slate-500">{formatCurrency(row.loanBalanceAtSale)}</td>
                                    <td className="py-2 px-3 text-right font-mono text-amber-600">{formatCurrency(row.saleExpenses.total)}</td>
                                    <td className="py-2 px-3 text-right font-mono text-rose-500">{formatCurrency(row.capitalGainsTax)}</td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">{formatCurrency(row.netSaleProceeds)}</td>
                                    <td className="py-2 px-3 text-right font-mono text-slate-600">{formatCurrency(row.totalCashflowDuringHolding)}</td>
                                    <td className={`py-2 px-3 text-right font-mono font-bold ${row.totalReturn >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{formatCurrency(row.totalReturn)}</td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-indigo-600">{formatPercent(row.annualizedReturn * 100)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-3 flex gap-4 text-xs text-violet-500">
                    <span>※ 5年以下の保有: 短期譲渡税率 39.63%</span>
                    <span>※ 5年超の保有: 長期譲渡税率 20.315%</span>
                </div>
            </Card>

            {/* Scenario Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
                <Card className="!bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
                    <h3 className="text-lg font-bold text-blue-800 mb-4">シナリオ比較（楽観 / 標準 / 悲観）</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-blue-200">
                                    <th className="py-2 px-2 text-left text-slate-500 text-xs">指標</th>
                                    {scenarios.map(s => (
                                        <th key={s.name} className="py-2 px-2 text-right" style={{ color: s.color }}>
                                            <span className="inline-flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                                                {s.label}
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="font-mono text-sm">
                                <tr className="border-b border-slate-100">
                                    <td className="py-2 px-2 text-slate-600">NOI (初年度)</td>
                                    {scenarios.map(s => <td key={s.name} className="py-2 px-2 text-right">{formatCurrency(s.year1Noi)}</td>)}
                                </tr>
                                <tr className="border-b border-slate-100 bg-blue-50/30">
                                    <td className="py-2 px-2 text-slate-600">BTCF (初年度)</td>
                                    {scenarios.map(s => <td key={s.name} className="py-2 px-2 text-right">{formatCurrency(s.year1Btcf)}</td>)}
                                </tr>
                                <tr className="border-b border-slate-100">
                                    <td className="py-2 px-2 text-slate-600">ATCF (初年度)</td>
                                    {scenarios.map(s => <td key={s.name} className="py-2 px-2 text-right">{formatCurrency(s.year1Atcf)}</td>)}
                                </tr>
                                <tr className="border-b border-slate-100 bg-blue-50/30">
                                    <td className="py-2 px-2 text-slate-600">DSCR</td>
                                    {scenarios.map(s => (
                                        <td key={s.name} className={`py-2 px-2 text-right font-bold ${s.year1Dscr >= 1.2 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                            {s.year1Dscr === Infinity ? '∞' : s.year1Dscr.toFixed(2)}倍
                                        </td>
                                    ))}
                                </tr>
                                <tr className="border-b border-slate-100">
                                    <td className="py-2 px-2 text-slate-600">IRR (税引後)</td>
                                    {scenarios.map(s => (
                                        <td key={s.name} className="py-2 px-2 text-right font-bold" style={{ color: s.color }}>
                                            {s.irr !== null ? formatPercent(s.irr * 100) : 'N/A'}
                                        </td>
                                    ))}
                                </tr>
                                <tr className="bg-blue-50/30">
                                    <td className="py-2 px-2 text-slate-600">回収期間</td>
                                    {scenarios.map(s => (
                                        <td key={s.name} className="py-2 px-2 text-right font-bold">
                                            {s.paybackYear ? `${s.paybackYear}年` : '35年超'}
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Sensitivity Heatmap */}
                <Card className="!bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-lg">
                    <h3 className="text-lg font-bold text-amber-800 mb-2">感度分析ヒートマップ</h3>
                    <p className="text-xs text-amber-600 mb-3">家賃下落率 × 空室上昇率 → IRR</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr>
                                    <th className="py-2 px-2 text-left text-amber-700 text-[10px]">空室↓ \ 家賃→</th>
                                    {rentDeclineHeaders.map(rd => (
                                        <th key={rd} className="py-2 px-2 text-center text-amber-700 font-bold">{rd}%</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sensitivityMatrix.map((row, ri) => (
                                    <tr key={ri}>
                                        <td className="py-1 px-2 text-amber-700 font-bold">{row[0].vacancyRise}%</td>
                                        {row.map((cell, ci) => {
                                            const irr = cell.irr;
                                            const irrPct = irr !== null ? irr * 100 : -999;
                                            let bg = '#fef2f2';
                                            let textColor = '#dc2626';
                                            if (irrPct > 5) { bg = '#dcfce7'; textColor = '#16a34a'; }
                                            else if (irrPct > 3) { bg = '#d1fae5'; textColor = '#059669'; }
                                            else if (irrPct > 1) { bg = '#fef9c3'; textColor = '#ca8a04'; }
                                            else if (irrPct > 0) { bg = '#ffedd5'; textColor = '#ea580c'; }

                                            return (
                                                <td key={ci} className="py-1.5 px-2 text-center font-mono font-bold rounded-sm" style={{ backgroundColor: bg, color: textColor }}>
                                                    {irr !== null ? `${irrPct.toFixed(1)}%` : 'N/A'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex gap-3 mt-3 text-[10px]">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: '#dcfce7' }} /> 5%以上</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: '#d1fae5' }} /> 3-5%</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: '#fef9c3' }} /> 1-3%</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: '#ffedd5' }} /> 0-1%</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: '#fef2f2' }} /> マイナス</span>
                    </div>
                </Card>
            </div>

            <div className="flex justify-start pt-6 border-t border-slate-200 no-print">
                <Button variant="ghost" onClick={prevStep} className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" /> 戻る (条件変更)
                </Button>
            </div>

            {/* Disclaimer for Screen View */}
            <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 space-y-1">
                <p className="font-bold">【 免責事項・ご注意 】</p>
                <ul className="list-disc list-inside space-y-0.5 ml-1">
                    <li>本シミュレーション結果はあくまでも概算の提案であり、将来の収益を保証するものではありません。</li>
                    <li>税金や諸経費は一般的な税率や評価額をもとにした概算です。正確な数値については税理士等の専門家へご確認下さい。</li>
                    <li>事業開始後における地価や建築費、金利の変動、賃料や修繕費用の変化を完全に予想したものではありません。</li>
                </ul>
            </div>


        </div>
    );
};
