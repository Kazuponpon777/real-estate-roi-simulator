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

    // 自己資金のマイナス（自己資金 ＋ テナント建設協力金 を初期調達として扱う）
    const ownCapitalYen = data.funding.ownCapital * 10000;
    let currentAccumulatedCF = -ownCapitalYen;

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
    // 新築・借地リースの場合は毎年の火災保険料は発生せず、5年周期のスポット一括払いとなるため毎年の経費から除外
    const fireInsuranceAnnual = isNewOrLease ? 0 : data.expenses.fireInsuranceAnnual;

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

        const lostIncome = currentYearGrossIncome * (currentVacancyRate / 100);
        const effectiveIncome = currentYearGrossIncome - lostIncome;

        // === 2. OPEX ===
        let managementFee = 0;
        if (data.expenses.managementFeeMode === 'ratio') {
            managementFee = effectiveIncome * (data.expenses.managementFeeRatio / 100);
        } else {
            managementFee = data.expenses.managementFeeFixed * 12;
        }

        // 火災保険料（5年一括）の5年周期スポット更新計算 (1年目は初期費用、次は6, 11, 16, 21, 26, 31年目に再発生)
        let spotFireInsuranceYen = 0;
        const isNewOrLease = data.mode === 'land_new' || data.mode === 'land_lease';
        if (isNewOrLease && y > 1 && y % 5 === 1) {
            spotFireInsuranceYen = (data.budget.fireInsurancePrepaid || 0) * 10000;
        }

        const opex = fixedOpexPart + managementFee + spotFireInsuranceYen;
        const noi = effectiveIncome - opex;

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
                const returnYears = r.cooperationReturnYears ?? 20;
                if (y <= returnYears) {
                    const totalCoop = r.rent * r.count * (r.cooperationMonths ?? 0);
                    annualCooperationReturnYen += totalCoop / returnYears;
                }
            });
        }

        // === 5. BTCF (税引前キャッシュフロー) ===
        // 営業純利益 (NOI) - ローン返済 (ADS) - 建設協力金返還額
        const btcf = noi - annualAds - annualCooperationReturnYen;

        // === 6. 減価償却費 ＆ 課税所得 (Phase 1) ===
        const yearDepreciation = getYearlyDepreciation(depInfo, y);

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

    return rate; // Return best guess even if not converged
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

    // --- 最終年の想定売却手取り(Net Sale Proceeds)を計算 ---
    let netSaleProceeds = 0;
    if (finalYear) {
        const exitCapRate = data.advancedSettings?.exitCapRate ?? 6.0;
        const isLeaseMode = data.mode === 'land_lease';
        const isUsed = data.mode === 'investment_used';
        
        // 建物・土地の按分コスト (借地リースモードも考慮して完全に算出)
        const buildingCost = isUsed
            ? (data.budget.landPrice * (data.advancedSettings?.buildingRatio ?? 50) / 100) * 10000
            : data.budget.buildingWorksCost * 10000;
            
        // 土地代の処理: 借地リースの場合は土地を購入しないため「土地売却額」はありませんが、
        // 預けていた土地敷金(landLeaseDeposit)が期末に戻るため、それを土地の回収価値(landCost)として代入します
        const landCost = isLeaseMode
            ? (data.budget.landLeaseDeposit ?? 0) * 10000
            : (isUsed
                ? (data.budget.landPrice * (100 - (data.advancedSettings?.buildingRatio ?? 50)) / 100) * 10000
                : data.budget.landPrice * 10000);

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
            depInfo
        );
        netSaleProceeds = exit.netSaleProceeds;
    }

    // IRR用のキャッシュフロー配列: [-自己資金, 1年目CF, 2年目CF, ..., (最終年CF + 売却手取り)]
    // 【バグ修正】35年目期末に物件を売却したと仮定し、売却手取りを加算して正しい税引後IRRを算出
    const irrCashflows = [-ownCapitalYen, ...projection.map(p => p.atcf)];
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
