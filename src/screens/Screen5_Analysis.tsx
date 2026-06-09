/**
 * ============================================================
 *  AI組織型コードレビュー済み
 *  レビュー日: 2026-06-01
 *  レビュー部署: バグチェック部 / セキュリティ部 / 改善提案部
 *  統合修正: 開発部
 * ============================================================
 */

import React, { useMemo } from 'react';
import { useSimulationStore, type SimulationMode } from '../stores/useSimulationStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ArrowLeft, FileText, Download, Upload, Save, FileJson, LineChart as LineChartIcon, TrendingUp } from 'lucide-react';
import { calculatePmt } from '../utils/calculations';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { downloadCSV } from '../utils/csvExport';
import { saveProjectJSON, loadProjectJSON, importCSV } from '../utils/fileHandler';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ComposedChart, Line, Area, Legend, ReferenceLine } from 'recharts';
import { calculateLongTermProjection, getInvestmentMetrics } from '../utils/simulationProjection';
import { Slider } from '../components/ui/Slider';
import { PrintLayout } from '../components/PrintLayout';
import { generateExitTable } from '../utils/exitStrategy';
import { calculateDepreciation, analyzeDeadCross } from '../utils/taxCalculations';

// --- 減価償却・デッドクロス可視化プレミアムコンポーネントのインポート ---
import { DeadCrossAlert } from '../components/ui/DeadCrossAlert';
import { DepreciationChart } from '../components/ui/DepreciationChart';
import { DepreciationSettingsPanel } from '../components/ui/DepreciationSettingsPanel';
import { generateScenarios, generateSensitivityMatrix } from '../utils/scenarioAnalysis';

// New Landscape Report Components
import { ReportCover } from '../components/report/ReportCover';
import { ExecutiveSummaryPage } from '../components/report/ExecutiveSummaryPage';
import { TenYearTransitionPage } from '../components/report/TenYearTransitionPage';
import { IncomeExpensePage } from '../components/report/IncomeExpensePage';
import { ChartPage } from '../components/report/ChartPage';
import { CashFlowPage } from '../components/report/CashFlowPage';
import { AppendicesPage } from '../components/report/AppendicesPage';

