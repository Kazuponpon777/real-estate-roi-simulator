/**
 * Exit Strategy / Sale Simulation Utilities
 *
 * Handles:
 * - Sale price estimation (Cap Rate method)
 * - Sale expenses (brokerage, stamp duty, etc.)
 * - Capital gains tax (short-term / long-term)
 * - Net sale proceeds
 * - Total investment return
 */

import type { AnnualData } from './simulationProjection';
import { getYearlyDepreciation, type DepreciationInfo } from './taxCalculations';

// --- Sale Price Estimation ---

/**
 * Estimate sale price using direct capitalization
 * Sale Price = NOI (at sale year) / Cap Rate
 */
export const estimateSalePrice = (noiAtSaleYear: number, exitCapRate: number): number => {
    if (exitCapRate <= 0) return 0;
    return Math.floor(noiAtSaleYear / (exitCapRate / 100));
};

// --- Sale Expenses ---

export interface SaleExpenses {
    brokerageFee: number;   // 仲介手数料 (3% + 6万円 + tax)
    stampDuty: number;      // 印紙税
    otherExpenses: number;  // その他
    total: number;
}

export const calculateSaleExpenses = (salePrice: number): SaleExpenses => {
    // Brokerage: 3% + 60,000 yen (+ 10% consumption tax)
    const brokerageBase = salePrice * 0.03 + 60_000;
    const brokerageFee = Math.floor(brokerageBase * 1.1);

    // Stamp duty (simplified based on price range)
    let stampDuty = 10_000;
    if (salePrice > 100_000_000) stampDuty = 60_000;
    else if (salePrice > 50_000_000) stampDuty = 30_000;
    else if (salePrice > 10_000_000) stampDuty = 10_000;

    const otherExpenses = 0;
    const total = brokerageFee + stampDuty + otherExpenses;

    return { brokerageFee, stampDuty, otherExpenses, total };
};

// --- Capital Gains Tax ---

/**
 * Calculate capital gains tax on real estate sale
 *
 * Book value = Original cost - Accumulated depreciation
 * Capital gain = Sale price - Book value - Sale expenses
 *
 * Short-term (≤5 years ownership): 39.63% (income 30.63% + resident 9%)
 * Long-term (>5 years ownership): 20.315% (income 15.315% + resident 5%)
 */
export const calculateCapitalGainsTax = (
    salePrice: number,
    originalBuildingCost: number,
    accumulatedDepreciation: number,
    saleExpenses: number,
    holdingYears: number,
    landPrice: number,
): number => {
    // Book value of building = original cost - accumulated depreciation
    const buildingBookValue = Math.max(originalBuildingCost - accumulatedDepreciation, 0);

    // Total book value = land + building book value
    const totalBookValue = landPrice + buildingBookValue;

    // Capital gain
    const capitalGain = salePrice - totalBookValue - saleExpenses;

    if (capitalGain <= 0) return 0;

    // Tax rate depends on holding period (as of Jan 1 of sale year)
    const isLongTerm = holdingYears > 5;
    const taxRate = isLongTerm ? 0.20315 : 0.39630;

    return Math.floor(capitalGain * taxRate);
};

// --- Full Exit Analysis ---

export interface ExitAnalysis {
    saleYear: number;
    salePrice: number;
    saleExpenses: SaleExpenses;
    loanBalanceAtSale: number;
    accumulatedDepreciation: number;
    capitalGainsTax: number;
    netSaleProceeds: number;      // Sale price - loan balance - expenses - tax
    totalCashflowDuringHolding: number; // Sum of ATCF during holding period
    totalReturn: number;          // Net proceeds + total cashflow - initial equity
    totalReturnRate: number;      // Total return / initial equity
    annualizedReturn: number;     // Annualized return rate
}

export const calculateExitAnalysis = (
    projection: AnnualData[],
    saleYear: number,
    exitCapRate: number,
    originalBuildingCost: number,  // 円
    landPrice: number,             // 円
    ownCapital: number,            // 円
    depInfo: DepreciationInfo,
): ExitAnalysis => {
    const saleYearData = projection.find(p => p.year === saleYear);
    if (!saleYearData) {
        return {
            saleYear, salePrice: 0, saleExpenses: { brokerageFee: 0, stampDuty: 0, otherExpenses: 0, total: 0 },
            loanBalanceAtSale: 0, accumulatedDepreciation: 0, capitalGainsTax: 0,
            netSaleProceeds: 0, totalCashflowDuringHolding: 0, totalReturn: 0,
            totalReturnRate: 0, annualizedReturn: 0,
        };
    }

    // Sale price from Cap Rate
    const salePrice = estimateSalePrice(saleYearData.noi, exitCapRate);
    const saleExpenses = calculateSaleExpenses(salePrice);

    // Loan balance at sale year
    const loanBalanceAtSale = saleYearData.loanBalance;

    // Accumulated depreciation
    let accumulatedDepreciation = 0;
    for (let y = 1; y <= saleYear; y++) {
        accumulatedDepreciation += getYearlyDepreciation(depInfo, y);
    }

    // Capital gains tax
    const capitalGainsTax = calculateCapitalGainsTax(
        salePrice,
        originalBuildingCost,
        accumulatedDepreciation,
        saleExpenses.total,
        saleYear,
        landPrice,
    );

    // Net sale proceeds
    const netSaleProceeds = salePrice - loanBalanceAtSale - saleExpenses.total - capitalGainsTax;

    // Total cashflow during holding period
    const totalCashflowDuringHolding = projection
        .filter(p => p.year <= saleYear)
        .reduce((sum, p) => sum + p.atcf, 0);

    // Total return
    const totalReturn = netSaleProceeds + totalCashflowDuringHolding - ownCapital;
    const totalReturnRate = ownCapital > 0 ? totalReturn / ownCapital : 0;

    // Annualized return (simple CAGR)
    const finalValue = ownCapital + totalReturn;
    const annualizedReturn = ownCapital > 0 && finalValue > 0
        ? Math.pow(finalValue / ownCapital, 1 / saleYear) - 1
        : 0;

    return {
        saleYear,
        salePrice,
        saleExpenses,
        loanBalanceAtSale,
        accumulatedDepreciation,
        capitalGainsTax,
        netSaleProceeds,
        totalCashflowDuringHolding,
        totalReturn,
        totalReturnRate,
        annualizedReturn,
    };
};

/**
 * Generate exit analysis for multiple sale years
 */
export const generateExitTable = (
    projection: AnnualData[],
    exitCapRate: number,
    originalBuildingCost: number,
    landPrice: number,
    ownCapital: number,
    depInfo: DepreciationInfo,
    yearsToAnalyze: number[] = [5, 10, 15, 20, 25, 30],
): ExitAnalysis[] => {
    return yearsToAnalyze.map(year =>
        calculateExitAnalysis(projection, year, exitCapRate, originalBuildingCost, landPrice, ownCapital, depInfo)
    );
};
