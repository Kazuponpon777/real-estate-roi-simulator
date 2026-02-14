/**
 * Scenario Comparison & Sensitivity Analysis Utilities
 *
 * Generates:
 * - Optimistic / Standard / Pessimistic scenarios
 * - Rent decline × Vacancy rise matrix (heatmap data)
 */

import type { SimulationData, AdvancedSettings } from '../stores/useSimulationStore';
import { calculateLongTermProjection, getInvestmentMetrics } from './simulationProjection';

export interface ScenarioResult {
    name: string;
    label: string;
    color: string;
    settings: Partial<AdvancedSettings>;
    // KPIs
    year1Noi: number;
    year1Btcf: number;
    year1Atcf: number;
    year1Dscr: number;
    irr: number | null;
    paybackYear: number | null;
}

/**
 * Generate 3 scenarios: optimistic, standard, pessimistic
 */
export const generateScenarios = (data: SimulationData): ScenarioResult[] => {
    const base = data.advancedSettings;

    const scenarios: { name: string; label: string; color: string; overrides: Partial<AdvancedSettings> }[] = [
        {
            name: 'optimistic',
            label: '楽観',
            color: '#10b981',
            overrides: {
                rentDeclineRate: Math.max(base.rentDeclineRate - 0.5, 0),
                vacancyRiseRate: Math.max(base.vacancyRiseRate - 0.3, 0),
                interestRateRise: 0,
            },
        },
        {
            name: 'standard',
            label: '標準',
            color: '#6366f1',
            overrides: {}, // Use current settings as-is
        },
        {
            name: 'pessimistic',
            label: '悲観',
            color: '#ef4444',
            overrides: {
                rentDeclineRate: base.rentDeclineRate + 0.5,
                vacancyRiseRate: base.vacancyRiseRate + 0.3,
                interestRateRise: (base.interestRateRise || 0) + 0.05,
            },
        },
    ];

    return scenarios.map(scenario => {
        const modifiedData: SimulationData = {
            ...data,
            advancedSettings: { ...data.advancedSettings, ...scenario.overrides },
        };

        const projection = calculateLongTermProjection(modifiedData);
        const metrics = getInvestmentMetrics(modifiedData, projection);
        const y1 = projection[0];

        return {
            name: scenario.name,
            label: scenario.label,
            color: scenario.color,
            settings: scenario.overrides,
            year1Noi: y1?.noi ?? 0,
            year1Btcf: y1?.btcf ?? 0,
            year1Atcf: y1?.atcf ?? 0,
            year1Dscr: metrics.year1Dscr,
            irr: metrics.irr,
            paybackYear: metrics.paybackYear,
        };
    });
};

// --- Sensitivity Heatmap ---

export interface HeatmapCell {
    rentDecline: number;
    vacancyRise: number;
    irr: number | null;
    noi10: number; // NOI at year 10
    btcf10: number;
}

/**
 * Generate sensitivity matrix: rentDecline × vacancyRise → IRR
 */
export const generateSensitivityMatrix = (
    data: SimulationData,
    rentDeclineValues: number[] = [0, 0.5, 1.0, 1.5, 2.0],
    vacancyRiseValues: number[] = [0, 0.25, 0.5, 0.75, 1.0],
): HeatmapCell[][] => {
    return vacancyRiseValues.map(vr =>
        rentDeclineValues.map(rd => {
            const modifiedData: SimulationData = {
                ...data,
                advancedSettings: {
                    ...data.advancedSettings,
                    rentDeclineRate: rd,
                    vacancyRiseRate: vr,
                },
            };
            const projection = calculateLongTermProjection(modifiedData);
            const metrics = getInvestmentMetrics(modifiedData, projection);
            const y10 = projection[9]; // year 10

            return {
                rentDecline: rd,
                vacancyRise: vr,
                irr: metrics.irr,
                noi10: y10?.noi ?? 0,
                btcf10: y10?.btcf ?? 0,
            };
        })
    );
};
