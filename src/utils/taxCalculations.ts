/**
 * Depreciation & Tax Calculation Utilities
 * 
 * Handles:
 * - Building depreciation (straight-line method)
 * - Equipment depreciation (shorter useful life)
 * - Real estate income tax (individual progressive / corporate flat)
 * - ATCF (After-Tax Cash Flow)
 */

// --- Useful Life Table (Japanese Tax Law) ---
const USEFUL_LIFE: Record<string, number> = {
    RC: 47,         // 鉄筋コンクリート造
    S: 34,          // 鉄骨造
    Wood: 22,       // 木造
    SteelLight: 27, // 軽量鉄骨造
};

const EQUIPMENT_USEFUL_LIFE = 15; // 建物附属設備

/**
 * For used properties: simplified useful life calculation
 * If age >= useful life: useful life × 20%
 * If age < useful life: (useful life - age) + age × 20%
 */
export const getUsedUsefulLife = (structure: string, buildingAge: number): number => {
    const fullLife = USEFUL_LIFE[structure] || 47;
    if (buildingAge >= fullLife) {
        return Math.max(Math.floor(fullLife * 0.2), 2);
    }
    return Math.floor((fullLife - buildingAge) + buildingAge * 0.2);
};

/**
 * Straight-line depreciation rate
 */
export const getDepreciationRate = (usefulLife: number): number => {
    return 1 / usefulLife;
};

// --- Depreciation Info ---
export interface DepreciationInfo {
    buildingDepreciation: number;    // Annual building depreciation (円)
    equipmentDepreciation: number;   // Annual equipment depreciation (円)
    totalDepreciation: number;       // Total annual depreciation (円)
    buildingUsefulLife: number;      // Years
    equipmentUsefulLife: number;     // Years
}

export const calculateDepreciation = (
    structure: string,
    buildingCost: number,         // Building cost in 円
    equipmentRatio: number,       // Ratio of equipment cost (e.g. 0.2 = 20%)
    isUsed: boolean,
    buildingAge: number = 0,
): DepreciationInfo => {
    const buildingPortion = buildingCost * (1 - equipmentRatio);
    const equipmentPortion = buildingCost * equipmentRatio;

    // Building useful life
    const buildingUsefulLife = isUsed
        ? getUsedUsefulLife(structure, buildingAge)
        : (USEFUL_LIFE[structure] || 47);

    // Equipment useful life
    const equipmentUsefulLife = isUsed
        ? getUsedUsefulLife('Wood', Math.min(buildingAge, EQUIPMENT_USEFUL_LIFE)) // Simplified
        : EQUIPMENT_USEFUL_LIFE;

    const buildingDepreciation = buildingPortion * getDepreciationRate(buildingUsefulLife);
    const equipmentDepreciation = equipmentRatio > 0
        ? equipmentPortion * getDepreciationRate(equipmentUsefulLife)
        : 0;

    return {
        buildingDepreciation: Math.floor(buildingDepreciation),
        equipmentDepreciation: Math.floor(equipmentDepreciation),
        totalDepreciation: Math.floor(buildingDepreciation + equipmentDepreciation),
        buildingUsefulLife,
        equipmentUsefulLife,
    };
};

/**
 * Check if depreciation is still active for a given year
 */
export const getYearlyDepreciation = (depInfo: DepreciationInfo, year: number): number => {
    let total = 0;
    if (year <= depInfo.buildingUsefulLife) {
        total += depInfo.buildingDepreciation;
    }
    if (year <= depInfo.equipmentUsefulLife) {
        total += depInfo.equipmentDepreciation;
    }
    return total;
};

// --- Income Tax Calculation ---

// Japanese individual income tax brackets (2024)
const INDIVIDUAL_TAX_BRACKETS = [
    { limit: 1_950_000, rate: 0.05, deduction: 0 },
    { limit: 3_300_000, rate: 0.10, deduction: 97_500 },
    { limit: 6_950_000, rate: 0.20, deduction: 427_500 },
    { limit: 9_000_000, rate: 0.23, deduction: 636_000 },
    { limit: 18_000_000, rate: 0.33, deduction: 1_536_000 },
    { limit: 40_000_000, rate: 0.40, deduction: 2_796_000 },
    { limit: Infinity, rate: 0.45, deduction: 4_796_000 },
];

const RESIDENT_TAX_RATE = 0.10; // 住民税率 10%

/**
 * Calculate individual income tax on real estate income
 * 
 * @param taxableIncome - 不動産課税所得 (NOI - depreciation - interest)
 * @param otherIncome - 給与所得等の他の所得 (for total income bracket determination)
 * @returns Tax amount (所得税 + 住民税)
 */
export const calculateIndividualTax = (
    taxableIncome: number,
    otherIncome: number = 0,
): number => {
    if (taxableIncome <= 0) return 0; // Loss = no tax (can offset other income)

    const totalIncome = taxableIncome + otherIncome;

    // Find bracket for total income
    const bracket = INDIVIDUAL_TAX_BRACKETS.find(b => totalIncome <= b.limit) || INDIVIDUAL_TAX_BRACKETS[INDIVIDUAL_TAX_BRACKETS.length - 1];

    // Income tax on real estate portion (marginal rate applied)
    const incomeTax = taxableIncome * bracket.rate;
    const residentTax = taxableIncome * RESIDENT_TAX_RATE;

    return Math.floor(incomeTax + residentTax);
};

/**
 * Calculate corporate tax (simplified effective rate)
 * 
 * @param taxableIncome - 法人課税所得
 * @param isSmallBusiness - 中小法人 (capital <= 1億)
 * @returns Tax amount
 */
export const calculateCorporateTax = (
    taxableIncome: number,
    isSmallBusiness: boolean = true,
): number => {
    if (taxableIncome <= 0) return 0;

    // Simplified effective rates
    if (isSmallBusiness) {
        if (taxableIncome <= 8_000_000) {
            return Math.floor(taxableIncome * 0.25); // ~25% effective for small biz
        }
        return Math.floor(8_000_000 * 0.25 + (taxableIncome - 8_000_000) * 0.35);
    }
    return Math.floor(taxableIncome * 0.30); // ~30% effective for large
};

export type TaxMode = 'individual' | 'corporate';
