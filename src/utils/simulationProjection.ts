/**
 * ============================================================
 *  AI組織型コードレビュー済み
 *  レビュー日: 2026-06-01
 *  レビュー部署: バグチェック部 / セキュリティ部 / 改善提案部
 *  統合修正: 開発部
 * ============================================================
 */

import type { SimulationData } from "../stores/useSimulationStore";
import { calculatePmt } from "./calculations";
import {
    calculateDepreciation,
    getYearlyDepreciation,
    calculateIndividualTax,
    calculateCorporateTax,
    type DepreciationInfo,
} from "./taxCalculations";
import { calculateExitAnalysis } from "./exitStrategy";

export interface AnnualData {
    year: number;
    grossIncome: number;
    lostIncome: number; // Vacancy
    effectiveIncome: number; // EGI
    opex: number;
    noi: number;
    tmT: number; // Total Debt Service (ADS)
    interest: number;
    principal: number;
    btcf: number; // Before Tax Cash Flow
    // Tax & Depreciation (Phase 1)
    depreciation: number;
    depreciationBuilding?: number; // [修正] 改善提案部の指摘: 建物本体の減価償却費
    depreciationEquipment?: number; // [修正] 改善提案部の指摘: 附属設備の減価償却費
    taxableIncome: number; // NOI - depreciation - interest
    taxAmount: number;
    atcf: number; // After Tax Cash Flow
    // Balance tracking
    loanBalance: number;
    accumulatedCashFlow: number; // Accumulated ATCF
    // Investment Metrics (Phase 2)
    dscr: number; // NOI / ADS
    ccr: number; // BTCF / Equity
    cooperationReturn?: number; // 借地リース用：建設協力金の年間返還額
}


