import type { SimulationData } from "../stores/useSimulationStore";
import { calculatePmt } from "./calculations";
import {
    calculateDepreciation,
    getYearlyDepreciation,
    calculateIndividualTax,
    calculateCorporateTax,
    type DepreciationInfo,
} from "./taxCalculations";

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
}

export const calculateLongTermProjection = (data: SimulationData, years: number = 35): AnnualData[] => {
    const projection: AnnualData[] = [];

    const ownCapitalYen = data.funding.ownCapital * 10000;
    let currentAccumulatedCF = -ownCapitalYen;

    // --- Depreciation Setup ---
    const buildingCostYen = data.budget.buildingWorksCost * 10000;
    const isUsed = data.mode === 'investment_used';
    const equipmentRatio = data.advancedSettings?.equipmentRatio ?? 0.2;
    const buildingAge = data.advancedSettings?.buildingAge ?? 0;

    const depInfo: DepreciationInfo = calculateDepreciation(
        data.property.structure,
        buildingCostYen,
        equipmentRatio,
        isUsed,
        buildingAge,
    );

    // --- Tax Settings ---
    const taxMode = data.advancedSettings?.taxMode ?? 'individual';
    const otherIncome = data.advancedSettings?.otherIncome ?? 0;

    // --- Interest Rate Rise ---
    const interestRateRise = data.advancedSettings?.interestRateRise ?? 0;

    // --- Loan States ---
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

    // --- Base Income ---
    const annualPotentialGrossIncome =
        ((data.rentRoll.roomTypes.reduce((acc, r) => acc + (r.rent + r.commonFee) * r.count, 0) +
            (data.rentRoll.parkingCount * data.rentRoll.parkingFee) +
            (data.rentRoll.solarPowerIncome || 0) +
            data.rentRoll.otherRevenue) * 12);

    // --- Fixed OPEX ---
    const fixedOpexPart =
        (data.expenses.buildingMaintenance * 12) +
        (data.expenses.maintenanceReserve * 12) +
        data.expenses.fixedAssetTaxLand +
        data.expenses.cityPlanningTaxLand +
        data.expenses.fixedAssetTaxBuilding +
        data.expenses.cityPlanningTaxBuilding +
        data.expenses.fireInsuranceAnnual +
        data.expenses.otherExpenses;

    for (let y = 1; y <= years; y++) {
        // === 1. Income ===
        const rentDeclineRate = data.advancedSettings?.rentDeclineRate ?? 1.0;
        const vacancyRiseRate = data.advancedSettings?.vacancyRiseRate ?? 0.5;

        const currentYearGrossIncome = annualPotentialGrossIncome * Math.pow(1 - rentDeclineRate / 100, y - 1);
        const baseVacancyRate = data.rentRoll.occupancyRate ? (100 - data.rentRoll.occupancyRate) : 5.0;
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
        const opex = fixedOpexPart + managementFee;
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

        // === 4. BTCF ===
        const btcf = noi - annualAds;

        // === 5. Depreciation & Tax (Phase 1) ===
        const yearDepreciation = getYearlyDepreciation(depInfo, y);

        // Taxable income = NOI - depreciation - interest (not principal!)
        const taxableIncome = noi - yearDepreciation - annualInterest;

        let taxAmount = 0;
        if (taxMode === 'individual') {
            taxAmount = calculateIndividualTax(taxableIncome, otherIncome);
        } else {
            taxAmount = calculateCorporateTax(taxableIncome);
        }

        // ATCF = BTCF - Tax
        const atcf = btcf - taxAmount;

        // === 6. Accumulated CF (now based on ATCF) ===
        currentAccumulatedCF += atcf;

        // === 7. Investment Metrics ===
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

    // IRR cashflows: [-equity, atcf1, atcf2, ..., atcfN]
    const irrCashflows = [-ownCapitalYen, ...projection.map(p => p.atcf)];
    const irr = calculateIRR(irrCashflows);

    // Payback period (year when accumulated CF turns positive)
    const paybackYear = projection.find(p => p.accumulatedCashFlow >= 0)?.year ?? null;

    // Average DSCR
    const activeDscrYears = projection.filter(p => p.dscr !== Infinity && p.dscr > 0);
    const avgDscr = activeDscrYears.length > 0
        ? activeDscrYears.reduce((s, p) => s + p.dscr, 0) / activeDscrYears.length
        : 0;

    // BER (Break-even ratio) for year 1
    const y1 = projection[0];
    const ber = y1 ? (y1.opex + y1.tmT) / y1.grossIncome : 0;

    return {
        irr,
        paybackYear,
        avgDscr,
        ber,
        year1Dscr: y1?.dscr ?? 0,
        year1Ccr: y1?.ccr ?? 0,
    };
};
