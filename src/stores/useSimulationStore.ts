import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { TaxMode } from '../utils/taxCalculations';

// --- Types ---

export type SimulationMode = 'land_new' | 'investment_used';

export interface PropertyDetails {
    // Site
    address: string;
    landAreaMode: 'public' | 'actual';
    landAreaPublic: number; // 坪 (Stored in Tsubo for ease of real estate custom, or M2?) -> Let's store M2 as base, convert to Tsubo for display? Or follow generic Japanese practice (Tsubo for land).
    // Req says "坪⇔㎡自動換算". Let's store M2 as canonical, but inputs might be Tsubo. 
    // Alternatively, store both or just one. Let's store M2.
    landAreaM2: number;

    frontage: number; // m
    depth: number; // m
    roadWidth1: number; // m
    roadType1: string; // 県道/市道 etc
    roadDirection1: string;

    urbanizationArea: 'urbanization' | 'adjustment'; // 市街化 / 調整
    zoning: string; // 用途地域
    coverageRate: number; // 建蔽率 %
    floorAreaRate: number; // 容積率 %

    // Building
    structure: 'RC' | 'S' | 'Wood' | 'SteelLight';
    totalUnits: number;
    buildingAreaM2: number; // 建築面積
    totalFloorAreaM2: number; // 延床面積
    floorAreas: number[]; // 各階面積
}

export interface ProjectBudget {
    landPrice: number; // 万円
    demolitionCost: number; // 万円
    buildingWorksCost: number; // 本体工事費 万円

    // Initial Expenses
    stampDuty: number; // 印紙税
    registrationTax: number; // 登録免許税
    acquisitionTax: number; // 不動産取得税
    fireInsurancePrepaid: number; // 火災保険一括
    waterContribution: number; // 水道分担金
    brokerageFee: number; // 仲介手数料 (added commonly)
    otherInitialCost: number;
    constructionInterest: number; // 工事中金利
}

export interface Loan {
    id: string;
    name: string;
    amount: number; // 万円
    rate: number; // %
    duration: number; // Years
}

export interface FundingPlan {
    ownCapital: number; // 自己資金 万円
    loans: Loan[];
    cooperationMoney: number; // 建設協力金 万円
    securityDepositIn: number; // 保証金(預り) 万円
}

export interface RoomType {
    id: string;
    name: string; // e.g. 1K
    count: number;
    areaM2: number;
    rent: number; // 円 (Monthly)
    commonFee: number; // 円 (Monthly)
}

export interface RentRoll {
    roomTypes: RoomType[];
    parkingCount: number;
    parkingFee: number; // 円
    otherRevenue: number; // 円

    // Ratios / Conditions
    occupancyRate: number; // % (Expected)
    securityDepositMonth: number; // 敷金 (ヶ月)
    keyMoneyMonth: number; // 礼金 (ヶ月)
    renewalFeeMonth: number; // 更新料 (ヶ月/2年 etc - simplify to month equivalent per year or one-time)
}

export interface Expenses {
    managementFeeMode: 'ratio' | 'fixed';
    managementFeeRatio: number; // % of Rent
    managementFeeFixed: number; // Yen

    maintenanceReserve: number; // 修繕積立金 Yen/Year or Month? Let's use Annual for internal logic or Month. Usually Month per unit or Total. Let's do Total Monthly Yen.
    buildingMaintenance: number; // BM費 (清掃・点検) Monthly Yen

    fixedAssetTaxLand: number; // Annual
    cityPlanningTaxLand: number; // Annual
    fixedAssetTaxBuilding: number; // Annual
    cityPlanningTaxBuilding: number; // Annual

    fireInsuranceAnnual: number; // If not prepaid
    otherExpenses: number; // Annual
}

export interface AdvancedSettings {
    rentDeclineRate: number; // %
    vacancyRiseRate: number; // %
    repairAccumulationRate: number; // %
    interestRateRise: number; // %
    // Tax & Depreciation
    taxMode: TaxMode; // 'individual' | 'corporate'
    otherIncome: number; // 他の所得 (円/年) - for individual tax bracket
    equipmentRatio: number; // 設備比率 (0-1, e.g. 0.2 = 20%)
    buildingAge: number; // 築年数 (中古物件用)
    // Exit Strategy
    exitCapRate: number; // 売却時想定Cap Rate (%)
}

export interface SimulationData {
    title: string;
    mode: SimulationMode;

    property: PropertyDetails;
    budget: ProjectBudget;
    funding: FundingPlan;
    rentRoll: RentRoll;
    expenses: Expenses;
    advancedSettings: AdvancedSettings;
}

interface SimulationState {
    data: SimulationData;
    activeStep: number;

    // Actions
    updateData: (updates: Partial<SimulationData>) => void;
    updateProperty: (updates: Partial<PropertyDetails>) => void;
    updateBudget: (updates: Partial<ProjectBudget>) => void;
    updateFunding: (updates: Partial<FundingPlan>) => void;
    updateRentRoll: (updates: Partial<RentRoll>) => void;
    updateExpenses: (updates: Partial<Expenses>) => void;
    updateAdvancedSettings: (updates: Partial<AdvancedSettings>) => void;