export const calculateLongTermProjection = (data: SimulationData, years: number = 35): AnnualData[] => {
    const projection: AnnualData[] = [];

    const isLeaseMode = data.mode === 'land_lease';
    const isUsed = data.mode === 'investment_used';

    // --- テナント建設協力金の自動計算 (借地リース用) ---
    // 各部屋の「家賃(月額) × 戸数 × 預り月数」を合算
    let totalCooperationMoneyYen = 0;
    if (isLeaseMode) {
        data.rentRoll.roomTypes.forEach(r => {
            const months = r.cooperationMonths ?? 0;
            totalCooperationMoneyYen += r.rent * r.count * months;
        });
    }

    // 自己資金のマイナス
    const ownCapitalYen = data.funding.ownCapital * 10000;
    // [修正] QA部の指摘: 建設協力金は初期の建築資金に充当されるため、初期の手出し自己資金アウトフローを削減します
    let currentAccumulatedCF = -ownCapitalYen + totalCooperationMoneyYen;

    // --- 建物価格の決定 ---
    // 中古の場合は購入価格×建物割合、新築・借地リースの場合は本体工事費を使用
    const buildingCostYen = isUsed
        ? (data.budget.landPrice * (data.advancedSettings?.buildingRatio ?? 50) / 100) * 10000
        : data.budget.buildingWorksCost * 10000;

    const equipmentRatio = data.advancedSettings?.equipmentRatio ?? 0.2;
    const buildingAge = data.advancedSettings?.buildingAge ?? 0;
    const usefulLifeMethod = data.advancedSettings?.usefulLifeMethod ?? 'simplified';

    // 減価償却費の計算
    const depInfo: DepreciationInfo = calculateDepreciation(
        data.property.structure,
        buildingCostYen,
        equipmentRatio,
        isUsed,
        buildingAge,
        usefulLifeMethod,
        data.advancedSettings?.customBuildingUsefulLife,
        data.advancedSettings?.customEquipmentUsefulLife
    );

    // --- 税務設定 ---
    const taxMode = data.advancedSettings?.taxMode ?? 'individual';
    const otherIncome = data.advancedSettings?.otherIncome ?? 0;

    // --- 金利上昇率 ---
    const interestRateRise = data.advancedSettings?.interestRateRise ?? 0;

    // --- ローンの初期状態 ---
    let loans = data.funding.loans.map(loan => ({
        ...loan,
        remainingBalance: loan.amount * 10000,
        baseRate: loan.rate,
        currentRate: loan.rate,
        monthlyPmt: calculatePmt(loan.amount * 10000, loan.rate, loan.duration),
        yearAds: 0,
        yearInterest: 0,
        yearPrincipal: 0
    }));

    // --- 満室想定の年額潜在総収入 (GPI) ---
    const annualPotentialGrossIncome =
        ((data.rentRoll.roomTypes.reduce((acc, r) => acc + (r.rent + r.commonFee) * r.count, 0) +
            (data.rentRoll.parkingCount * data.rentRoll.parkingFee) +
            (data.rentRoll.solarPowerIncome || 0) +
            data.rentRoll.otherRevenue) * 12);

    // --- 固定運営費 (OPEX) ---
    // 【借地リース特別ルール】土地の固定資産税・都市計画税は地主負担（自社は支払わないため0円）
    const fixedAssetTaxLand = isLeaseMode ? 0 : data.expenses.fixedAssetTaxLand;
    const cityPlanningTaxLand = isLeaseMode ? 0 : data.expenses.cityPlanningTaxLand;
    const landLeaseFeeAnnual = isLeaseMode ? (data.advancedSettings?.landLeaseFee ?? 0) * 12 : 0; // 地主へ支払う年間地代

    const isNewOrLease = data.mode === 'land_new' || data.mode === 'land_lease';
    // [修正] QA部の指摘: 新築・借地リースの場合は毎年の火災保険料は5年一括保険料を5分割で均等期間按分（経費化）します。
    // キャッシュアウトとしては別途スポットで計上します。
    const fireInsuranceAnnual = isNewOrLease 
        ? ((data.budget.fireInsurancePrepaid || 0) * 10000) / 5
        : data.expenses.fireInsuranceAnnual;

    const fixedOpexPart =
        (data.expenses.buildingMaintenance * 12) +
        (data.expenses.maintenanceReserve * 12) +
        fixedAssetTaxLand +
        cityPlanningTaxLand +
        data.expenses.fixedAssetTaxBuilding +
        data.expenses.cityPlanningTaxBuilding +
        fireInsuranceAnnual +
        data.expenses.otherExpenses +
        landLeaseFeeAnnual; // 年間地代を運営費に加算

    for (let y = 1; y <= years; y++) {
        // === 1. 収入計算 ===
        const rentDeclineRate = data.advancedSettings?.rentDeclineRate ?? 1.0;
        const vacancyRiseRate = data.advancedSettings?.vacancyRiseRate ?? 0.5;

        const currentYearGrossIncome = annualPotentialGrossIncome * Math.pow(1 - rentDeclineRate / 100, y - 1);
        
        // 【論理バグ修正】想定入居率が 0% の場合でも正しく動作するように、undefined または null のみを厳密判定
        const baseVacancyRate = (data.rentRoll.occupancyRate !== undefined && data.rentRoll.occupancyRate !== null)
            ? (100 - data.rentRoll.occupancyRate)
            : 5.0;
            
        let currentVacancyRate = baseVacancyRate + (vacancyRiseRate * (y - 1));
        if (currentVacancyRate > 100) currentVacancyRate = 100;
        if (currentVacancyRate < 0) currentVacancyRate = 0; // 下限ガードを追加

        const lostIncome = currentYearGrossIncome * (currentVacancyRate / 100);
        const effectiveIncome = currentYearGrossIncome - lostIncome;

        // === 2. OPEX ===
        let managementFee = 0;
        if (data.expenses.managementFeeMode === 'ratio') {
            managementFee = effectiveIncome * (data.expenses.managementFeeRatio / 100);
        } else {
            managementFee = data.expenses.managementFeeFixed * 12;
        }

        // [修正] QA部の指摘: 5年一括火災保険料は期間按分して fixedOpexPart に毎年計上するため、opex計算上でのスポット加算は廃止します。
        const opex = fixedOpexPart + managementFee;
        const noi = effectiveIncome - opex;

        // 火災保険料（5年一括）の5年周期スポット更新キャッシュアウト (6, 11, 16, 21, 26, 31年目の期首に再発生)
        let spotFireInsuranceOutflow = 0;
        if (isNewOrLease && y > 1 && y % 5 === 1) {
            spotFireInsuranceOutflow = (data.budget.fireInsurancePrepaid || 0) * 10000;
        }

        // === 3. Debt Service (with interest rate rise) ===
        let annualAds = 0;
        let annualInterest = 0;
        let annualPrincipal = 0;
        let totalBalance = 0;

        loans = loans.map(loan => {
            if (y > loan.duration) {
                return { ...loan, remainingBalance: 0 };
            }

            // Apply interest rate rise (cumulative per year)
            const rateIncrease = interestRateRise * (y - 1);
            const effectiveRate = loan.baseRate + rateIncrease;

            let loanAds = 0;
            let loanInterest = 0;
            let loanPrincipal = 0;
            let balance = loan.remainingBalance;

            // Recalculate monthly payment with new rate
            const monthlyPmt = calculatePmt(balance, effectiveRate, Math.max(loan.duration - y + 1, 1));

            for (let m = 0; m < 12; m++) {
                if (balance <= 0) break;
                const interest = balance * (effectiveRate / 100) / 12;
                let principal = monthlyPmt - interest;
                if (balance < principal) principal = balance;

                balance -= principal;
                loanInterest += interest;
                loanPrincipal += principal;
                loanAds += (interest + principal);
            }

            return {
                ...loan,
                currentRate: effectiveRate,
                remainingBalance: balance,
                yearAds: loanAds,
                yearInterest: loanInterest,
                yearPrincipal: loanPrincipal
            };
        });

        loans.forEach(l => {
            if (y <= l.duration) {
                annualAds += l.yearAds || 0;
                annualInterest += l.yearInterest || 0;
                annualPrincipal += l.yearPrincipal || 0;
            }
            totalBalance += l.remainingBalance;
        });

        // === 4. テナント建設協力金返却の算出 (借地リース用) ===
        // 【借地リース特別ルール】預かった建設協力金は返還期間にわたり毎年テナントに均等返還します
        let annualCooperationReturnYen = 0;
        if (isLeaseMode) {
            data.rentRoll.roomTypes.forEach(r => {
                // [修正] セキュリティ部の指摘: 返還期間が0年以下・負数の場合のゼロ除算・負数インジェクションをガード
                const rawReturnYears = r.cooperationReturnYears;
                const returnYears = (typeof rawReturnYears === 'number' && rawReturnYears > 0) ? Math.floor(rawReturnYears) : 20;
                if (y <= returnYears) {
                    const totalCoop = (r.rent || 0) * (r.count || 0) * (r.cooperationMonths ?? 0);
                    annualCooperationReturnYen += totalCoop / returnYears;
                }
            });
        }

        // === 5. BTCF (税引前キャッシュフロー) ===
        // 営業純利益 (NOI) - ローン返済 (ADS) - 建設協力金返還額 - [修正]火災保険スポット支払額
        const btcf = noi - annualAds - annualCooperationReturnYen - spotFireInsuranceOutflow;

        // === 6. 減価償却費 ＆ 課税所得 (Phase 1) ===
        const yearDepreciation = getYearlyDepreciation(depInfo, y);
        // [修正] 改善提案部の指摘: 積層グラフ表示用に建物本体と設備の償却費を個別に算出
        const yearDeprBuilding = y <= depInfo.buildingUsefulLife ? depInfo.buildingDepreciation : 0;
        const yearDeprEquipment = y <= depInfo.equipmentUsefulLife ? depInfo.equipmentDepreciation : 0;

        // 課税所得 = NOI - 減価償却費 - ローン金利 (※元金返済および建設協力金返済は経費外支出)
        const taxableIncome = noi - yearDepreciation - annualInterest;

        let taxAmount = 0;
        if (taxMode === 'individual') {
            taxAmount = calculateIndividualTax(taxableIncome, otherIncome);
        } else {
            taxAmount = calculateCorporateTax(taxableIncome);
        }

        // ATCF (税引後キャッシュフロー) = BTCF - 所得税・住民税
        const atcf = btcf - taxAmount;

        // === 7. 累積キャッシュフロー (ATCFベース) ===
        currentAccumulatedCF += atcf;

        // === 8. 投資分析指標 ===
        const dscr = annualAds > 0 ? noi / annualAds : Infinity;
        const ccr = ownCapitalYen > 0 ? btcf / ownCapitalYen : 0;

        projection.push({
            year: y,
            grossIncome: currentYearGrossIncome,
            lostIncome,
            effectiveIncome,
            opex,
            noi,
            tmT: annualAds,
            interest: annualInterest,
            principal: annualPrincipal,
            btcf,
            depreciation: yearDepreciation,
            depreciationBuilding: yearDeprBuilding, // [修正] 改善提案部の指摘: 建物本体の減価償却費を追加
            depreciationEquipment: yearDeprEquipment, // [修正] 改善提案部の指摘: 設備の減価償却費を追加
            taxableIncome,
            taxAmount,
            atcf,
            loanBalance: totalBalance,
            accumulatedCashFlow: currentAccumulatedCF,
            dscr,
            ccr,
            cooperationReturn: annualCooperationReturnYen, // 借地リース用：建設協力金の年間返還額をマージ
        });
    }

    return projection;
};

