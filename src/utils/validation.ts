/**
 * Input Validation Utilities
 *
 * Provides step-by-step validation for the simulation wizard.
 * Each validator returns an object mapping field names to error messages.
 */

import type { SimulationData } from '../stores/useSimulationStore';

export type ValidationErrors = Record<string, string>;

/**
 * Validate Screen 1: Property Information
 */
export const validateProperty = (data: SimulationData): ValidationErrors => {
    const errors: ValidationErrors = {};

    if (!data.property.structure) {
        errors['property.structure'] = '構造を選択してください';
    }
    if (!data.property.landAreaM2 || data.property.landAreaM2 <= 0) {
        errors['property.landAreaM2'] = '土地面積を入力してください';
    }

    return errors;
};

/**
 * Validate Screen 2: Budget
 */
export const validateBudget = (data: SimulationData): ValidationErrors => {
    const errors: ValidationErrors = {};

    const totalBudget = (data.budget.landPrice || 0) +
        (data.budget.buildingWorksCost || 0);

    if (totalBudget <= 0) {
        errors['budget.total'] = '土地価格または建築費を入力してください';
    }

    if ((data.budget.landPrice || 0) < 0) {
        errors['budget.landPrice'] = '土地価格は0以上を入力してください';
    }
    if ((data.budget.buildingWorksCost || 0) < 0) {
        errors['budget.buildingWorksCost'] = '建築費は0以上を入力してください';
    }

    return errors;
};

/**
 * Validate Screen 3: Funding
 */
export const validateFunding = (data: SimulationData): ValidationErrors => {
    const errors: ValidationErrors = {};

    // Check loan parameters
    if (data.funding.loans && data.funding.loans.length > 0) {
        const primary = data.funding.loans[0];
        if ((primary.amount || 0) < 0) {
            errors['funding.loan.amount'] = '借入額は0以上を入力してください';
        }
        if ((primary.duration || 0) <= 0 || (primary.duration || 0) > 50) {
            errors['funding.loan.duration'] = '借入期間は1〜50年の範囲で入力してください';
        }
        if ((primary.rate || 0) < 0 || (primary.rate || 0) > 20) {
            errors['funding.loan.rate'] = '金利は0〜20%の範囲で入力してください';
        }
    }

    return errors;
};

/**
 * Validate Screen 4: Rent Roll
 */
export const validateRentRoll = (data: SimulationData): ValidationErrors => {
    const errors: ValidationErrors = {};

    // Calculate total monthly rent from room types
    const totalMonthlyRent = data.rentRoll.roomTypes?.reduce(
        (sum, rt) => sum + (rt.rent || 0) * (rt.count || 0), 0
    ) ?? 0;

    if (totalMonthlyRent <= 0) {
        errors['rentRoll.monthlyRent'] = '月額賃料を入力してください（部屋タイプごと）';
    }

    const occupancy = data.rentRoll.occupancyRate;
    if (occupancy !== undefined && occupancy !== null) {
        if (occupancy < 0 || occupancy > 100) {
            errors['rentRoll.occupancyRate'] = '稼働率は0〜100%の範囲で入力してください';
        }
    }

    return errors;
};

/**
 * Validate all screens and return combined errors
 */
export const validateAll = (data: SimulationData): ValidationErrors => {
    return {
        ...validateProperty(data),
        ...validateBudget(data),
        ...validateFunding(data),
        ...validateRentRoll(data),
    };
};

/**
 * Check if a specific step has errors
 */
export const hasStepErrors = (data: SimulationData, step: number): boolean => {
    let errors: ValidationErrors;
    switch (step) {
        case 1: errors = validateProperty(data); break;
        case 2: errors = validateBudget(data); break;
        case 3: errors = validateFunding(data); break;
        case 4: errors = validateRentRoll(data); break;
        default: return false;
    }
    return Object.keys(errors).length > 0;
};