    setStep: (step: number) => void;
    nextStep: () => void;
    prevStep: () => void;
    reset: () => void;

    // Selectors
    getProgress: () => number;
}

// --- Initial Values ---

const INITIAL_DATA: SimulationData = {
    title: '新規シミュレーション',
    mode: 'land_new',

    property: {
        address: '',
        landAreaMode: 'public',
        landAreaPublic: 0,
        landAreaM2: 0,
        frontage: 0,
        depth: 0,
        roadWidth1: 6,
        roadType1: '市道',
        roadDirection1: '南',
        urbanizationArea: 'urbanization',
        zoning: '第一種住居',
        coverageRate: 60,
        floorAreaRate: 200,
        structure: 'RC',
        totalUnits: 10,
        buildingAreaM2: 0,
        totalFloorAreaM2: 0,
        floorAreas: [0, 0, 0],
    },

    budget: {
        landPrice: 0,
        demolitionCost: 0,
        buildingWorksCost: 0,
        stampDuty: 0,
        registrationTax: 0,
        acquisitionTax: 0,
        fireInsurancePrepaid: 0,
        waterContribution: 0,
        brokerageFee: 0,
        otherInitialCost: 0,
        constructionInterest: 0,
    },

    funding: {
        ownCapital: 0,
        loans: [
            { id: '1', name: '銀行ローン', amount: 0, rate: 1.5, duration: 35 }
        ],
        cooperationMoney: 0,
        securityDepositIn: 0,
    },

    rentRoll: {
        roomTypes: [
            { id: '1', name: '1K', count: 0, areaM2: 25, rent: 60000, commonFee: 5000 }
        ],
        parkingCount: 0,
        parkingFee: 0,
        otherRevenue: 0,
        occupancyRate: 95,
        securityDepositMonth: 1,
        keyMoneyMonth: 1,
        renewalFeeMonth: 1,
    },

    expenses: {
        managementFeeMode: 'ratio',
        managementFeeRatio: 5,
        managementFeeFixed: 0,
        maintenanceReserve: 0,
        buildingMaintenance: 0,
        fixedAssetTaxLand: 0,
        cityPlanningTaxLand: 0,
        fixedAssetTaxBuilding: 0,
        cityPlanningTaxBuilding: 0,
        fireInsuranceAnnual: 0,
        otherExpenses: 0,
    },
    advancedSettings: {
        rentDeclineRate: 1.0,
        vacancyRiseRate: 0.5,
        repairAccumulationRate: 0.0,
        interestRateRise: 0.0,
        taxMode: 'individual',
        otherIncome: 0,
        equipmentRatio: 0.2,
        buildingAge: 0,
        exitCapRate: 6.0,
    },
};

export const useSimulationStore = create<SimulationState>()(
    persist(
        (set, get) => ({
            data: INITIAL_DATA,
            activeStep: 0,

            // Actions
            updateData: (updates) =>
                set((state) => ({ data: { ...state.data, ...updates } })),

            updateProperty: (updates) =>
                set((state) => ({ data: { ...state.data, property: { ...state.data.property, ...updates } } })),

            updateBudget: (updates) =>
                set((state) => ({ data: { ...state.data, budget: { ...state.data.budget, ...updates } } })),

            updateFunding: (updates) =>
                set((state) => ({ data: { ...state.data, funding: { ...state.data.funding, ...updates } } })),

            updateRentRoll: (updates) =>
                set((state) => ({ data: { ...state.data, rentRoll: { ...state.data.rentRoll, ...updates } } })),

            updateExpenses: (updates) =>
                set((state) => ({ data: { ...state.data, expenses: { ...state.data.expenses, ...updates } } })),

            updateAdvancedSettings: (updates) =>
                set((state) => ({ data: { ...state.data, advancedSettings: { ...state.data.advancedSettings, ...updates } } })),

            setStep: (step) => set({ activeStep: step }),
            nextStep: () => set((state) => ({ activeStep: Math.min(state.activeStep + 1, 5) })),
            prevStep: () => set((state) => ({ activeStep: Math.max(state.activeStep - 1, 0) })),
            reset: () => set({ data: INITIAL_DATA, activeStep: 0 }),

            getProgress: () => {
                const state = get().data;
                let score = 0;
                let total = 4; // Property, Budget, Funding, RentRoll

                // 1. Property
                if (state.property.landAreaM2 > 0) score += 1;

                // 2. Budget
                if (state.budget.landPrice > 0 || state.budget.buildingWorksCost > 0) score += 1;

                // 3. Funding
                const totalFunding = state.funding.ownCapital + state.funding.loans.reduce((acc: number, l: any) => acc + l.amount, 0);
                if (totalFunding > 0) score += 1;

                // 4. Rent Roll
                const rooms = state.rentRoll.roomTypes.reduce((acc: number, r: any) => acc + r.count, 0);
                if (rooms > 0 || state.rentRoll.parkingCount > 0) score += 1;

                return Math.round((score / total) * 100);
            },
        }),
        {
            name: 'yashima-sim-storage', // unique name
            storage: createJSONStorage(() => localStorage),
        }
    )
);