// ============================================================
// 【ダイナミック表示】モード別・スマートAIコンサルバナー
// ============================================================
const ModeConsultantBanner: React.FC<{ mode: SimulationMode }> = ({ mode }) => {
    let title = '';
    let description = '';
    let advicePoints: string[] = [];
    let bgClass = '';
    let borderClass = '';
    let tagText = '';
    let tagClass = '';

    if (mode === 'land_new') {
        title = '新築・土地活用スキーム診断';
        tagText = '長期・資産形成型';
        tagClass = 'bg-[#ebd9c5]/30 text-[#8c6114] border-[#ebd9c5]/50';
        bgClass = 'bg-gradient-to-r from-[#fdfaf5] to-[#fcf9f2]';
        borderClass = 'border-[#ebd9c5]';
        description = '更地からのアパート・マンション新築は、長期安定収入と相続税対策の決定版です。最新設備で高い入居率を維持できます。';
        advicePoints = [
            '【利回り改善】建築本体コストの精査と、間取りごとの想定坪賃料の最大化が鍵となります。',
            '【デッドクロス注意】15年〜20年目の建物附属設備の減価償却終了による税負担増に備え、手残りをプールしておきましょう。',
            '【融資計画】長期固定金利のローンを組むことで、金利上昇局面でのリスクをヘッジできます。'
        ];
    } else if (mode === 'investment_used') {
        title = '中古物件・短期償却スピード節税診断';
        tagText = '高利回り・節税特化型';
        tagClass = 'bg-[#ebd9c5]/50 text-[#8c6114] border-[#ebd9c5]';
        bgClass = 'bg-gradient-to-r from-[#fdfaf5] to-[#fcf9f2]';
        borderClass = 'border-[#ebd9c5]';
        description = '既存 of 建物付き物件を購入するスキームです。築古木造等では、簡便法により4〜5年で超スピード償却（毎年の減価償却費の極大化）を狙えます。';
        advicePoints = [
            '【デッドクロス激突】償却終了後は一気に帳簿上の経費が減り、税務上の黒字（所得税負担）が跳ね上がります。償却切れ前の売却（Exit）が定石です。',
            '【修繕リスク】築年数が古いため、給排水管や大規模修繕等のスポット経費の発生に備えた余裕のある積立金が必須です。',
            '【減価償却の最大化】建物購入費のうち「建物附属設備」の割合を多めに計上することで、初期のキャッシュをさらに厚くできます。'
        ];
    } else if (mode === 'land_lease') {
        title = '借地リース・超高効率レバレッジ診断';
        tagText = '土地・建築協力金型';
        tagClass = 'bg-[#ebd9c5]/50 text-[#1e3d2f] border-[#1e3d2f]/30';
        bgClass = 'bg-gradient-to-r from-[#fdfaf5] to-[#fcf9f2]';
        borderClass = 'border-[#ebd9c5]';
        description = '地主から借地し、建築費をテナント（コンビニ等の実需店舗）から預かる無利息の「建設協力金」で全額または大半を調達する、知的な極上ビジネススキームです。';
        advicePoints = [
            '【レバレッジの極み】土地購入代金が0円、かつ建築費の多くをテナント資金で賄えるため、自己資金に対するキャッシュ回収率（IRR/CCR）は不動産投資中ダントツNo.1です。',
            '【Exit注意】借地期間（通常20年〜30年）満了時には、原則として「建物更地渡し（更地にして返還）」する義務があります。最終年に建物解体費用がスポットで発生し、Exit売却額は0円（または更地化マイナス）になる前提で手残りCFを組み立てましょう。',
            '【地代調整】地主へ支払う月額地代は固定費（経費）になります。地代と家賃収入の差額（利ざや）の維持・拡大が収益の源泉です。'
        ];
    }

    return (
        <div className={`p-6 rounded-3xl border backdrop-blur-md shadow-sm no-print mb-6 ${bgClass} ${borderClass}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-white flex items-center justify-center shadow-sm text-xl border border-[#ebd9c5]/60">
                        🤖
                    </div>
                    <div>
                        <h4 className="font-extrabold text-[#23150d] text-lg flex items-center gap-2">
                            {title}
                        </h4>
                        <p className="text-xs text-[#8c6114] mt-0.5 font-semibold">モード別・AIスマートコンサル診断</p>
                    </div>
                </div>
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${tagClass}`}>
                    {tagText}
                </span>
            </div>
            
            <p className="text-[#3d251a] text-sm leading-relaxed mb-4 border-b border-[#ebd9c5]/40 pb-4 font-medium">
                {description}
            </p>

            <div className="grid md:grid-cols-3 gap-4">
                {advicePoints.map((point, idx) => (
                    <div key={idx} className="bg-white/95 p-4 rounded-2xl shadow-sm border border-[#ebd9c5]/50">
                        <span className="text-xs font-extrabold text-[#a87c28] block mb-1">
                            ADVICE {idx + 1}
                        </span>
                        <p className="text-[#3d251a] text-xs leading-relaxed font-semibold">
                            {point}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const Screen5_Analysis: React.FC = () => {
    const { data, updateData, updateAdvancedSettings, prevStep } = useSimulationStore();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const csvInputRef = React.useRef<HTMLInputElement>(null);

    // 感度分析スライダー用のローカルステート (ドラッグ中の描画ラグ解消のため2重同期State設計を採用)
    const [localRentDecline, setLocalRentDecline] = React.useState(data.advancedSettings?.rentDeclineRate ?? 1.0);
    const [localVacancyRise, setLocalVacancyRise] = React.useState(data.advancedSettings?.vacancyRiseRate ?? 0.5);
    const [localExitCapRate, setLocalExitCapRate] = React.useState(data.advancedSettings?.exitCapRate ?? 6.0);

    // ストアの値が外部から更新された時（リセット等）の同期
    React.useEffect(() => {
        setLocalRentDecline(data.advancedSettings?.rentDeclineRate ?? 1.0);
    }, [data.advancedSettings?.rentDeclineRate]);

    React.useEffect(() => {
        setLocalVacancyRise(data.advancedSettings?.vacancyRiseRate ?? 0.5);
    }, [data.advancedSettings?.vacancyRiseRate]);

    React.useEffect(() => {
        setLocalExitCapRate(data.advancedSettings?.exitCapRate ?? 6.0);
    }, [data.advancedSettings?.exitCapRate]);

    const projectionData = useMemo(() => calculateLongTermProjection(data), [data]);

    // === 簡易資金収支（1〜10年目）の計算 ===
    const yearlyDetails = useMemo(() => {
        const isLeaseMode = data.mode === 'land_lease';
        const totalMonthlyRentOnlyRes = data.rentRoll.roomTypes
            .filter((r) => (r.usage || 'residential') === 'residential')
            .reduce((acc, r) => acc + r.rent * r.count, 0);

        const totalMonthlyRentOnlyComm = data.rentRoll.roomTypes
            .filter((r) => r.usage === 'commercial')
            .reduce((acc, r) => acc + r.rent * r.count, 0);

        const totalMonthlyCommonFee = data.rentRoll.roomTypes.reduce((acc, r) => acc + r.commonFee * r.count, 0);
        const totalMonthlyParking = data.rentRoll.parkingCount * data.rentRoll.parkingFee;
        const rentDeclineRate = data.advancedSettings?.rentDeclineRate ?? 1.0;

        const getYearlyIncomeDetail = (year: number) => {
            const declineFactor = Math.pow(1 - rentDeclineRate / 100, year - 1);
            const resRent = totalMonthlyRentOnlyRes * 12 * declineFactor;
            const commRent = totalMonthlyRentOnlyComm * 12 * declineFactor;
            const commonFee = totalMonthlyCommonFee * 12 * declineFactor;
            const parking = totalMonthlyParking * 12;
            const other = (data.rentRoll.otherRevenue + (data.rentRoll.solarPowerIncome || 0)) * 12;
            const subtotal = resRent + commRent + commonFee + parking + other;

            const baseVacancyRate = data.rentRoll.occupancyRate !== undefined ? (100 - data.rentRoll.occupancyRate) : 5;
            const vacancyRiseRate = data.advancedSettings?.vacancyRiseRate ?? 0.5;
            let currentVacancyRate = baseVacancyRate + (vacancyRiseRate * (year - 1));
            if (currentVacancyRate > 100) currentVacancyRate = 100;
            if (currentVacancyRate < 0) currentVacancyRate = 0;

            const vacancyLoss = subtotal * (currentVacancyRate / 100);
            const diff = subtotal - vacancyLoss;

            const securityDeposit = year === 1 ? (data.funding.securityDepositIn || 0) * 10000 : 0;
            const cooperationMoney = (year === 1 && isLeaseMode) ? (data.funding.cooperationMoney || 0) * 10000 : 0;

            const totalIncome = diff + securityDeposit + cooperationMoney;

            return { resRent, commRent, commonFee, parking, subtotal, vacancyLoss, diff, securityDeposit, cooperationMoney, totalIncome };
        };

        const getYearlyExpenseDetail = (year: number) => {
            const row = projectionData.find((p) => p.year === year);
            if (!row) {
                return { ads: 0, management: 0, publicTaxes: 0, landFixed: 0, landCity: 0, buildingFixed: 0, buildingCity: 0, totalExpense: 0, netCashflow: 0, cooperationReturn: 0 };
            }

            const ads = row.tmT;
            const landFixed = isLeaseMode ? 0 : (data.expenses.fixedAssetTaxLand || 0);
            const landCity = isLeaseMode ? 0 : (data.expenses.cityPlanningTaxLand || 0);
            const buildingFixed = data.expenses.fixedAssetTaxBuilding || 0;
            const buildingCity = data.expenses.cityPlanningTaxBuilding || 0;
            const publicTaxes = landFixed + landCity + buildingFixed + buildingCity;

            const landLeaseFeeAnnual = isLeaseMode ? (data.advancedSettings?.landLeaseFee ?? 0) * 12 : 0;
            const management = row.opex - publicTaxes + landLeaseFeeAnnual;
            const cooperationReturn = row.cooperationReturn || 0;
            const totalExpense = ads + publicTaxes + management + cooperationReturn;
            
            const incomeDetail = getYearlyIncomeDetail(year);
            const netCashflow = incomeDetail.totalIncome - totalExpense;

            return { ads, management, publicTaxes, landFixed, landCity, buildingFixed, buildingCity, totalExpense, netCashflow, cooperationReturn };
        };

        return Array.from({ length: 10 }, (_, idx) => {
            const y = idx + 1;
            return {
                year: y,
                income: getYearlyIncomeDetail(y),
                expense: getYearlyExpenseDetail(y),
            };
        });
    }, [data, projectionData]);

    const getSum = (selector: (d: any) => number): number => {
        return yearlyDetails.reduce((sum, d) => sum + selector(d), 0);
    };

    const formatThousandYen = (yen: number, isMinusTriangle: boolean = false): string => {
        if (yen === 0) return '—';
        const val = Math.round(yen / 1000);
        if (val < 0) {
            return isMinusTriangle ? `▲ ${Math.abs(val).toLocaleString()}` : `-${Math.abs(val).toLocaleString()}`;
        }
        return val.toLocaleString();
    };

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

    // 1. 総事業費（自己資金 ＋ 借入額 ＋ その他初期諸経費）の算出
    // 【バグ修正】新築時のみ本体工事費や解体費用・中金利を合算し、中古時は購入価格と諸経費のみにする（データ混在防止）
    // 1. 総事業費（自己資金 ＋ 借入額 ＋ その他初期諸経費）の算出
    // 【バグ修正】新築・借地・中古のモードごとに、工事費や敷金を正確に合算して土地価格を処理
    // 1. 総事業費（自己資金 ＋ 借入額 ＋ その他初期諸経費）の算出
    // 【バグ修正】新築・借地・中古のモードごとに、工事費や敷金を正確に合算して土地価格を処理
    const isLandMode = data.mode === 'land_new';
    const isLeaseMode = data.mode === 'land_lease';

    // [修正] 改善提案部の指摘: useMemo による総事業費と主要収支計算のキャッシュ化 (スライダー操作ラグ解消)
    const budgetMetrics = useMemo(() => {
        const landInitialCost = isLeaseMode ? (data.budget.landLeaseDeposit ?? 0) : data.budget.landPrice;
        const totalBudget =
            landInitialCost +
            ((isLandMode || isLeaseMode) ? data.budget.demolitionCost : 0) +
            ((isLandMode || isLeaseMode) ? data.budget.buildingWorksCost : 0) +
            data.budget.stampDuty +
            data.budget.registrationTax +
            data.budget.acquisitionTax +
            data.budget.fireInsurancePrepaid +
            data.budget.waterContribution +
            (!isLandMode && !isLeaseMode ? data.budget.brokerageFee : 0) +
            data.budget.otherInitialCost +
            ((isLandMode || isLeaseMode) ? data.budget.constructionInterest : 0);
        const totalBudgetYen = totalBudget * 10000;
        return { totalBudget, totalBudgetYen };
    }, [data.budget, data.mode, isLandMode, isLeaseMode]);

    const { totalBudgetYen } = budgetMetrics;

    // 2. Income
    const rentRollMetrics = useMemo(() => {
        const totalMonthlyRentOnly = data.rentRoll.roomTypes.reduce((acc, r) => acc + r.rent * r.count, 0);
        const totalMonthlyCommonFee = data.rentRoll.roomTypes.reduce((acc, r) => acc + r.commonFee * r.count, 0);
        const totalMonthlyRent = totalMonthlyRentOnly + totalMonthlyCommonFee;
        const totalMonthlyParking = data.rentRoll.parkingCount * data.rentRoll.parkingFee;
        const monthlyGrossIncome = totalMonthlyRent + totalMonthlyParking;
        const annualPotentialGrossIncome = (monthlyGrossIncome + data.rentRoll.otherRevenue + (data.rentRoll.solarPowerIncome || 0)) * 12;

        const vacancyLoss = annualPotentialGrossIncome * (data.rentRoll.occupancyRate ? (100 - data.rentRoll.occupancyRate) / 100 : 0.05);
        const effectiveGrossIncome = annualPotentialGrossIncome - vacancyLoss;

        return { totalMonthlyRentOnly, totalMonthlyCommonFee, totalMonthlyRent, totalMonthlyParking, monthlyGrossIncome, annualPotentialGrossIncome, vacancyLoss, effectiveGrossIncome };
    }, [data.rentRoll]);

    const { totalMonthlyRentOnly, totalMonthlyCommonFee, totalMonthlyParking, annualPotentialGrossIncome, vacancyLoss, effectiveGrossIncome } = rentRollMetrics;

    // 3. Operating Expenses (OPEX)
    const incomeExpenseMetrics = useMemo(() => {
        let annualManagementFee = 0;
        if (data.expenses.managementFeeMode === 'ratio') {
            annualManagementFee = effectiveGrossIncome * (data.expenses.managementFeeRatio / 100);
        } else {
            annualManagementFee = data.expenses.managementFeeFixed * 12;
        }

        const annualBuildingMaintenance = data.expenses.buildingMaintenance * 12;
        const annualMaintenanceReserve = data.expenses.maintenanceReserve * 12;

        // 借地リースの場合、土地の固定資産税・都市計画税は地主負担のため0円とする
        const fixedAssetTaxLand = isLeaseMode ? 0 : data.expenses.fixedAssetTaxLand;
        const cityPlanningTaxLand = isLeaseMode ? 0 : data.expenses.cityPlanningTaxLand;
        const landLeaseFeeAnnual = isLeaseMode ? (data.advancedSettings?.landLeaseFee ?? 0) * 12 : 0;

        const annualTaxes =
            fixedAssetTaxLand +
            cityPlanningTaxLand +
            data.expenses.fixedAssetTaxBuilding +
            data.expenses.cityPlanningTaxBuilding;

        const totalOpex =
            annualManagementFee +
            annualBuildingMaintenance +
            annualMaintenanceReserve +
            annualTaxes +
            data.expenses.fireInsuranceAnnual +
            data.expenses.otherExpenses +
            landLeaseFeeAnnual;

        // 4. Net Operating Income (NOI)
        const noi = effectiveGrossIncome - totalOpex;

        // 5. Debt Service (ADS)
        let annualDebtService = 0;
        data.funding.loans.forEach(loan => {
            const pmt = calculatePmt(loan.amount * 10000, loan.rate, loan.duration);
            annualDebtService += pmt * 12;
        });

        // 6. Cash Flow
        // 【借地リース特別ルール】預かった建設協力金は毎年均等返還するため、初年度の返還金を手残りから差し引きます
        let firstYearCooperationReturnYen = 0;
        if (isLeaseMode) {
            data.rentRoll.roomTypes.forEach(r => {
                const returnYears = r.cooperationReturnYears ?? 20;
                if (returnYears > 0) {
                    const totalCoop = r.rent * r.count * (r.cooperationMonths ?? 0);
                    firstYearCooperationReturnYen += totalCoop / returnYears;
                }
            });
        }

        const beforeTaxCashFlow = noi - annualDebtService - firstYearCooperationReturnYen;

        // 7. Yields
        const grossYield = totalBudgetYen > 0 ? (annualPotentialGrossIncome / totalBudgetYen) * 100 : 0;
        const netYield = totalBudgetYen > 0 ? (noi / totalBudgetYen) * 100 : 0;

        return {
            annualManagementFee,
            annualBuildingMaintenance,
            annualMaintenanceReserve,
            landLeaseFeeAnnual,
            annualTaxes,
            totalOpex,
            noi,
            annualDebtService,
            firstYearCooperationReturnYen,
            beforeTaxCashFlow,
            grossYield,
            netYield
        };
    }, [data.expenses, data.funding.loans, data.rentRoll, data.advancedSettings, effectiveGrossIncome, isLeaseMode, totalBudgetYen, annualPotentialGrossIncome]);

    const {
        annualManagementFee,
        annualBuildingMaintenance,
        annualMaintenanceReserve,
        landLeaseFeeAnnual,
        annualTaxes,
        totalOpex,
        noi,
        annualDebtService,
        firstYearCooperationReturnYen,
        beforeTaxCashFlow,
        grossYield,
        netYield
    } = incomeExpenseMetrics;

    // Investment Metrics
    const investmentMetrics = useMemo(() => getInvestmentMetrics(data, projectionData), [data, projectionData]);

    // 出口戦略シミュレーションの計算
    const exitCapRate = data.advancedSettings?.exitCapRate ?? 6.0;
    const isUsed = data.mode === 'investment_used';

    // 【中古建物減価償却バグ修正】建物価格および土地価格の按分コストを新築・中古のモードごとに正しく算出
    const buildingWorksCostYen = isUsed
        ? (data.budget.landPrice * (data.advancedSettings?.buildingRatio ?? 50) / 100) * 10000
        : data.budget.buildingWorksCost * 10000;
        
    const landPriceYen = isLeaseMode
        ? 0
        : (isUsed
            ? (data.budget.landPrice * (100 - (data.advancedSettings?.buildingRatio ?? 50)) / 100) * 10000
            : (data.budget.landPrice + (data.budget.demolitionCost ?? 0)) * 10000);

    const depInfo = useMemo(() => calculateDepreciation(
        data.property.structure,
        buildingWorksCostYen,
        data.advancedSettings?.equipmentRatio ?? 0.2,
        isUsed,
        data.advancedSettings?.buildingAge ?? 0,
        data.advancedSettings?.usefulLifeMethod ?? 'simplified',
        data.advancedSettings?.customBuildingUsefulLife,
        data.advancedSettings?.customEquipmentUsefulLife
    ), [data.property.structure, buildingWorksCostYen, data.advancedSettings?.equipmentRatio, isUsed, data.advancedSettings?.buildingAge, data.advancedSettings?.usefulLifeMethod, data.advancedSettings?.customBuildingUsefulLife, data.advancedSettings?.customEquipmentUsefulLife]);

    const exitTable = useMemo(() => generateExitTable(
        projectionData,
        exitCapRate,
        buildingWorksCostYen,
        landPriceYen,
        data.funding.ownCapital * 10000,
        depInfo,
        [5, 10, 15, 20, 25, 30], // デフォルトの年数配列を明示的に渡して位置引数ズレを解消
        isLeaseMode,
        (data.budget.landLeaseDeposit ?? 0) * 10000, // 土地敷金を正しく引き渡す
        (data.budget.demolitionCost ?? 0) * 10000 // 解体費用を正しく引き渡す
    ), [projectionData, exitCapRate, buildingWorksCostYen, landPriceYen, data.funding.ownCapital, depInfo, isLeaseMode, data.budget.landLeaseDeposit, data.budget.demolitionCost]);

    // 【新規】35年間の長期予測からデッドクロス(元金返済額 ＞ 減価償却費)を自動分析
    const deadCrossAnalysis = useMemo(() => analyzeDeadCross(projectionData), [projectionData]);

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
        ...(isLeaseMode ? [{ name: '地主支払地代', value: landLeaseFeeAnnual }] : []),
        { name: 'その他', value: data.expenses.fireInsuranceAnnual + data.expenses.otherExpenses },
    ];

    const COLORS = ['#a87c28', '#8c6114', '#5c3e0a', '#c5a059', '#ebd9c5', '#3d251a'];

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
                        {/* Page 3: Ten Year Transition Table (New) */}
                        <TenYearTransitionPage data={data} pageNumber={3} />
                        {/* Page 4: Income & Expenses */}
                        <IncomeExpensePage data={data} expenseData={expenseData} pageNumber={4} />
                        {/* Page 5: Long-term Analysis */}
                        <ChartPage projectionData={projectionData} pageNumber={5} />
                        {/* Page 6: Cash Flow (1-20 years) */}
                        <CashFlowPage projection={projectionData} startYear={1} endYear={20} pageNumber={6} />
                        {/* Page 7: Cash Flow (21-35 years) */}
                        <CashFlowPage projection={projectionData} startYear={21} endYear={35} pageNumber={7} />
                        {/* Page 8: Appendices (Map & Documents) */}
                        <AppendicesPage data={data} pageNumber={8} />
                    </PrintLayout>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Data Management */}
                {/* カードの背景と枠線をゴールド・キャメルベージュ調に統一 */}
                <Card className="md:col-span-3 border border-[#ebd9c5] bg-white/50 backdrop-blur-sm no-print">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-[#23150d] flex items-center gap-2">
                                <Save className="h-5 w-5 text-[#a87c28]" />
                                データ管理
                            </h3>
                            <p className="text-sm text-[#8c6114]/80 font-medium">シミュレーション保存、読み込み、エクスポート</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {/* Hidden Inputs */}
                            <input type="file" ref={fileInputRef} onChange={handleLoadJSON} accept=".json" className="hidden" />
                            <input type="file" ref={csvInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />

                            {/* ボタンの配色をテーマカラーに一貫 */}
                            <Button variant="outline" onClick={() => saveProjectJSON(data)} className="flex items-center gap-2 border-[#ebd9c5] text-[#8c6114] hover:bg-[#ebd9c5]/25">
                                <FileJson className="h-4 w-4" /> プロジェクト保存
                            </Button>
                            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 border-[#ebd9c5] text-[#3d251a] hover:bg-[#ebd9c5]/20">
                                <Upload className="h-4 w-4" /> プロジェクト読込
                            </Button>
                            <div className="w-px h-8 bg-[#ebd9c5] mx-1 hidden md:block"></div>
                            {/* CSVエクスポートはエメラルドの代わりに上品な深いフォレストグリーン系を適用 */}
                            <Button variant="outline" onClick={() => downloadCSV(data)} className="flex items-center gap-2 border-[#1e3d2f]/30 text-[#1e3d2f] hover:bg-[#e8f2ec]/50">
                                <FileText className="h-4 w-4" /> CSVエクスポート
                            </Button>
                            <Button variant="outline" onClick={() => csvInputRef.current?.click()} className="flex items-center gap-2 border-[#ebd9c5] text-[#3d251a] hover:bg-[#ebd9c5]/20">
                                <Download className="h-4 w-4" /> CSVインポート
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* AIコンサルバナー */}
                <div className="md:col-span-3">
                    <ModeConsultantBanner mode={data.mode} />
                </div>

                {/* KPIS */}
                <Card className="md:col-span-3 border-[#ebd9c5] !bg-white !bg-none shadow-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        <div>
                            <p className="text-[#3d251a]/80 text-sm font-bold uppercase">表面利回り</p>
                            <p className="text-4xl font-extrabold mt-2 text-[#a87c28]">{formatPercent(grossYield)}</p>
                        </div>
                        <div>
                            <p className="text-[#3d251a]/80 text-sm font-bold uppercase">実質利回り (NOI)</p>
                            <p className="text-4xl font-extrabold mt-2 text-[#1e3d2f]">{formatPercent(netYield)}</p>
                        </div>
                        <div>
                            <p className="text-[#3d251a]/80 text-sm font-bold uppercase">年間手取り (BTCF)</p>
                            <p className="text-3xl font-bold mt-2 text-[#23150d]">{formatCurrency(beforeTaxCashFlow)}</p>
                        </div>
                        <div>
                            <p className="text-[#3d251a]/80 text-sm font-bold uppercase">総事業費</p>
                            <p className="text-3xl font-bold mt-2 text-[#23150d]">{formatCurrency(totalBudgetYen)}</p>
                        </div>
                    </div>
                </Card>

                {/* Advanced Investment Metrics */}
                <Card className="md:col-span-3 border-[#ebd9c5] !bg-gradient-to-r from-[#fdfaf5] to-[#ebd9c5]/25 !bg-none shadow-lg">
                    <h3 className="text-sm font-bold text-[#8c6114] uppercase tracking-wider mb-4 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-[#8c6114]" /> 投資分析指標
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#ebd9c5]">
                            <p className="text-[#3d251a]/60 text-[10px] font-bold uppercase">IRR (税引後)</p>
                            <p className="text-2xl font-extrabold mt-1 text-[#a87c28]">
                                {investmentMetrics.irr !== null ? formatPercent(investmentMetrics.irr * 100) : 'N/A'}
                            </p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#ebd9c5]">
                            <p className="text-[#3d251a]/60 text-[10px] font-bold uppercase">DSCR (初年度)</p>
                            <p className={`text-2xl font-extrabold mt-1 ${investmentMetrics.year1Dscr >= 1.2 ? 'text-[#1e3d2f]' : 'text-rose-500'}`}>
                                {investmentMetrics.year1Dscr === Infinity ? '∞' : investmentMetrics.year1Dscr.toFixed(2)}倍
                            </p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#ebd9c5]">
                            <p className="text-[#3d251a]/60 text-[10px] font-bold uppercase">CCR (自己資金回収率)</p>
                            <p className="text-2xl font-extrabold mt-1 text-[#a87c28]">
                                {formatPercent(investmentMetrics.year1Ccr * 100)}
                            </p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#ebd9c5]">
                            <p className="text-[#3d251a]/60 text-[10px] font-bold uppercase">投資回収期間</p>
                            <p className="text-2xl font-extrabold mt-1 text-[#8c6114]">
                                {investmentMetrics.paybackYear ? `${investmentMetrics.paybackYear}年` : '35年超'}
                            </p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#ebd9c5]">
                            <p className="text-[#3d251a]/60 text-[10px] font-bold uppercase">BER (損益分岐稼働率)</p>
                            <p className={`text-2xl font-extrabold mt-1 ${investmentMetrics.ber <= 0.7 ? 'text-[#1e3d2f]' : 'text-[#8c6114]'}`}>
                                {formatPercent(investmentMetrics.ber * 100)}
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Detailed Tables */}
                <Card title="年間収支詳細" className="md:col-span-2">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-[#ebd9c5]/40">
                            <span className="text-[#3d251a]/85 font-medium">満室想定年収</span>
                            <span className="text-lg font-bold text-[#23150d]">{formatCurrency(annualPotentialGrossIncome)}</span>
                        </div>
                        {/* GPI Breakdown */}
                        <div className="bg-[#fcf9f2]/60 p-3 rounded-2xl text-xs space-y-1.5 ml-4 border border-[#ebd9c5]/40 no-print shadow-sm">
                            <div className="flex justify-between text-[#3d251a]/90 font-medium">
                                <span>・内、賃料収入 (年額)</span>
                                <span className="font-semibold text-slate-700 font-mono">{formatCurrency(totalMonthlyRentOnly * 12)}</span>
                            </div>
                            <div className="flex justify-between text-[#3d251a]/90 font-medium">
                                <span>・内、共益費収入 (年額)</span>
                                <span className="font-semibold text-slate-700 font-mono">{formatCurrency(totalMonthlyCommonFee * 12)}</span>
                            </div>
                            <div className="flex justify-between text-[#3d251a]/90 font-medium">
                                <span>・内、駐車場・その他 (年額)</span>
                                <span className="font-semibold text-slate-700 font-mono">
                                    {formatCurrency((totalMonthlyParking + (data.rentRoll.solarPowerIncome || 0) + data.rentRoll.otherRevenue) * 12)}
                                </span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-[#ebd9c5]/40">
                            <span className="text-[#3d251a]/85 font-medium">空室損 ({100 - (data.rentRoll.occupancyRate || 100)}%)</span>
                            <span className="text-rose-600 font-semibold">▲ {formatCurrency(vacancyLoss)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2.5 border-b border-[#ebd9c5]/60 bg-[#ebd9c5]/20 px-3 -mx-3 rounded-xl">
                            <span className="text-[#23150d] font-bold">有効総収入 (EGI)</span>
                            <span className="text-xl font-bold text-[#23150d] font-serif">{formatCurrency(effectiveGrossIncome)}</span>
                        </div>
 
                        <div className="flex justify-between items-center py-2 border-b border-[#ebd9c5]/40 pl-4 text-sm">
                            <span className="text-[#3d251a]/80 font-medium">運営費計 (OPEX)</span>
                            <span className="text-[#3d251a] font-semibold">▲ {formatCurrency(totalOpex)}</span>
                        </div>
 
                        {/* 借地リース特別開示情報（地代および土地の固都税免除） */}
                        {isLeaseMode && (
                            <div className="bg-[#fcf9f2] p-3 rounded-2xl text-xs space-y-1.5 ml-4 border border-[#ebd9c5] no-print shadow-sm">
                                <div className="flex justify-between text-[#3d251a]/90 font-medium">
                                    <span>・地主への支払地代 (年額)</span>
                                    <span className="font-semibold">▲ {formatCurrency(landLeaseFeeAnnual)}</span>
                                </div>
                                <div className="flex justify-between text-[#3d251a]/90 font-medium">
                                    <span>・土地固定資産税・都市計画税</span>
                                    <span className="text-[#1e3d2f] font-bold">0 円 (地権者負担)</span>
                                </div>
                                <div className="flex justify-between text-[#3d251a]/90 font-medium">
                                    <span>・建物固定資産税・都市計画税</span>
                                    <span className="font-semibold">▲ {formatCurrency(data.expenses.fixedAssetTaxBuilding + data.expenses.cityPlanningTaxBuilding)}</span>
                                </div>
                            </div>
                        )}
 
                        <div className="flex justify-between items-center py-2.5 border-b border-[#ebd9c5]/60 bg-[#ebd9c5]/35 px-3 -mx-3 rounded-xl">
                            <span className="text-[#23150d] font-bold">営業純利益 (NOI)</span>
                            <span className="text-xl font-bold text-[#23150d] font-serif">{formatCurrency(noi)}</span>
                        </div>
 
                        <div className="flex justify-between items-center py-2 border-b border-[#ebd9c5]/40 pl-4 text-sm">
                            <span className="text-[#3d251a]/80 font-medium">年間返済額 (ADS)</span>
                            <span className="text-[#3d251a] font-semibold">▲ {formatCurrency(annualDebtService)}</span>
                        </div>
 
                        {/* 借地リース特別開示情報（建設協力金の均等返還金支出） */}
                        {isLeaseMode && firstYearCooperationReturnYen > 0 && (
                            <div className="flex justify-between items-center py-2 border-b border-[#ebd9c5]/40 pl-4 text-sm bg-[#ebd9c5]/15 px-2 -mx-2 rounded-lg">
                                <span className="text-[#8c6114] font-semibold">建設協力金返還額 (年額)</span>
                                <span className="text-[#8c6114] font-mono font-semibold">▲ {formatCurrency(firstYearCooperationReturnYen)}</span>
                            </div>
                        )}
 
                        <div className="flex justify-between items-center py-3 bg-[#1e3d2f] px-4 -mx-4 rounded-xl mt-3 shadow-md border border-[#1e3d2f]/30">
                            <span className="text-[#fdfaf5] font-bold text-lg">税引前キャッシュフロー (BTCF)</span>
                            <span className="text-2xl font-bold text-[#fdfaf5] font-serif">{formatCurrency(beforeTaxCashFlow)}</span>
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
                                    <Bar dataKey="flow" fill="#a87c28" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            </div>
 
            {/* Sensitivity Analysis */}
            <div className="space-y-6 mt-12 bg-[#fcf9f2] p-6 rounded-2xl border border-[#ebd9c5] shadow-sm">
                <h3 className="text-xl font-bold text-[#23150d] flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-[#8c6114]" />
                    シミュレーション条件 (感度分析) {/* タイポ修正 */}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Slider
                        label="家賃下落率 (年率)"
                        value={localRentDecline}
                        min={0}
                        max={5.0}
                        step={0.1}
                        onChange={(val) => setLocalRentDecline(val)}
                        onMouseUp={() => updateData({ advancedSettings: { ...data.advancedSettings, rentDeclineRate: localRentDecline } })}
                        onTouchEnd={() => updateData({ advancedSettings: { ...data.advancedSettings, rentDeclineRate: localRentDecline } })}
                        unit="%"
                        description="年間の家賃下落率。1%の場合、毎年家賃収入が1%ずつ減少します。"
                    />
                    <Slider
                        label="空室率上昇 (年率)"
                        value={localVacancyRise}
                        min={0}
                        max={5.0}
                        step={0.1}
                        onChange={(val) => setLocalVacancyRise(val)}
                        onMouseUp={() => updateData({ advancedSettings: { ...data.advancedSettings, vacancyRiseRate: localVacancyRise } })}
                        onTouchEnd={() => updateData({ advancedSettings: { ...data.advancedSettings, vacancyRiseRate: localVacancyRise } })}
                        unit="%"
                        description="年間の空室率上昇幅。0.5%の場合、毎年空室率が0.5ポイント悪化します。"
                    />
                </div>
            </div>
 
            {/* --- 減価償却とデッドクロス分析プレミアムセクション (CTO佐藤和嘉様ご要望) --- */}
            <div className="space-y-6 mt-12 bg-[#fcf9f2] p-6 rounded-2xl border border-[#ebd9c5] shadow-sm no-print">
                <div>
                    <h3 className="text-xl font-bold text-[#23150d] flex items-center gap-2">
                        減価償却とデッドクロス分析
                    </h3>
                    <p className="text-xs text-[#3d251a]/85 font-semibold mt-1">建物・設備の耐用年数を考慮した税引後キャッシュフローへのインパクトを自動診断します。</p>
                </div>
 
                {/* デッドクロススマート警告＆コンサルアドバイスカード */}
                <DeadCrossAlert
                    hasDeadCross={deadCrossAnalysis.hasDeadCross}
                    deadCrossYear={deadCrossAnalysis.deadCrossYear}
                    maxTaxIncrease={deadCrossAnalysis.maxTaxIncrease}
                    maxCashCrunchYear={deadCrossAnalysis.maxCashCrunchYear}
                    buildingUsefulLife={depInfo.buildingUsefulLife}
                    equipmentUsefulLife={depInfo.equipmentUsefulLife}
                />
 
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 減価償却詳細調整コントローラーパネル */}
                    <div className="lg:col-span-2">
                        <DepreciationSettingsPanel />
                    </div>
 
                    {/* 減価償却 vs ローン返済元金の重ね合わせComposedグラフ */}
                    <div>
                        <DepreciationChart
                            data={projectionData}
                            deadCrossYear={deadCrossAnalysis.deadCrossYear}
                        />
                    </div>
                </div>
            </div>
 
            {/* Long Term Charts */}
            <div className="space-y-8 mt-12 bg-[#fcf9f2] p-6 rounded-2xl border border-[#ebd9c5] shadow-sm">
                <h3 className="text-xl font-bold text-[#23150d] flex items-center gap-2">
                    <LineChartIcon className="h-5 w-5 text-[#8c6114]" />
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
                                <Bar dataKey="effectiveIncome" name="有効総収入(EGI)" fill="#a87c28" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="opex" name="運営費(OPEX)" stackId="a" fill="#ebd9c5" />
                                <Bar dataKey="tmT" name="ローン返済(ADS)" stackId="a" fill="#5c3e0a" />
                                {data.mode === 'land_lease' && (
                                    <Bar dataKey="cooperationReturn" name="建設協力金返還" stackId="a" fill="#c5a059" radius={[4, 4, 0, 0]} />
                                )}
                                <Line type="monotone" dataKey="btcf" name="手残り(BTCF)" stroke="#1e3d2f" strokeWidth={3} dot={{ r: 2 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
 
                <div className="grid grid-cols-1 gap-6">
                    {/* Chart 2: 投資回収・損益分岐複合チャート */}
                    <Card title="投資回収・損益分岐チャート (累積CF vs ローン残債)" className="bg-white w-full">
                        <div className="flex flex-wrap justify-between items-center mb-4 gap-2 text-xs font-semibold text-[#8c6114] bg-[#fdf5e2] p-3 rounded-xl border border-[#ebd9c5]">
                            <span>
                                📈 損益分岐点 (自己資金の投資回収年数): 
                                <span className="text-emerald-700 text-sm font-extrabold ml-1">
                                    {investmentMetrics.paybackYear ? `${investmentMetrics.paybackYear}年目` : '35年超'}
                                </span>
                            </span>
                            <span>
                                🏦 借入金完済予定年: 
                                <span className="text-blue-800 text-sm font-extrabold ml-1">
                                    {Math.max(...data.funding.loans.map(l => l.duration), 0)}年目
                                </span>
                            </span>
                        </div>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={projectionData} margin={{ top: 10, right: 30, left: 60, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="year" label={{ value: '年数', position: 'insideBottomRight', offset: -5 }} />
                                    <YAxis tickFormatter={(val) => `${val / 10000}万`} width={80} />
                                    <Tooltip formatter={(value: number | undefined) => formatCurrency(value || 0)} />
                                    <Legend />
                                    <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1.5} />
                                    {investmentMetrics.paybackYear && (
                                        <ReferenceLine 
                                            x={investmentMetrics.paybackYear} 
                                            stroke="#dc2626" 
                                            strokeDasharray="4 4" 
                                            strokeWidth={2} 
                                            label={{ 
                                                value: `損益分岐点 (${investmentMetrics.paybackYear}年目)`, 
                                                position: 'insideTopLeft', 
                                                fill: '#dc2626', 
                                                fontSize: 10, 
                                                fontWeight: 'bold'
                                            }} 
                                        />
                                    )}
                                    {Math.max(...data.funding.loans.map(l => l.duration), 0) > 0 && (
                                        <ReferenceLine 
                                            x={Math.max(...data.funding.loans.map(l => l.duration), 0)} 
                                            stroke="#2563eb" 
                                            strokeDasharray="4 4" 
                                            strokeWidth={2} 
                                            label={{ 
                                                value: `ローン完済 (${Math.max(...data.funding.loans.map(l => l.duration), 0)}年目)`, 
                                                position: 'insideTopRight', 
                                                fill: '#2563eb', 
                                                fontSize: 10, 
                                                fontWeight: 'bold'
                                            }} 
                                        />
                                    )}
                                    <Area type="monotone" dataKey="loanBalance" name="ローン残高" stroke="#8c6114" fill="#ebd9c5" fillOpacity={0.3} />
                                    <Line type="monotone" dataKey="accumulatedCashFlow" name="累積キャッシュフロー" stroke="#1e3d2f" strokeWidth={3.5} dot={{ r: 2 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
 
                </div>

                {/* 資金収支の推移表 (1〜10年目、画面用) */}
                <Card title="資金収支の推移表 (1〜10年目)" className="bg-white border border-[#ebd9c5] shadow-md">
                    <p className="text-xs text-[#8c6c59] mb-4 font-medium">
                        ※ 一般的な提案書に用いられる実務フォーマットです。手残り（資金収支）の推移を直感的に把握できます。（単位：千円）
                    </p>

                    {/* 前提条件カード (3枚) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {/* 家賃の改定率等 */}
                        <div className="bg-[#fcf9f2] border border-[#ebd9c5]/60 rounded-xl p-3.5 text-xs space-y-1 shadow-sm">
                            <p className="font-bold text-[#8c6114] border-b border-[#ebd9c5]/40 pb-1 mb-2.5 flex justify-between">
                                <span>📊 家賃の改定率設定</span>
                                <span className="text-[10px] text-slate-400">年率</span>
                            </p>
                            <div className="flex justify-between text-slate-600">
                                <span>住宅家賃下落率</span>
                                <span className="font-mono font-semibold">{localRentDecline.toFixed(1)}% /年</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>非住宅家賃下落率</span>
                                <span className="font-mono font-semibold">{localRentDecline.toFixed(1)}% /年</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>駐車料改定率</span>
                                <span className="font-mono font-semibold">0.0% /年</span>
                            </div>
                        </div>

                        {/* 想定入居率 */}
                        <div className="bg-[#fcf9f2] border border-[#ebd9c5]/60 rounded-xl p-3.5 text-xs space-y-1 shadow-sm">
                            <p className="font-bold text-[#8c6114] border-b border-[#ebd9c5]/40 pb-1 mb-2.5 flex justify-between">
                                <span>🏠 入居率・空室上昇設定</span>
                                <span className="text-[10px] text-slate-400">初期 ➡ 経年</span>
                            </p>
                            <div className="flex justify-between text-slate-600">
                                <span>初期想定入居率</span>
                                <span className="font-mono font-semibold">{data.rentRoll.occupancyRate || 95}%</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>毎年空室上昇幅</span>
                                <span className="font-mono font-semibold">+{localVacancyRise.toFixed(1)}% /年</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>10年目想定入居率</span>
                                <span className="font-mono font-semibold">
                                    {Math.max(0, (data.rentRoll.occupancyRate || 95) - localVacancyRise * 9).toFixed(1)}%
                                </span>
                            </div>
                        </div>

                        {/* 毎年の入替り率等 */}
                        <div className="bg-[#fcf9f2] border border-[#ebd9c5]/60 rounded-xl p-3.5 text-xs space-y-1 shadow-sm">
                            <p className="font-bold text-[#8c6114] border-b border-[#ebd9c5]/40 pb-1 mb-2.5 flex justify-between">
                                <span>🔄 更新・入替り想定</span>
                                <span className="text-[10px] text-slate-400">標準目安</span>
                            </p>
                            <div className="flex justify-between text-slate-600">
                                <span>毎年の入替り率</span>
                                <span className="font-mono font-semibold">25.0% (4年毎)</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>再入居までの空室月数</span>
                                <span className="font-mono font-semibold">1.0 ヶ月</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>更新料設定</span>
                                <span className="font-mono font-semibold">{data.rentRoll.renewalFeeMonth || 1} ヶ月 / 2年</span>
                            </div>
                        </div>
                    </div>

                    {/* テーブル表示 */}
                    <div className="overflow-x-auto rounded-xl border border-[#ebd9c5]/60 shadow-sm">
                        <table className="w-full text-xs text-right border-collapse" style={{ minWidth: '950px' }}>
                            <thead>
                                <tr className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white font-bold text-xs uppercase tracking-wider">
                                    <th className="py-2.5 px-3 text-center border border-slate-200 w-32 bg-slate-900/10">項 目</th>
                                    {yearlyDetails.map((d) => (
                                        <th key={d.year} className="py-2.5 px-1.5 border border-slate-200 text-center w-16">{d.year}年目</th>
                                    ))}
                                    <th className="py-2.5 px-3 border border-slate-200 text-center w-24 rounded-tr-xl">1〜10年目計</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {/* 満室時 住宅賃料 */}
                                <tr className="bg-slate-50/55 hover:bg-slate-100/30">
                                    <td className="py-1.5 px-3 border border-slate-200 text-left font-semibold text-slate-700">満室時 住宅賃料</td>
                                    {yearlyDetails.map((d) => (
                                        <td key={d.year} className="py-1.5 px-1.5 border border-slate-200 font-mono text-slate-500">{formatThousandYen(d.income.resRent)}</td>
                                    ))}
                                    <td className="py-1.5 px-3 border border-slate-200 font-mono font-bold text-slate-600 bg-slate-100/30">
                                        {formatThousandYen(getSum((d) => d.income.resRent))}
                                    </td>
                                </tr>
                                {/* 満室時 店舗賃料 */}
                                <tr className="bg-slate-50/55 hover:bg-slate-100/30">
                                    <td className="py-1.5 px-3 border border-slate-200 text-left font-semibold text-slate-700">満室時 店舗賃料</td>
                                    {yearlyDetails.map((d) => (
                                        <td key={d.year} className="py-1.5 px-1.5 border border-slate-200 font-mono text-slate-500">{formatThousandYen(d.income.commRent)}</td>
                                    ))}
                                    <td className="py-1.5 px-3 border border-slate-200 font-mono font-bold text-slate-600 bg-slate-100/30">
                                        {formatThousandYen(getSum((d) => d.income.commRent))}
                                    </td>
                                </tr>
                                {/* 共益費収入 */}
                                <tr className="bg-slate-50/55 hover:bg-slate-100/30">
                                    <td className="py-1.5 px-3 border border-slate-200 text-left font-semibold text-slate-700">共益費収入</td>
                                    {yearlyDetails.map((d) => (
                                        <td key={d.year} className="py-1.5 px-1.5 border border-slate-200 font-mono text-slate-500">{formatThousandYen(d.income.commonFee)}</td>
                                    ))}
                                    <td className="py-1.5 px-3 border border-slate-200 font-mono font-bold text-slate-600 bg-slate-100/30">
                                        {formatThousandYen(getSum((d) => d.income.commonFee))}
                                    </td>
                                </tr>
                                {/* 駐車料収入 */}
                                <tr className="bg-slate-50/55 hover:bg-slate-100/30">
                                    <td className="py-1.5 px-3 border border-slate-200 text-left font-semibold text-slate-700">駐車料収入</td>
                                    {yearlyDetails.map((d) => (
                                        <td key={d.year} className="py-1.5 px-1.5 border border-slate-200 font-mono text-slate-500">{formatThousandYen(d.income.parking)}</td>
                                    ))}
                                    <td className="py-1.5 px-3 border border-slate-200 font-mono font-bold text-slate-600 bg-slate-100/30">
                                        {formatThousandYen(getSum((d) => d.income.parking))}
                                    </td>
                                </tr>
                                {/* 満室収入小計 (A) */}
                                <tr className="bg-blue-50/20 font-bold text-blue-900 border-t-2 border-slate-300">
                                    <td className="py-1.5 px-3 border border-slate-200 text-left">満室収入小計 (A)</td>
                                    {yearlyDetails.map((d) => (
                                        <td key={d.year} className="py-1.5 px-1.5 border border-slate-200 font-mono">{formatThousandYen(d.income.subtotal)}</td>
                                    ))}
                                    <td className="py-1.5 px-3 border border-slate-200 font-mono bg-blue-100/30">
                                        {formatThousandYen(getSum((d) => d.income.subtotal))}
                                    </td>
                                </tr>
                                {/* 空室損失 */}
                                <tr className="text-rose-600 bg-rose-50/10 hover:bg-rose-100/10">
                                    <td className="py-1.5 px-3 border border-slate-200 text-left">空室損失</td>
                                    {yearlyDetails.map((d) => (
                                        <td key={d.year} className="py-1.5 px-1.5 border border-slate-200 font-mono">▲ {formatThousandYen(d.income.vacancyLoss)}</td>
                                    ))}
                                    <td className="py-1.5 px-3 border border-slate-200 font-mono font-bold bg-rose-100/10">
                                        ▲ {formatThousandYen(getSum((d) => d.income.vacancyLoss))}
                                    </td>
                                </tr>
                                {/* 差引実質収入 (B) */}
                                <tr className="font-semibold text-slate-800 bg-slate-100/30 hover:bg-slate-200/20">
                                    <td className="py-1.5 px-3 border border-slate-200 text-left">差引実質収入 (B)</td>
                                    {yearlyDetails.map((d) => (
                                        <td key={d.year} className="py-1.5 px-1.5 border border-slate-200 font-mono">{formatThousandYen(d.income.diff)}</td>
                                    ))}
                                    <td className="py-1.5 px-3 border border-slate-200 font-mono font-bold bg-slate-200/30">
                                        {formatThousandYen(getSum((d) => d.income.diff))}
                                    </td>
                                </tr>
                                {/* 預り敷金・保証金 */}
                                <tr className="hover:bg-slate-50">
                                    <td className="py-1.5 px-3 border border-slate-200 text-left font-medium text-slate-500">預り敷金・保証金</td>
                                    {yearlyDetails.map((d) => (
                                        <td key={d.year} className="py-1.5 px-1.5 border border-slate-200 font-mono text-slate-500">{formatThousandYen(d.income.securityDeposit)}</td>
                                    ))}
                                    <td className="py-1.5 px-3 border border-slate-200 font-mono font-bold text-slate-600 bg-slate-100/20">
                                        {formatThousandYen(getSum((d) => d.income.securityDeposit))}
                                    </td>
                                </tr>
                                {/* 建設協力金調達 (借地リース時のみ) */}
                                {data.mode === 'land_lease' && (
                                    <tr className="hover:bg-slate-50">
                                        <td className="py-1.5 px-3 border border-slate-200 text-left font-medium text-slate-500">建設協力金調達</td>
                                        {yearlyDetails.map((d) => (
                                            <td key={d.year} className="py-1.5 px-1.5 border border-slate-200 font-mono text-slate-500">{formatThousandYen(d.income.cooperationMoney)}</td>
                                        ))}
                                        <td className="py-1.5 px-3 border border-slate-200 font-mono font-bold text-slate-600 bg-slate-100/20">
                                            {formatThousandYen(getSum((d) => d.income.cooperationMoney))}
                                        </td>
                                    </tr>
                                )}
                                {/* 収入合計 (イ) */}
                                <tr className="bg-emerald-50/20 font-bold text-emerald-900 border-t border-b-2 border-slate-300">
                                    <td className="py-1.5 px-3 border border-slate-200 text-left">収入合計 (イ)</td>
                                    {yearlyDetails.map((d) => (
                                        <td key={d.year} className="py-1.5 px-1.5 border border-slate-200 font-mono text-emerald-850">{formatThousandYen(d.income.totalIncome)}</td>
                                    ))}
                                    <td className="py-1.5 px-3 border border-slate-200 font-mono text-emerald-900 bg-emerald-100/30">
                                        {formatThousandYen(getSum((d) => d.income.totalIncome))}
                                    </td>
                                </tr>

                                {/* 借入金返済 (元利金) */}
                                <tr className="hover:bg-slate-50">
                                    <td className="py-1.5 px-3 border border-slate-200 text-left font-semibold text-slate-700">借入金返済 (元利金)</td>
                                    {yearlyDetails.map((d) => (
                                        <td key={d.year} className="py-1.5 px-1.5 border border-slate-200 font-mono text-slate-600">▲ {formatThousandYen(d.expense.ads)}</td>
                                    ))}
                                    <td className="py-1.5 px-3 border border-slate-200 font-mono font-bold text-slate-700 bg-slate-100/30">
                                        ▲ {formatThousandYen(getSum((d) => d.expense.ads))}
                                    </td>
                                </tr>
                                {/* 運営経費 (管理・BM等) */}
                                <tr className="hover:bg-slate-50">
                                    <td className="py-1.5 px-3 border border-slate-200 text-left font-medium text-slate-500">運営経費 (管理・BM等)</td>
                                    {yearlyDetails.map((d) => (
                                        <td key={d.year} className="py-1.5 px-1.5 border border-slate-200 font-mono text-slate-500">▲ {formatThousandYen(d.expense.management)}</td>
                                    ))}
                                    <td className="py-1.5 px-3 border border-slate-200 font-mono font-bold text-slate-600 bg-slate-100/20">
                                        ▲ {formatThousandYen(getSum((d) => d.expense.management))}
                                    </td>
                                </tr>
                                {/* 建設協力金返還支出 (借地リース時のみ) */}
                                {data.mode === 'land_lease' && (
                                    <tr className="hover:bg-slate-50 text-amber-800">
                                        <td className="py-1.5 px-3 border border-slate-200 text-left font-medium">建設協力金返還支出</td>
                                        {yearlyDetails.map((d) => (
                                            <td key={d.year} className="py-1.5 px-1.5 border border-slate-200 font-mono text-amber-700">▲ {formatThousandYen(d.expense.cooperationReturn)}</td>
                                        ))}
                                        <td className="py-1.5 px-3 border border-slate-200 font-mono font-bold bg-slate-100/20 text-amber-900">
                                            ▲ {formatThousandYen(getSum((d) => d.expense.cooperationReturn))}
                                        </td>
                                    </tr>
                                )}

                                {/* 租税 土地・固定資産税 */}
                                <tr className="bg-slate-50/20 text-[10px] text-slate-500 hover:bg-slate-100/10">
                                    <td className="py-1 px-3 border border-slate-200 text-left pl-5">租税 土地・固定資産税</td>
                                    {yearlyDetails.map((d) => (
                                        <td key={d.year} className="py-1 px-1.5 border border-slate-200 font-mono">▲ {formatThousandYen(d.expense.landFixed)}</td>
                                    ))}
                                    <td className="py-1 px-3 border border-slate-200 font-mono bg-slate-100/40">
                                        ▲ {formatThousandYen(getSum((d) => d.expense.landFixed))}
                                    </td>
                                </tr>
                                {/* 租税 土地・都市計画税 */}
                                <tr className="bg-slate-50/20 text-[10px] text-slate-500 hover:bg-slate-100/10">
                                    <td className="py-1 px-3 border border-slate-200 text-left pl-5">租税 土地・都市計画税</td>
                                    {yearlyDetails.map((d) => (
                                        <td key={d.year} className="py-1 px-1.5 border border-slate-200 font-mono">▲ {formatThousandYen(d.expense.landCity)}</td>
                                    ))}
                                    <td className="py-1 px-3 border border-slate-200 font-mono bg-slate-100/40">
                                        ▲ {formatThousandYen(getSum((d) => d.expense.landCity))}
                                    </td>
                                </tr>
                                {/* 租税 建物・固定資産税 */}
                                <tr className="bg-slate-50/20 text-[10px] text-slate-500 hover:bg-slate-100/10">
                                    <td className="py-1 px-3 border border-slate-200 text-left pl-5">租税 建物・固定資産税</td>
                                    {yearlyDetails.map((d) => (
                                        <td key={d.year} className="py-1 px-1.5 border border-slate-200 font-mono">▲ {formatThousandYen(d.expense.buildingFixed)}</td>
                                    ))}
                                    <td className="py-1 px-3 border border-slate-200 font-mono bg-slate-100/40">
                                        ▲ {formatThousandYen(getSum((d) => d.expense.buildingFixed))}
                                    </td>
                                </tr>
                                {/* 租税 建物・都市計画税 */}
                                <tr className="bg-slate-50/20 text-[10px] text-slate-500 hover:bg-slate-100/10">
                                    <td className="py-1 px-3 border border-slate-200 text-left pl-5">租税 建物・都市計画税</td>
                                    {yearlyDetails.map((d) => (
                                        <td key={d.year} className="py-1 px-1.5 border border-slate-200 font-mono">▲ {formatThousandYen(d.expense.buildingCity)}</td>
                                    ))}
                                    <td className="py-1 px-3 border border-slate-200 font-mono bg-slate-100/40">
                                        ▲ {formatThousandYen(getSum((d) => d.expense.buildingCity))}
                                    </td>
                                </tr>

                                {/* 支出合計 (ロ) */}
                                <tr className="bg-violet-50/20 font-bold text-violet-900 border-t border-b-2 border-slate-300">
                                    <td className="py-1.5 px-3 border border-slate-200 text-left">支出合計 (ロ)</td>
                                    {yearlyDetails.map((d) => (
                                        <td key={d.year} className="py-1.5 px-1.5 border border-slate-200 font-mono text-violet-850">▲ {formatThousandYen(d.expense.totalExpense)}</td>
                                    ))}
                                    <td className="py-1.5 px-3 border border-slate-200 font-mono text-violet-900 bg-violet-100/30">
                                        ▲ {formatThousandYen(getSum((d) => d.expense.totalExpense))}
                                    </td>
                                </tr>

                                {/* 差引：資金収支 (手残り) */}
                                <tr className="bg-[#1e3d2f] text-white font-extrabold text-sm border-t-2 border-b-2 border-[#1e3d2f]">
                                    <td className="py-2 px-3 border border-slate-300 text-left">差引：資金収支 (手残り)</td>
                                    {yearlyDetails.map((d) => (
                                        <td key={d.year} className="py-2 px-1.5 border border-slate-300 font-mono">
                                            {formatThousandYen(d.expense.netCashflow, true)}
                                        </td>
                                    ))}
                                    <td className="py-2 px-3 border border-slate-300 font-mono bg-[#162e23] text-emerald-250 font-black">
                                        {formatThousandYen(getSum((d) => d.expense.netCashflow), true)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* 35年間 資金収支詳細テーブル (画面用) */}
                <Card title="35年間 資金収支詳細テーブル" className="bg-white">
                    <p className="text-xs text-[#8c6c59] mb-3 font-medium">※ 横スクロールで全35年分の詳細な資金推移（年間収支・累計収支・ローン残高）を確認できます。</p>
                    <div className="overflow-x-auto rounded-xl border border-[#ebd9c5]/60 shadow-sm max-h-96">
                        <table className="w-full text-xs text-right border-collapse" style={{ minWidth: '1000px' }}>
                            <thead className="bg-[#fcf9f2] text-[#3d251a] font-bold text-xs border-b border-[#ebd9c5] sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="py-2.5 px-3 text-center border-r border-[#ebd9c5] w-12 bg-[#fcf9f2]">年</th>
                                    <th className="py-2.5 px-3 border-r border-[#ebd9c5] bg-[#fcf9f2]">実効総収入 (EGI)</th>
                                    <th className="py-2.5 px-3 border-r border-[#ebd9c5] bg-[#fcf9f2]">運営費 (OPEX)</th>
                                    <th className="py-2.5 px-3 border-r border-[#ebd9c5] bg-[#fcf9f2]">営業純利益 (NOI)</th>
                                    <th className="py-2.5 px-3 border-r border-[#ebd9c5] bg-[#fcf9f2]">ローン返済 (ADS)</th>
                                    <th className="py-2.5 px-3 border-r border-[#ebd9c5] bg-[#fcf9f2]">税引前CF (BTCF)</th>
                                    <th className="py-2.5 px-3 border-r border-[#ebd9c5] bg-[#fcf9f2]">所得税額 (Tax)</th>
                                    <th className="py-2.5 px-3 border-r border-[#ebd9c5] bg-emerald-50 text-emerald-800 font-extrabold">年間収支 (ATCF)</th>
                                    <th className="py-2.5 px-3 border-r border-[#ebd9c5] bg-amber-50 text-[#8c6114] font-extrabold">累積収支 (CF)</th>
                                    <th className="py-2.5 px-3 text-[#3d251a] font-extrabold bg-[#fcf9f2]">ローン残高</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ebd9c5]/30">
                                {projectionData.map((row, i) => {
                                    const isHighlight = row.year % 5 === 0;
                                    return (
                                        <tr key={row.year} className={`font-mono transition-colors hover:bg-[#ebd9c5]/5 ${i % 2 !== 0 ? 'bg-[#ebd9c5]/5' : 'bg-white'} ${isHighlight ? '!bg-[#ebd9c5]/15 font-bold' : ''}`}>
                                            <td className="py-2 px-3 text-center text-[#8c6114] border-r border-[#ebd9c5]/30 font-bold">{row.year}年</td>
                                            <td className="py-2 px-3 border-r border-[#ebd9c5]/30 text-slate-600">{formatCurrency(row.effectiveIncome)}</td>
                                            <td className="py-2 px-3 border-r border-[#ebd9c5]/30 text-slate-600">{formatCurrency(row.opex)}</td>
                                            <td className="py-2 px-3 border-r border-[#ebd9c5]/30 text-blue-800 font-semibold">{formatCurrency(row.noi)}</td>
                                            <td className="py-2 px-3 border-r border-[#ebd9c5]/30 text-violet-600">{formatCurrency(row.tmT)}</td>
                                            <td className="py-2 px-3 border-r border-[#ebd9c5]/30 text-slate-700">{formatCurrency(row.btcf)}</td>
                                            <td className="py-2 px-3 border-r border-[#ebd9c5]/30 text-rose-600">{formatCurrency(row.taxAmount)}</td>
                                            <td className="py-2 px-3 border-r border-[#ebd9c5]/30 font-bold text-emerald-700 bg-emerald-50/20">{formatCurrency(row.atcf)}</td>
                                            <td className={`py-2 px-3 border-r border-[#ebd9c5]/30 font-bold bg-amber-50/20 ${row.accumulatedCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{formatCurrency(row.accumulatedCashFlow)}</td>
                                            <td className="py-2 px-3 text-[#5c3e0a] font-semibold">{formatCurrency(row.loanBalance)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Exit Strategy Section */}
            <Card className="!bg-gradient-to-br from-[#fcf9f2] to-[#ebd9c5]/10 border-[#ebd9c5] shadow-lg no-print">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[#8c6114] flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-[#8c6114]" /> 出口戦略シミュレーション
                    </h3>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-[#3d251a]/85 font-semibold">売却時Cap Rate:</span>
                        <Slider
                            label=""
                            min={3}
                            max={12}
                            step={0.5}
                            value={localExitCapRate}
                            onChange={(v) => setLocalExitCapRate(v)}
                            onMouseUp={() => updateAdvancedSettings({ exitCapRate: localExitCapRate })}
                            onTouchEnd={() => updateAdvancedSettings({ exitCapRate: localExitCapRate })}
                        />
                        <span className="text-lg font-bold text-[#8c6114] w-16">{localExitCapRate.toFixed(1)}%</span>
                    </div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-[#ebd9c5]/60">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-[#ebd9c5] text-[#23150d] text-xs font-bold uppercase tracking-wider">
                                <th className="py-2 px-3 text-center rounded-tl-lg">売却年</th>
                                <th className="py-2 px-3 text-right">売却価格</th>
                                <th className="py-2 px-3 text-right">ローン残債</th>
                                <th className="py-2 px-3 text-right">売却諸経費</th>
                                <th className="py-2 px-3 text-right">譲渡所得税</th>
                                <th className="py-2 px-3 text-right">売却手取り</th>
                                <th className="py-2 px-3 text-right">期間累計CF</th>
                                <th className="py-2 px-3 text-right">トータルリターン</th>
                                <th className="py-2 px-3 text-right rounded-tr-lg">年率リターン</th>
                            </tr>
                        </thead>
                        <tbody>
                            {exitTable.map((row, i) => (
                                <tr key={row.saleYear} className={`border-b border-[#ebd9c5]/20 ${i % 2 !== 0 ? 'bg-[#ebd9c5]/5' : 'bg-white'} ${row.saleYear === 5 ? '!bg-[#ebd9c5]/40 font-bold text-[#23150d]' : ''}`}>
                                    <td className="py-2 px-3 text-center font-bold text-[#8c6114]">{row.saleYear}年目{row.saleYear <= 5 ? ' ✨' : ''}</td>
                                    <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(row.salePrice)}</td>
                                    <td className="py-2 px-3 text-right font-mono tabular-nums text-[#3d251a]/70">{formatCurrency(row.loanBalanceAtSale)}</td>
                                    <td className="py-2 px-3 text-right font-mono tabular-nums text-amber-700">{formatCurrency(row.saleExpenses.total)}</td>
                                    <td className="py-2 px-3 text-right font-mono tabular-nums text-rose-600">{formatCurrency(row.capitalGainsTax)}</td>
                                    <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-[#23150d]">{formatCurrency(row.netSaleProceeds)}</td>
                                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">{formatCurrency(row.totalCashflowDuringHolding)}</td>
                                    <td className={`py-2 px-3 text-right font-mono tabular-nums font-bold ${row.totalReturn >= 0 ? 'text-[#1e3d2f]' : 'text-rose-600'}`}>{formatCurrency(row.totalReturn)}</td>
                                    <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-[#8c6114]">{formatPercent(row.annualizedReturn * 100)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-3 flex gap-4 text-xs text-[#8c6114] font-semibold">
                    <span>※ 5年以下の保有: 短期譲渡税率 39.63%</span>
                    <span>※ 5年超の保有: 長期譲渡税率 20.315%</span>
                </div>
            </Card>

            {/* Scenario Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
                {/* ゴールド＆キャメルベージュ調の高級感あるグラデーションと枠線へ変更 */}
                <Card className="!bg-gradient-to-br from-[#fdfaf5] to-[#fcf9f2] border-[#ebd9c5] shadow-lg">
                    <h3 className="text-lg font-bold text-[#23150d] mb-4">シナリオ比較（楽観 / 標準 / 悲観）</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-[#ebd9c5]">
                                    <th className="py-2 px-2 text-left text-[#3d251a]/70 text-xs font-bold">指標</th>
                                    {scenarios.map(s => (
                                        <th key={s.name} className="py-2 px-2 text-right font-bold" style={{ color: s.color }}>
                                            <span className="inline-flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                                                {s.label}
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="font-mono text-sm">
                                <tr className="border-b border-[#ebd9c5]/30">
                                    <td className="py-2 px-2 text-[#3d251a]/90 font-medium">NOI (初年度)</td>
                                    {scenarios.map(s => <td key={s.name} className="py-2 px-2 text-right text-[#23150d]">{formatCurrency(s.year1Noi)}</td>)}
                                </tr>
                                <tr className="border-b border-[#ebd9c5]/30 bg-[#ebd9c5]/10">
                                    <td className="py-2 px-2 text-[#3d251a]/90 font-medium">BTCF (初年度)</td>
                                    {scenarios.map(s => <td key={s.name} className="py-2 px-2 text-right text-[#23150d]">{formatCurrency(s.year1Btcf)}</td>)}
                                </tr>
                                <tr className="border-b border-[#ebd9c5]/30">
                                    <td className="py-2 px-2 text-[#3d251a]/90 font-medium">ATCF (初年度)</td>
                                    {scenarios.map(s => <td key={s.name} className="py-2 px-2 text-right text-[#23150d]">{formatCurrency(s.year1Atcf)}</td>)}
                                </tr>
                                <tr className="border-b border-[#ebd9c5]/30 bg-[#ebd9c5]/10">
                                    <td className="py-2 px-2 text-[#3d251a]/90 font-medium">DSCR</td>
                                    {scenarios.map(s => (
                                        <td key={s.name} className={`py-2 px-2 text-right font-bold ${s.year1Dscr >= 1.2 ? 'text-[#1e3d2f]' : 'text-rose-600'}`}>
                                            {s.year1Dscr === Infinity ? '∞' : s.year1Dscr.toFixed(2)}倍
                                        </td>
                                    ))}
                                </tr>
                                <tr className="border-b border-[#ebd9c5]/30">
                                    <td className="py-2 px-2 text-[#3d251a]/90 font-medium">IRR (税引後)</td>
                                    {scenarios.map(s => (
                                        <td key={s.name} className="py-2 px-2 text-right font-bold" style={{ color: s.color }}>
                                            {s.irr !== null ? formatPercent(s.irr * 100) : 'N/A'}
                                        </td>
                                    ))}
                                </tr>
                                <tr className="bg-[#ebd9c5]/10">
                                    <td className="py-2 px-2 text-[#3d251a]/90 font-medium">回収期間</td>
                                    {scenarios.map(s => (
                                        <td key={s.name} className="py-2 px-2 text-right font-bold text-[#23150d]">
                                            {s.paybackYear ? `${s.paybackYear}年` : '35年超'}
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Sensitivity Heatmap */}
                {/* ゴールド＆キャメルベージュ調の背景・枠線に統一 */}
                <Card className="!bg-gradient-to-br from-[#fdfaf5] to-[#fcf9f2] border-[#ebd9c5] shadow-lg">
                    <h3 className="text-lg font-bold text-[#23150d] mb-2">感度分析ヒートマップ</h3>
                    <p className="text-xs text-[#8c6114] mb-3 font-semibold">家賃下落率 × 空室上昇率 → IRR (内部収益率)</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr>
                                    <th className="py-2 px-2 text-left text-[#8c6114] text-[10px] font-bold">空室↓ \ 家賃→</th>
                                    {rentDeclineHeaders.map(rd => (
                                        <th key={rd} className="py-2 px-2 text-center text-[#8c6114] font-bold">{rd}%</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sensitivityMatrix.map((row, ri) => (
                                    <tr key={ri}>
                                        <td className="py-1 px-2 text-[#8c6114] font-bold">{row[0].vacancyRise}%</td>
                                        {row.map((cell, ci) => {
                                            const irr = cell.irr;
                                            const irrPct = irr !== null ? irr * 100 : -999;
                                            
                                            // ゴールド・茶系・フォレストグリーンテーマに最適化した高コントラストな配色設定
                                            let bg = '#fdf0f0';
                                            let textColor = '#b91c1c';
                                            if (irrPct > 5) { 
                                                bg = '#1e3d2f'; // 非常に高い収益性：深みのあるフォレストグリーン背景
                                                textColor = '#fdfaf5'; // 白に近いクリーム色文字
                                            } else if (irrPct > 3) { 
                                                bg = '#e8f2ec'; // 良好：淡いフォレストグリーン背景
                                                textColor = '#1e3d2f'; // 深いフォレストグリーン文字
                                            } else if (irrPct > 1) { 
                                                bg = '#fdf5e2'; // 通常：淡いゴールド背景
                                                textColor = '#8c6114'; // アンティークゴールド文字
                                            } else if (irrPct > 0) { 
                                                bg = '#fcf1e3'; // 低収益：淡いキャメル背景
                                                textColor = '#a87c28'; // ゴールド文字
                                            }

                                            return (
                                                <td key={ci} className="py-1.5 px-2 text-center font-mono font-extrabold rounded-sm border border-white/50" style={{ backgroundColor: bg, color: textColor }}>
                                                    {irr !== null ? `${irrPct.toFixed(1)}%` : 'N/A'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* ヒートマップの判例カラーも上記と完全同期 */}
                    <div className="flex flex-wrap gap-3 mt-3 text-[10px] font-bold text-[#3d251a]/80">
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded border border-[#ebd9c5]" style={{ backgroundColor: '#1e3d2f' }} /> 5%以上
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded border border-[#ebd9c5]" style={{ backgroundColor: '#e8f2ec' }} /> 3-5%
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded border border-[#ebd9c5]" style={{ backgroundColor: '#fdf5e2' }} /> 1-3%
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded border border-[#ebd9c5]" style={{ backgroundColor: '#fcf1e3' }} /> 0-1%
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded border border-[#ebd9c5]" style={{ backgroundColor: '#fdf0f0' }} /> マイナス
                        </span>
                    </div>
                </Card>
            </div>

            {/* 戻るボタンの親枠線をゴールド調に変更 */}
            <div className="flex justify-start pt-6 border-t border-[#ebd9c5] no-print">
                <Button variant="ghost" onClick={prevStep} className="flex items-center gap-2 text-[#3d251a] hover:bg-[#ebd9c5]/20 hover:text-[#23150d]">
                    <ArrowLeft className="h-4 w-4" /> 戻る (条件変更)
                </Button>
            </div>

            {/* Disclaimer for Screen View */}
            {/* 免責事項の背景をクリーム、枠線をゴールド、文字をココア色にし視認性を大幅向上 */}
            <div className="mt-8 p-4 bg-[#fcf9f2] border border-[#ebd9c5] rounded-lg text-xs text-[#3d251a]/95 space-y-1 shadow-sm">
                <p className="font-bold text-[#23150d]">【 免責事項・ご注意 】</p>
                <ul className="list-disc list-inside space-y-0.5 ml-1 font-semibold">
                    <li>本シミュレーション結果はあくまでも概算の提案であり、将来の収益を保証するものではありません。</li>
                    <li>税金や諸経費は一般的な税率や評価額をもとにした概算です。正確な数値については税理士等の専門家へご確認下さい。</li>
                    <li>事業開始後における地価や建築費、金利の変動、賃料や修繕費用の変化を完全に予想したものではありません。</li>
                </ul>
                <div className="text-[10px] text-[#ebd9c5] text-right mt-2 font-mono">v1.3</div>
            </div>


        </div>
    );
};
