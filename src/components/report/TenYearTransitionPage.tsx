import React from 'react';
import type { SimulationData } from '../../stores/useSimulationStore';
import { calculateLongTermProjection } from '../../utils/simulationProjection';

interface TenYearTransitionPageProps {
    data: SimulationData;
    pageNumber?: number;
}

/**
 * 日本語コメント:
 * 円単位の数値を「千円」に変換し、カンマ区切りで表示するフォーマッター。
 * マイナスの場合は「▲」記号を付与します。
 */
const formatThousandYen = (yen: number | undefined, isMinusTriangle: boolean = false): string => {
    if (yen === undefined || yen === 0) return '—';
    const val = Math.round(yen / 1000);
    if (val < 0) {
        return isMinusTriangle ? `▲ ${Math.abs(val).toLocaleString()}` : `-${Math.abs(val).toLocaleString()}`;
    }
    return val.toLocaleString();
};

export const TenYearTransitionPage: React.FC<TenYearTransitionPageProps> = ({ data, pageNumber }) => {
    // 35年の詳細シミュレーションデータを計算
    const projection = calculateLongTermProjection(data);

    const isLeaseMode = data.mode === 'land_lease';

    // === 収入内訳の算出（1〜10年分） ===
    // 住宅賃料・店舗賃料・共益費・駐車料の各年における満室想定年額
    const totalMonthlyRentOnlyRes = data.rentRoll.roomTypes
        .filter((r) => (r.usage || 'residential') === 'residential')
        .reduce((acc, r) => acc + r.rent * r.count, 0);

    const totalMonthlyRentOnlyComm = data.rentRoll.roomTypes
        .filter((r) => r.usage === 'commercial')
        .reduce((acc, r) => acc + r.rent * r.count, 0);

    const totalMonthlyCommonFee = data.rentRoll.roomTypes.reduce((acc, r) => acc + r.commonFee * r.count, 0);
    const totalMonthlyParking = data.rentRoll.parkingCount * data.rentRoll.parkingFee;

    // 家賃下落率を考慮した各年の収入計算
    const rentDeclineRate = data.advancedSettings?.rentDeclineRate ?? 1.0;

    const getYearlyIncomeDetail = (year: number) => {
        const declineFactor = Math.pow(1 - rentDeclineRate / 100, year - 1);
        const resRent = totalMonthlyRentOnlyRes * 12 * declineFactor;
        const commRent = totalMonthlyRentOnlyComm * 12 * declineFactor;
        const commonFee = totalMonthlyCommonFee * 12 * declineFactor;
        const parking = totalMonthlyParking * 12; // 駐車場は下落なしと仮定
        const other = (data.rentRoll.otherRevenue + (data.rentRoll.solarPowerIncome || 0)) * 12;
        const subtotal = resRent + commRent + commonFee + parking + other;

        // 空室損失の計算
        const baseVacancyRate = data.rentRoll.occupancyRate !== undefined ? (100 - data.rentRoll.occupancyRate) : 5;
        const vacancyRiseRate = data.advancedSettings?.vacancyRiseRate ?? 0.5;
        let currentVacancyRate = baseVacancyRate + (vacancyRiseRate * (year - 1));
        if (currentVacancyRate > 100) currentVacancyRate = 100;
        if (currentVacancyRate < 0) currentVacancyRate = 0;

        const vacancyLoss = subtotal * (currentVacancyRate / 100);
        const diff = subtotal - vacancyLoss; // 差引

        // 敷金・保証金の一時金（1年目の期首に預かり敷金総額を計上、2年目以降は0）
        const securityDeposit = year === 1 ? (data.funding.securityDepositIn || 0) * 10000 : 0;
        // 建設協力金調達額 (1年目に計上、借地リースのみ)
        const cooperationMoney = (year === 1 && isLeaseMode) ? (data.funding.cooperationMoney || 0) * 10000 : 0;

        const totalIncome = diff + securityDeposit + cooperationMoney;

        return { resRent, commRent, commonFee, parking, subtotal, vacancyLoss, diff, securityDeposit, cooperationMoney, totalIncome };
    };

    // === 支出内訳の算出（1〜10年分） ===
    const getYearlyExpenseDetail = (year: number) => {
        const row = projection.find((p) => p.year === year);
        if (!row) {
            return { ads: 0, management: 0, publicTaxes: 0, opexOther: 0, totalExpense: 0, netCashflow: 0 };
        }

        // 借入金返済額 (元利合計)
        const ads = row.tmT;

        // 租税公課 (土地固定、土地都市、建物固定、建物都市)
        // 借地リースの場合は土地の税金は地主負担のため0
        const landFixed = isLeaseMode ? 0 : (data.expenses.fixedAssetTaxLand || 0);
        const landCity = isLeaseMode ? 0 : (data.expenses.cityPlanningTaxLand || 0);
        const buildingFixed = data.expenses.fixedAssetTaxBuilding || 0;
        const buildingCity = data.expenses.cityPlanningTaxBuilding || 0;
        const publicTaxes = landFixed + landCity + buildingFixed + buildingCity;

        // 運営経費 (管理費・BM費・修繕積立・その他、ただし固都税は除く)
        // 借地リースの地代も含める
        const landLeaseFeeAnnual = isLeaseMode ? (data.advancedSettings?.landLeaseFee ?? 0) * 12 : 0;
        const totalTaxInOpex = row.year === 1 ? publicTaxes : publicTaxes; // 経年変化なしと仮定
        const management = row.opex - totalTaxInOpex + landLeaseFeeAnnual;

        const totalExpense = ads + publicTaxes + management + (row.cooperationReturn || 0);
        
        // 資金収支
        const incomeDetail = getYearlyIncomeDetail(year);
        const netCashflow = incomeDetail.totalIncome - totalExpense;

        return { ads, management, publicTaxes, landFixed, landCity, buildingFixed, buildingCity, totalExpense, netCashflow, cooperationReturn: row.cooperationReturn || 0 };
    };

    // 10年間のデータを配列に格納
    const yearlyDetails = Array.from({ length: 10 }, (_, idx) => {
        const y = idx + 1;
        return {
            year: y,
            income: getYearlyIncomeDetail(y),
            expense: getYearlyExpenseDetail(y),
        };
    });

    // 10年間の累計を算出するヘルパー
    const getSum = (selector: (d: typeof yearlyDetails[0]) => number | undefined): number => {
        return yearlyDetails.reduce((sum, d) => sum + (selector(d) || 0), 0);
    };

    return (
        <div className="report-page flex flex-col justify-between" style={{ height: '100%', minHeight: '680px' }}>
            {/* Header */}
            <div className="flex justify-between items-end border-b-2 border-blue-600 pb-2 mb-4 flex-shrink-0">
                <div>
                    <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">資金収支の推移表 (1〜10年目)</h2>
                    <p className="text-[9px] text-slate-500 mt-0.5">{data.title} ｜ 10年間キャッシュフロー概算</p>
                </div>
                <div className="text-right">
                    <p className="text-blue-400 text-[10px] uppercase tracking-widest">Page 0{pageNumber} — 資金推移表</p>
                </div>
            </div>

            {/* Premise Cards (上部前提条件サマリー) */}
            <div className="grid grid-cols-3 gap-4 mb-4 flex-shrink-0">
                {/* 家賃の改定率等 */}
                <div className="bg-[#fcf9f2] border border-[#ebd9c5]/60 rounded-lg p-2.5 text-[10px] space-y-1 shadow-sm">
                    <p className="font-bold text-[#8c6114] border-b border-[#ebd9c5]/40 pb-1 mb-1.5 flex justify-between">
                        <span>📊 家賃の改定率設定</span>
                        <span className="text-[9px] text-slate-400">年率</span>
                    </p>
                    <div className="flex justify-between text-slate-600">
                        <span>住宅家賃下落率</span>
                        <span className="font-mono font-semibold">{rentDeclineRate.toFixed(1)}% /年</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                        <span>非住宅家賃下落率</span>
                        <span className="font-mono font-semibold">{rentDeclineRate.toFixed(1)}% /年</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                        <span>駐車料改定率</span>
                        <span className="font-mono font-semibold">0.0% /年</span>
                    </div>
                </div>

                {/* 入居率 */}
                <div className="bg-[#fcf9f2] border border-[#ebd9c5]/60 rounded-lg p-2.5 text-[10px] space-y-1 shadow-sm">
                    <p className="font-bold text-[#8c6114] border-b border-[#ebd9c5]/40 pb-1 mb-1.5 flex justify-between">
                        <span>🏠 入居率・空室上昇設定</span>
                        <span className="text-[9px] text-slate-400">初期 ➡ 経年</span>
                    </p>
                    <div className="flex justify-between text-slate-600">
                        <span>初期想定入居率</span>
                        <span className="font-mono font-semibold">{data.rentRoll.occupancyRate || 95}%</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                        <span>毎年空室上昇幅</span>
                        <span className="font-mono font-semibold">+{data.advancedSettings?.vacancyRiseRate ?? 0.5}% /年</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                        <span>10年目想定入居率</span>
                        <span className="font-mono font-semibold">
                            {Math.max(0, (data.rentRoll.occupancyRate || 95) - (data.advancedSettings?.vacancyRiseRate ?? 0.5) * 9).toFixed(1)}%
                        </span>
                    </div>
                </div>

                {/* 毎年の入替り率等 */}
                <div className="bg-[#fcf9f2] border border-[#ebd9c5]/60 rounded-lg p-2.5 text-[10px] space-y-1 shadow-sm">
                    <p className="font-bold text-[#8c6114] border-b border-[#ebd9c5]/40 pb-1 mb-1.5 flex justify-between">
                        <span>🔄 更新・入替り想定</span>
                        <span className="text-[9px] text-slate-400">標準目安</span>
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

            {/* Table Area (推移表) */}
            <div className="flex-1 overflow-hidden min-h-0">
                <table className="w-full text-right border-collapse text-[9px]">
                    <thead>
                        <tr className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white font-bold text-[8px] uppercase tracking-wider">
                            <th className="py-2 px-1.5 text-center border border-slate-200 w-16">項 目</th>
                            {yearlyDetails.map((d) => (
                                <th key={d.year} className="py-2 px-1 border border-slate-200 text-center w-16">{d.year}年目</th>
                            ))}
                            <th className="py-2 px-1.5 border border-slate-200 text-center w-20 rounded-tr-lg">1〜10年目計</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {/* 満室時賃貸収入 (内訳) */}
                        <tr className="bg-slate-50/55">
                            <td className="py-1 px-1.5 border border-slate-200 text-left font-semibold">満室時 住宅賃料</td>
                            {yearlyDetails.map((d) => (
                                <td key={d.year} className="py-1 px-1 border border-slate-200 font-mono text-slate-500">{formatThousandYen(d.income.resRent)}</td>
                            ))}
                            <td className="py-1 px-1.5 border border-slate-200 font-mono font-bold text-slate-600 bg-slate-100/30">
                                {formatThousandYen(getSum((d) => d.income.resRent))}
                            </td>
                        </tr>
                        <tr className="bg-slate-50/55">
                            <td className="py-1 px-1.5 border border-slate-200 text-left font-semibold">満室時 店舗賃料</td>
                            {yearlyDetails.map((d) => (
                                <td key={d.year} className="py-1 px-1 border border-slate-200 font-mono text-slate-500">{formatThousandYen(d.income.commRent)}</td>
                            ))}
                            <td className="py-1 px-1.5 border border-slate-200 font-mono font-bold text-slate-600 bg-slate-100/30">
                                {formatThousandYen(getSum((d) => d.income.commRent))}
                            </td>
                        </tr>
                        <tr className="bg-slate-50/55">
                            <td className="py-1 px-1.5 border border-slate-200 text-left font-semibold">共益費収入</td>
                            {yearlyDetails.map((d) => (
                                <td key={d.year} className="py-1 px-1 border border-slate-200 font-mono text-slate-500">{formatThousandYen(d.income.commonFee)}</td>
                            ))}
                            <td className="py-1 px-1.5 border border-slate-200 font-mono font-bold text-slate-600 bg-slate-100/30">
                                {formatThousandYen(getSum((d) => d.income.commonFee))}
                            </td>
                        </tr>
                        <tr className="bg-slate-50/55">
                            <td className="py-1 px-1.5 border border-slate-200 text-left font-semibold">駐車料収入</td>
                            {yearlyDetails.map((d) => (
                                <td key={d.year} className="py-1 px-1 border border-slate-200 font-mono text-slate-500">{formatThousandYen(d.income.parking)}</td>
                            ))}
                            <td className="py-1 px-1.5 border border-slate-200 font-mono font-bold text-slate-600 bg-slate-100/30">
                                {formatThousandYen(getSum((d) => d.income.parking))}
                            </td>
                        </tr>
                        
                        {/* 収入小計 */}
                        <tr className="bg-blue-50/20 font-bold text-blue-900 border-t-2 border-slate-300">
                            <td className="py-1 px-1.5 border border-slate-200 text-left">満室収入小計 (A)</td>
                            {yearlyDetails.map((d) => (
                                <td key={d.year} className="py-1 px-1 border border-slate-200 font-mono">{formatThousandYen(d.income.subtotal)}</td>
                            ))}
                            <td className="py-1 px-1.5 border border-slate-200 font-mono bg-blue-100/30">
                                {formatThousandYen(getSum((d) => d.income.subtotal))}
                            </td>
                        </tr>

                        {/* 空室損失 */}
                        <tr className="text-rose-600 bg-rose-50/10">
                            <td className="py-1 px-1.5 border border-slate-200 text-left">空室損失</td>
                            {yearlyDetails.map((d) => (
                                <td key={d.year} className="py-1 px-1 border border-slate-200 font-mono">▲ {formatThousandYen(d.income.vacancyLoss)}</td>
                            ))}
                            <td className="py-1 px-1.5 border border-slate-200 font-mono font-bold bg-rose-100/10">
                                ▲ {formatThousandYen(getSum((d) => d.income.vacancyLoss))}
                            </td>
                        </tr>

                        {/* 差引 */}
                        <tr className="font-semibold text-slate-800 bg-slate-100/30">
                            <td className="py-1 px-1.5 border border-slate-200 text-left">差引実質収入 (B)</td>
                            {yearlyDetails.map((d) => (
                                <td key={d.year} className="py-1 px-1 border border-slate-200 font-mono">{formatThousandYen(d.income.diff)}</td>
                            ))}
                            <td className="py-1 px-1.5 border border-slate-200 font-mono font-bold bg-slate-200/30">
                                {formatThousandYen(getSum((d) => d.income.diff))}
                            </td>
                        </tr>

                        {/* 一時金収入 */}
                        <tr>
                            <td className="py-1 px-1.5 border border-slate-200 text-left font-medium text-slate-500">預り敷金・保証金</td>
                            {yearlyDetails.map((d) => (
                                <td key={d.year} className="py-1 px-1 border border-slate-200 font-mono text-slate-500">{formatThousandYen(d.income.securityDeposit)}</td>
                            ))}
                            <td className="py-1 px-1.5 border border-slate-200 font-mono font-bold text-slate-600 bg-slate-100/20">
                                {formatThousandYen(getSum((d) => d.income.securityDeposit))}
                            </td>
                        </tr>
                        {isLeaseMode && (
                            <tr>
                                <td className="py-1 px-1.5 border border-slate-200 text-left font-medium text-slate-500">建設協力金調達</td>
                                {yearlyDetails.map((d) => (
                                    <td key={d.year} className="py-1 px-1 border border-slate-200 font-mono text-slate-500">{formatThousandYen(d.income.cooperationMoney)}</td>
                                ))}
                                <td className="py-1 px-1.5 border border-slate-200 font-mono font-bold text-slate-600 bg-slate-100/20">
                                    {formatThousandYen(getSum((d) => d.income.cooperationMoney))}
                                </td>
                            </tr>
                        )}

                        {/* 収入合計 (イ) */}
                        <tr className="bg-emerald-50/20 font-bold text-emerald-900 border-t border-b-2 border-slate-300">
                            <td className="py-1 px-1.5 border border-slate-200 text-left">収入合計 (イ)</td>
                            {yearlyDetails.map((d) => (
                                <td key={d.year} className="py-1 px-1 border border-slate-200 font-mono text-emerald-800">{formatThousandYen(d.income.totalIncome)}</td>
                            ))}
                            <td className="py-1 px-1.5 border border-slate-200 font-mono text-emerald-900 bg-emerald-100/30">
                                {formatThousandYen(getSum((d) => d.income.totalIncome))}
                            </td>
                        </tr>

                        {/* 支出部 */}
                        <tr>
                            <td className="py-1.5 px-1.5 border border-slate-200 text-left font-semibold text-slate-700">借入金返済 (元利金)</td>
                            {yearlyDetails.map((d) => (
                                <td key={d.year} className="py-1.5 px-1 border border-slate-200 font-mono text-slate-600">▲ {formatThousandYen(d.expense.ads)}</td>
                            ))}
                            <td className="py-1.5 px-1.5 border border-slate-200 font-mono font-bold text-slate-700 bg-slate-100/30">
                                ▲ {formatThousandYen(getSum((d) => d.expense.ads))}
                            </td>
                        </tr>
                        <tr>
                            <td className="py-1 px-1.5 border border-slate-200 text-left font-medium text-slate-500">運営経費 (管理・BM等)</td>
                            {yearlyDetails.map((d) => (
                                <td key={d.year} className="py-1 px-1 border border-slate-200 font-mono text-slate-500">▲ {formatThousandYen(d.expense.management)}</td>
                            ))}
                            <td className="py-1 px-1.5 border border-slate-200 font-mono font-bold text-slate-600 bg-slate-100/20">
                                ▲ {formatThousandYen(getSum((d) => d.expense.management))}
                            </td>
                        </tr>
                        {isLeaseMode && (
                            <tr>
                                <td className="py-1 px-1.5 border border-slate-200 text-left font-medium text-amber-700">建設協力金返還支出</td>
                                {yearlyDetails.map((d) => (
                                    <td key={d.year} className="py-1 px-1 border border-slate-200 font-mono text-amber-700">▲ {formatThousandYen(d.expense.cooperationReturn)}</td>
                                ))}
                                <td className="py-1 px-1.5 border border-slate-200 font-mono font-bold text-amber-800 bg-slate-100/20">
                                    ▲ {formatThousandYen(getSum((d) => d.expense.cooperationReturn))}
                                </td>
                            </tr>
                        )}

                        {/* 租税公課 (内訳) */}
                        <tr className="bg-slate-50/30 text-[8px] text-slate-500">
                            <td className="py-0.5 px-3 border border-slate-200 text-left pl-4">租税 土地・固定資産税</td>
                            {yearlyDetails.map((d) => (
                                <td key={d.year} className="py-0.5 px-1 border border-slate-200 font-mono">▲ {formatThousandYen(d.expense.landFixed)}</td>
                            ))}
                            <td className="py-0.5 px-1.5 border border-slate-200 font-mono bg-slate-100/40">
                                ▲ {formatThousandYen(getSum((d) => d.expense.landFixed))}
                            </td>
                        </tr>
                        <tr className="bg-slate-50/30 text-[8px] text-slate-500">
                            <td className="py-0.5 px-3 border border-slate-200 text-left pl-4">租税 土地・都市計画税</td>
                            {yearlyDetails.map((d) => (
                                <td key={d.year} className="py-0.5 px-1 border border-slate-200 font-mono">▲ {formatThousandYen(d.expense.landCity)}</td>
                            ))}
                            <td className="py-0.5 px-1.5 border border-slate-200 font-mono bg-slate-100/40">
                                ▲ {formatThousandYen(getSum((d) => d.expense.landCity))}
                            </td>
                        </tr>
                        <tr className="bg-slate-50/30 text-[8px] text-slate-500">
                            <td className="py-0.5 px-3 border border-slate-200 text-left pl-4">租税 建物・固定資産税</td>
                            {yearlyDetails.map((d) => (
                                <td key={d.year} className="py-0.5 px-1 border border-slate-200 font-mono">▲ {formatThousandYen(d.expense.buildingFixed)}</td>
                            ))}
                            <td className="py-0.5 px-1.5 border border-slate-200 font-mono bg-slate-100/40">
                                ▲ {formatThousandYen(getSum((d) => d.expense.buildingFixed))}
                            </td>
                        </tr>
                        <tr className="bg-slate-50/30 text-[8px] text-slate-500">
                            <td className="py-0.5 px-3 border border-slate-200 text-left pl-4">租税 建物・都市計画税</td>
                            {yearlyDetails.map((d) => (
                                <td key={d.year} className="py-0.5 px-1 border border-slate-200 font-mono">▲ {formatThousandYen(d.expense.buildingCity)}</td>
                            ))}
                            <td className="py-0.5 px-1.5 border border-slate-200 font-mono bg-slate-100/40">
                                ▲ {formatThousandYen(getSum((d) => d.expense.buildingCity))}
                            </td>
                        </tr>

                        {/* 支出合計 (ロ) */}
                        <tr className="bg-violet-50/20 font-bold text-violet-900 border-t border-b-2 border-slate-300">
                            <td className="py-1 px-1.5 border border-slate-200 text-left">支出合計 (ロ)</td>
                            {yearlyDetails.map((d) => (
                                <td key={d.year} className="py-1 px-1 border border-slate-200 font-mono text-violet-800">▲ {formatThousandYen(d.expense.totalExpense)}</td>
                            ))}
                            <td className="py-1 px-1.5 border border-slate-200 font-mono text-violet-900 bg-violet-100/30">
                                ▲ {formatThousandYen(getSum((d) => d.expense.totalExpense))}
                            </td>
                        </tr>

                        {/* 差引：資金収支 */}
                        <tr className="bg-[#1e3d2f] text-white font-extrabold text-xs border-t-2 border-b-2 border-[#1e3d2f]">
                            <td className="py-2 px-1.5 border border-slate-300 text-left">差引：資金収支 (手残り)</td>
                            {yearlyDetails.map((d) => (
                                <td key={d.year} className="py-2 px-1 border border-slate-300 font-mono">
                                    {formatThousandYen(d.expense.netCashflow, true)}
                                </td>
                            ))}
                            <td className="py-2 px-1.5 border border-slate-300 font-mono bg-[#162e23] text-emerald-200">
                                {formatThousandYen(getSum((d) => d.expense.netCashflow), true)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Disclaimer & Footer */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400 flex-shrink-0">
                <span>※ 単位：千円（四捨五入の関係で、各項目の合計値と小計・合計欄が完全には一致しない場合があります）</span>
                {pageNumber && <span className="font-bold text-[9px] text-slate-500">{pageNumber} ページ</span>}
            </div>
        </div>
    );
};
