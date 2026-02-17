import type { SimulationData } from "../stores/useSimulationStore";

export const DEMO_DATA: SimulationData = {
    title: "デモ案件: 練馬区桜台 RCマンションプロジェクト",
    mode: "land_new",
    property: {
        address: "東京都練馬区桜台",
        landAreaMode: "actual",
        landAreaPublic: 165.29, // 約50坪
        landAreaM2: 165.29,
        frontage: 8.5,
        depth: 19.4,
        roadWidth1: 5.4,
        roadType1: "区道",
        roadDirection1: "南",
        urbanizationArea: "urbanization",
        zoning: "第一種住居",
        coverageRate: 60,
        floorAreaRate: 200,
        structure: "RC",
        totalUnits: 9,
        buildingAreaM2: 95.0,
        totalFloorAreaM2: 280.5,
        floorAreas: [95.0, 95.0, 90.5],
        documents: [],
        latitude: null,
        longitude: null,
    },
    budget: {
        landPrice: 8500, // 万円
        demolitionCost: 200,
        buildingWorksCost: 12000, // 1.2億
        stampDuty: 10,
        registrationTax: 50,
        acquisitionTax: 120,
        fireInsurancePrepaid: 80,
        waterContribution: 30,
        brokerageFee: 280, // (8500 * 3% + 6) * 1.1 roughly
        otherInitialCost: 100,
        constructionInterest: 50,
    },
    funding: {
        ownCapital: 1000,
        loans: [
            { id: "1", name: "地銀アパートローン", amount: 20420, rate: 1.8, duration: 35 }
        ],
        cooperationMoney: 0,
        securityDepositIn: 0,
    },
    rentRoll: {
        roomTypes: [
            { id: "1", name: "1K (25㎡)", count: 6, areaM2: 25.0, rent: 89000, commonFee: 5000 },
            { id: "2", name: "1LDK (40㎡)", count: 3, areaM2: 40.0, rent: 135000, commonFee: 8000 }
        ],
        parkingCount: 1,
        parkingFee: 20000,
        otherRevenue: 0,
        occupancyRate: 96,
        securityDepositMonth: 1,
        keyMoneyMonth: 1,
        renewalFeeMonth: 1,
    },
    expenses: {
        managementFeeMode: "ratio",
        managementFeeRatio: 5,
        managementFeeFixed: 0,
        maintenanceReserve: 15000, // Monthly Total
        buildingMaintenance: 30000, // Monthly Total (Cleaning, Elevator etc)
        fixedAssetTaxLand: 250000, // Annual
        cityPlanningTaxLand: 50000,
        fixedAssetTaxBuilding: 300000,
        cityPlanningTaxBuilding: 60000,
        fireInsuranceAnnual: 0, // Prepaid
        otherExpenses: 50000,
    },
    advancedSettings: {
        rentDeclineRate: 1.0,
        vacancyRiseRate: 0.5,
        repairAccumulationRate: 0.0,
        interestRateRise: 0.0,
        taxMode: 'individual',
        otherIncome: 5_000_000, // 給与所得500万円
        equipmentRatio: 0.2,
        buildingAge: 0,
        exitCapRate: 6.0,
    }
};
