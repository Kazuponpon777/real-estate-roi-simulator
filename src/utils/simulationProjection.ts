import type { SimulationData } from "../stores/useSimulationStore";
import { calculatePmt } from "./calculations";

export interface AnnualData {
    year: number;
    grossIncome: number;
    lostIncome: number; // Vacancy
    effectiveIncome: number; // EGI
    opex: number;
    noi: number;
    tmT: number; // Total Debt Service (Principal + Interest)
    interest: number;
    principal: number;
    btcf: number; // Before Tax Cash Flow
    loanBalance: number;
    accumulatedCashFlow: number;
}

export const calculateLongTermProjection = (data: SimulationData, years: number = 35): AnnualData[] => {
    const projection: AnnualData[] = [];

    // Initial Equity (Total Cost - Total Loans)
    // Note: Accumulated CF usually starts from -OwnCapital, or we can track "Net Profit".
    // Let's track "Cumulative Cash Flow" starting from -OwnCapital (Investment).
    let currentAccumulatedCF = -data.funding.ownCapital * 10000;

    // Loan States
    let loans = data.funding.loans.map(loan => ({
        ...loan,
        remainingBalance: loan.amount * 10000,
        monthlyPmt: calculatePmt(loan.amount * 10000, loan.rate, loan.duration),
        yearAds: 0,
        yearInterest: 0,
        yearPrincipal: 0
    }));

    // Basic Annual Figures (Assumed constant for now, can be sophisticated later)
    const annualPotentialGrossIncome =
        ((data.rentRoll.roomTypes.reduce((acc, r) => acc + (r.rent + r.commonFee) * r.count, 0) +
            (data.rentRoll.parkingCount * data.rentRoll.parkingFee) +
            data.rentRoll.otherRevenue) * 12);

    // Opex (Fixed)
    // Note: Management Fee might be ratio.
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
        // 1. Income
        // Sensitivity Analysis: Rent Decline & Vacancy Rise
        const rentDeclineRate = data.advancedSettings?.rentDeclineRate ?? 1.0;
        const vacancyRiseRate = data.advancedSettings?.vacancyRiseRate ?? 0.5;

        // Decrease Gross Income
        const currentYearGrossIncome = annualPotentialGrossIncome * Math.pow(1 - rentDeclineRate / 100, y - 1);

        // Increase Vacancy Rate
        const baseVacancyRate = data.rentRoll.occupancyRate ? (100 - data.rentRoll.occupancyRate) : 5.0;
        let currentVacancyRate = baseVacancyRate + (vacancyRiseRate * (y - 1));
        if (currentVacancyRate > 100) currentVacancyRate = 100;

        const lostIncome = currentYearGrossIncome * (currentVacancyRate / 100);
        const effectiveIncome = currentYearGrossIncome - lostIncome;

        // 2. Opex
        // Recalculate Management Fee if ratio
        let managementFee = 0;
        if (data.expenses.managementFeeMode === 'ratio') {
            managementFee = effectiveIncome * (data.expenses.managementFeeRatio / 100);
        } else {
            managementFee = data.expenses.managementFeeFixed * 12;
        }
        const opex = fixedOpexPart + managementFee;
        const noi = effectiveIncome - opex;

        // 3. Debt Service
        let annualAds = 0;
        let annualInterest = 0;
        let annualPrincipal = 0;
        let totalBalance = 0;

        loans = loans.map(loan => {
            // Check if loan is active
            if (y > loan.duration) {
                return { ...loan, remainingBalance: 0 }; // Loan paid off
            }

            // Calculate annual payment details
            let loanAds = 0;
            let loanInterest = 0;
            let loanPrincipal = 0;
            let balance = loan.remainingBalance;

            for (let m = 0; m < 12; m++) {
                if (balance <= 0) break;
                // Interest for this month
                const interest = balance * (loan.rate / 100) / 12;
                let principal = loan.monthlyPmt - interest;

                // If last payment
                if (balance < principal) {
                    principal = balance;
                }

                balance -= principal;
                loanInterest += interest;
                loanPrincipal += principal;
                loanAds += (interest + principal);
            }

            return { ...loan, remainingBalance: balance, yearAds: loanAds, yearInterest: loanInterest, yearPrincipal: loanPrincipal };
        });

        // Sum up loans
        loans.forEach(l => {
            if (y <= l.duration) {
                annualAds += l.yearAds || 0;
                annualInterest += l.yearInterest || 0;
                annualPrincipal += l.yearPrincipal || 0;
            }
            totalBalance += l.remainingBalance;
        });

        // 4. Cash Flow
        const btcf = noi - annualAds;
        currentAccumulatedCF += btcf;

        projection.push({
            year: y,
            grossIncome: annualPotentialGrossIncome,
            lostIncome,
            effectiveIncome,
            opex,
            noi,
            tmT: annualAds,
            interest: annualInterest,
            principal: annualPrincipal,
            btcf,
            loanBalance: totalBalance,
            accumulatedCashFlow: currentAccumulatedCF
        });
    }

    return projection;
};