/**
 * Calculate IRR using Newton's method
 * cashflows[0] = initial investment (negative), cashflows[1..n] = annual returns
 */
export const calculateIRR = (cashflows: number[], guess: number = 0.1): number | null => {
    // 異符号が混在していない場合は数学的にIRRが定義できないため、計算をスキップして即座にnullを返す
    const hasPositive = cashflows.some(cf => cf > 0);
    const hasNegative = cashflows.some(cf => cf < 0);
    if (!hasPositive || !hasNegative) return null;

    const maxIterations = 100;
    const tolerance = 1e-7;
    let rate = guess;

    for (let i = 0; i < maxIterations; i++) {
        let npv = 0;
        let dnpv = 0; // derivative

        for (let t = 0; t < cashflows.length; t++) {
            const factor = Math.pow(1 + rate, t);
            npv += cashflows[t] / factor;
            dnpv -= t * cashflows[t] / (factor * (1 + rate));
        }

        if (Math.abs(npv) < tolerance) return rate;
        if (Math.abs(dnpv) < tolerance) return null; // derivative too small

        rate = rate - npv / dnpv;
        if (rate < -1) rate = -0.99; // prevent divergence
    }

    // イテレーション終了後、未収束の場合は安全に null を返す
    let finalNpv = 0;
    for (let t = 0; t < cashflows.length; t++) {
        finalNpv += cashflows[t] / Math.pow(1 + rate, t);
    }
    if (Math.abs(finalNpv) >= tolerance) {
        return null; 
    }

    return rate;
};

