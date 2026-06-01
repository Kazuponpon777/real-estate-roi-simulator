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

    // 複数ローンのすべてに対して厳密なパラメータチェックを実行
    if (data.funding.loans && data.funding.loans.length > 0) {
        data.funding.loans.forEach((loan, idx) => {
            const loanName = loan.name || `借入金 ${idx + 1}`;
            if ((loan.amount || 0) < 0) {
                errors[`funding.loan.${idx}.amount`] = `${loanName} の借入額は0以上を入力してください`;
            }
            if ((loan.duration || 0) <= 0 || (loan.duration || 0) > 50) {
                errors[`funding.loan.${idx}.duration`] = `${loanName} の借入期間は1〜50年の範囲で入力してください`;
            }
            if ((loan.rate || 0) < 0 || (loan.rate || 0) > 20) {
                errors[`funding.loan.${idx}.rate`] = `${loanName} の金利は0〜20%の範囲で入力してください`;
            }
        });
    }

    if ((data.funding.ownCapital || 0) < 0) {
        errors['funding.ownCapital'] = '自己資金は0以上を入力してください';
    }
    if ((data.funding.cooperationMoney || 0) < 0) {
        errors['funding.cooperationMoney'] = '建設協力金は0以上を入力してください';
    }
    if ((data.funding.securityDepositIn || 0) < 0) {
        errors['funding.securityDepositIn'] = '敷金(預り金)は0以上を入力してください';
    }

    return errors;
};

/**
 * Validate Screen 4: Rent Roll
 */
export const validateRentRoll = (data: SimulationData): ValidationErrors => {
    const errors: ValidationErrors = {};

    // 部屋タイプ全体の総家賃のチェック
    const totalMonthlyRent = data.rentRoll.roomTypes?.reduce(
        (sum, rt) => sum + (rt.rent || 0) * (rt.count || 0), 0
    ) ?? 0;

    if (totalMonthlyRent <= 0) {
        errors['rentRoll.monthlyRent'] = '月額賃料を入力してください（部屋タイプごと）';
    }

    // 部屋タイプごとのパラメータ（負数、空値、正の数）の厳格なループチェック
    if (data.rentRoll.roomTypes && data.rentRoll.roomTypes.length > 0) {
        data.rentRoll.roomTypes.forEach((rt, idx) => {
            const name = rt.name || `部屋タイプ ${idx + 1}`;
            if ((rt.count || 0) < 0) {
                errors[`rentRoll.roomTypes.${idx}.count`] = `${name} の戸数は0以上を入力してください`;
            }
            if ((rt.areaM2 || 0) <= 0) {
                errors[`rentRoll.roomTypes.${idx}.areaM2`] = `${name} の面積は0より大きい数値を入力してください`;
            }
            if ((rt.rent || 0) < 0) {
                errors[`rentRoll.roomTypes.${idx}.rent`] = `${name} の賃料は0以上を入力してください`;
            }
            if ((rt.commonFee || 0) < 0) {
                errors[`rentRoll.roomTypes.${idx}.commonFee`] = `${name} の共益費は0以上を入力してください`;
            }
            if (rt.cooperationMonths !== undefined && rt.cooperationMonths < 0) {
                errors[`rentRoll.roomTypes.${idx}.cooperationMonths`] = `${name} の協力金月数は0以上を入力してください`;
            }
            if (rt.cooperationReturnYears !== undefined && rt.cooperationReturnYears < 0) {
                errors[`rentRoll.roomTypes.${idx}.cooperationReturnYears`] = `${name} の協力金返還年数は0以上を入力してください`;
            }
        });
    }

    const occupancy = data.rentRoll.occupancyRate;
    if (occupancy !== undefined && occupancy !== null) {
        if (occupancy < 0 || occupancy > 100) {
            errors['rentRoll.occupancyRate'] = '稼働率は0〜100%の範囲で入力してください';
        }
    }

    if ((data.rentRoll.parkingCount || 0) < 0) {
        errors['rentRoll.parkingCount'] = '駐車場台数は0以上を入力してください';
    }
    if ((data.rentRoll.parkingFee || 0) < 0) {
        errors['rentRoll.parkingFee'] = '駐車場料金は0以上を入力してください';
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

/**
 * [修正] セキュリティ部署の指摘: XSS対策のためのURL検証・サニタイズ関数
 * http: または https: で始まる妥当なURLのみを通過させ、それ以外はundefinedを返します。
 */
export const validateAndSanitizeUrl = (url?: string): string | undefined => {
    if (!url) return undefined;
    const trimmed = url.trim();
    if (!trimmed) return undefined;
    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return trimmed;
        }
    } catch {
        // URLパースエラーの場合は不正なURLとして扱う
    }
    return undefined;
};