/**
 * Calculate NPV at a given discount rate
 */
export const calculateNPV = (cashflows: number[], discountRate: number): number => {
    return cashflows.reduce((npv, cf, t) => npv + cf / Math.pow(1 + discountRate, t), 0);
};

/**
 * Get summary investment metrics from projection data
 */
export const getInvestmentMetrics = (
    data: SimulationData,
    projection: AnnualData[],
) => {
    const ownCapitalYen = data.funding.ownCapital * 10000;
    const finalYear = projection[projection.length - 1];

    const isLeaseMode = data.mode === 'land_lease';
    const isUsed = data.mode === 'investment_used';

    // 建設協力金総額の再計算
    let totalCooperationMoneyYen = 0;
    if (isLeaseMode) {
        data.rentRoll.roomTypes.forEach(r => {
            const months = r.cooperationMonths ?? 0;
            totalCooperationMoneyYen += r.rent * r.count * months;
        });
    }

    // --- 最終年の想定売却手取り(Net Sale Proceeds)を計算 ---
    let netSaleProceeds = 0;
    if (finalYear) {
        const exitCapRate = data.advancedSettings?.exitCapRate ?? 6.0;
        
        // 建物・土地の按分コスト (借地リースモードも考慮して完全に算出)
        const buildingCost = isUsed
            ? (data.budget.landPrice * (data.advancedSettings?.buildingRatio ?? 50) / 100) * 10000
            : data.budget.buildingWorksCost * 10000;
            
        // [修正] QA部の指摘: 土地敷金は譲渡所得税の計算（簿価）には含めないため、
        // calculateExitAnalysis で isLeaseMode/landLeaseDeposit を正確に処理できるよう、
        // 借地リースの場合は originalBuildingCost のみとし、landCost は 0 とします。
        // また新築（land_new）時は、demolitionCost（解体費）を土地の取得簿価に正しく算入します。
        const landCost = isLeaseMode
            ? 0
            : (isUsed
                ? (data.budget.landPrice * (100 - (data.advancedSettings?.buildingRatio ?? 50)) / 100) * 10000
                : (data.budget.landPrice + (data.budget.demolitionCost ?? 0)) * 10000);

        const landLeaseDepositYen = isLeaseMode ? (data.budget.landLeaseDeposit ?? 0) * 10000 : 0;

        const depInfo: DepreciationInfo = calculateDepreciation(
            data.property.structure,
            buildingCost,
            data.advancedSettings?.equipmentRatio ?? 0.2,
            isUsed,
            data.advancedSettings?.buildingAge ?? 0,
            data.advancedSettings?.usefulLifeMethod ?? 'simplified',
            data.advancedSettings?.customBuildingUsefulLife,
            data.advancedSettings?.customEquipmentUsefulLife
        );

        // 最終保有年(35年目など)時点での売却手残りシミュレーションを実行
        const exit = calculateExitAnalysis(
            projection,
            finalYear.year,
            exitCapRate,
            buildingCost,
            landCost,
            ownCapitalYen,
            depInfo,
            isLeaseMode,
            landLeaseDepositYen
        );
        netSaleProceeds = exit.netSaleProceeds;
    }

    // IRR用のキャッシュフロー配列: [-純自己資金, 1年目CF, 2年目CF, ..., (最終年CF + 売却手取り)]
    // [修正] QA部の指摘: 借地リース時は建設協力金を初期資金に充当するため、初期アウトフローを 建設協力金分だけ削減します。
    const initialOutflow = ownCapitalYen - totalCooperationMoneyYen;
    const irrCashflows = [-initialOutflow, ...projection.map(p => p.atcf)];
    if (irrCashflows.length > 1 && netSaleProceeds > 0) {
        irrCashflows[irrCashflows.length - 1] += netSaleProceeds;
    }
    const irr = calculateIRR(irrCashflows);

    // 回収期間 (累積キャッシュフローがプラスに転じる年)
    const paybackYear = projection.find(p => p.accumulatedCashFlow >= 0)?.year ?? null;

    // 平均 DSCR (返済に対する NOI の倍率)
    const activeDscrYears = projection.filter(p => p.dscr !== Infinity && p.dscr > 0);
    const avgDscr = activeDscrYears.length > 0
        ? activeDscrYears.reduce((s, p) => s + p.dscr, 0) / activeDscrYears.length
        : 0;

    // 損益分岐稼働率 (BER) - 初年度
    // 【バグ修正】満室想定収入が0円の際の0除算によるNaN・Infinityをガード
    const y1 = projection[0];
    const ber = y1 && y1.grossIncome > 0 ? (y1.opex + y1.tmT) / y1.grossIncome : 0;

    return {
        irr,
        paybackYear,
        avgDscr,
        ber,
        year1Dscr: y1?.dscr ?? 0,
        year1Ccr: y1?.ccr ?? 0,
    };
};
