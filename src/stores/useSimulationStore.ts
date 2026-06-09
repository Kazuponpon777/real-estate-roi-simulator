/**
 * ============================================================
 *  AI組織型コードレビュー済み
 *  レビュー日: 2026-06-01
 *  レビュー部署: バグチェック部 / セキュリティ部 / 改善提案部
 *  統合修正: 開発部
 * ============================================================
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TaxMode } from '../utils/taxCalculations';
import {
    calculateAutoStampDuty,
    calculateAutoRegistrationTax,
    calculateAutoAcquisitionTax,
    calculateAutoBrokerageFee
} from '../utils/calculations';


// --- タイプ定義 ---

export type SimulationMode = 'land_new' | 'investment_used' | 'land_lease'; // land_lease: 借地リース (地主から土地を借りて上物を建てて貸し出す) モードを追加

export interface PropertyDocument {
    id: string;
    name: string;
    type: string;
    size: number;
}

export interface PropertyDetails {
    // Site
    address: string;
    landAreaMode: 'public' | 'actual';
    landAreaPublic: number; // 坪 (Stored in Tsubo for ease of real estate custom, or M2?) -> Let's store M2 as base, convert to Tsubo for display? Or follow generic Japanese practice (Tsubo for land).
    // Req says "坪⇔㎡自動換算". Let's store M2 as canonical, but inputs might be Tsubo. 
    // Alternatively, store both or just one. Let's store M2.
    landAreaM2: number;

    // Use null for uninitialized
    latitude: number | null;
    longitude: number | null;

    frontage: number; // m
    depth: number; // m
    roadWidth1: number; // m
    roadType1: string; // 県道/市道 etc
    roadDirection1: string;

    documents: PropertyDocument[];
    cloudFolderUrl?: string;

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
    propertyType?: 'apartment' | 'store_apartment' | 'office_building' | 'other'; // 物件種別: アパート・賃貸マンション, 店舗マンション, 商業ビル, その他
}

export interface ProjectBudget {
    landPrice: number; // 万円
    demolitionCost: number; // 万円
    buildingWorksCost: number; // 本体工事費 万円

    // Initial Expenses
    stampDuty: number; // 印紙税
    isAutoStampDuty?: boolean;
    registrationTax: number; // 登録免許税
    isAutoRegistrationTax?: boolean;
    acquisitionTax: number; // 不動産取得税
    isAutoAcquisitionTax?: boolean;
    fireInsurancePrepaid: number; // 火災保険一括
    waterContribution: number; // 市納金 (水道分担金等)
    brokerageFee: number; // 仲介手数料 (added commonly)
    isAutoBrokerageFee?: boolean;
    otherInitialCost: number;
    constructionInterest: number; // 工事中金利
    
    // --- 借地リース用の追加予算項目 ---
    landLeaseDeposit: number;     // 土地権利金・地主への敷金 万円 (借地リース用)
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
    securityDepositIn: number; // 敷金(預り) 万円
}

export interface RoomType {
    id: string;
    name: string; // e.g. 1K
    count: number;
    areaM2: number;
    rent: number; // 円 (Monthly)
    commonFee: number; // 円 (Monthly)

    // --- 借地リース 建設協力金用の追加パラメータ ---
    cooperationMonths?: number;      // 建設協力金算出基準 (家賃の◯ヶ月分、例: 120ヶ月)
    cooperationReturnYears?: number; // 建設協力金のテナントへの返還期間 (年、例: 20年)

    // --- 用途の分別設定 ---
    usage?: 'residential' | 'commercial'; // 'residential': 住居系, 'commercial': 店舗用
    depositMonths?: number; // 敷金 (ヶ月)
}

export interface RentRoll {
    roomTypes: RoomType[];
    parkingCount: number;
    parkingFee: number; // 円
    solarPowerIncome: number; // 太陽光売電収入 (円/月)
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
    landAssessedValue?: number; // 土地の固定資産税評価額 (万円)
    buildingAssessedValue?: number; // 建物の固定資産税評価額 (万円)
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

    // --- 減価償却・税務プレミアム機能用の追加プロパティ ---
    buildingRatio: number;        // 建物価格割合 (%, 中古物件購入用, 0-100, 例: 50 = 50%)
    usefulLifeMethod: 'statutory' | 'simplified' | 'custom'; // 耐用年数算出方法 ('statutory': 法定耐用年数, 'simplified': 簡便法, 'custom': カスタム入力)
    customBuildingUsefulLife?: number;  // カスタム時の建物耐用年数 (年)
    customEquipmentUsefulLife?: number; // カスタム時の設備耐用年数 (年)

    // --- 借地リース用の追加設定プロパティ ---
    landLeaseFee: number;         // 地主へ支払う月額地代 (円)
}

export interface SimulationData {
    id?: number; // さくらサーバーMySQL用ID
    title: string;
    mode: SimulationMode;

    property: PropertyDetails;
    budget: ProjectBudget;
    funding: FundingPlan;
    rentRoll: RentRoll;
    expenses: Expenses;
    advancedSettings: AdvancedSettings;
}

export interface SavedSimulationMetadata {
    id: number;
    title: string;
    mode: SimulationMode;
    created_by: string;
    creator_name: string;
    updated_at: string;
}

interface SimulationState {
    data: SimulationData;
    activeStep: number;
    viewMode: 'menu' | 'simulator' | 'admin'; // 日本語コメント: 表示画面モードを追加 ('menu': お客様データ一覧メニュー, 'simulator': シミュレーター, 'admin': ユーザー管理)

    // サーバー保存・同期用の状態管理
    savedList: SavedSimulationMetadata[];
    isSaving: boolean;
    isLoadingList: boolean;
    isLoadingData: boolean;
    saveError: string | null;
    loadError: string | null;
    listError: string | null;

    // ログイン認証状態管理
    isAuthenticated: boolean | null;
    isAuthenticating: boolean;
    authError: string | null;
    currentUser: { name: string; employee_number: string; is_admin: boolean } | null;

    // Actions
    updateData: (updates: Partial<SimulationData>) => void;
    updateProperty: (updates: Partial<PropertyDetails>) => void;
    updateBudget: (updates: Partial<ProjectBudget>) => void;
    updateFunding: (updates: Partial<FundingPlan>) => void;
    updateRentRoll: (updates: Partial<RentRoll>) => void;
    updateExpenses: (updates: Partial<Expenses>) => void;
    updateAdvancedSettings: (updates: Partial<AdvancedSettings>) => void;

    setViewMode: (mode: 'menu' | 'simulator' | 'admin') => void;
    setStep: (step: number) => void;
    nextStep: () => void;
    prevStep: () => void;
    reset: () => void;

    // 日本語コメント: アカウント管理用の状態とアクション (管理者専用)
    usersList: { app_users: any[]; employee_users: any[] };
    isLoadingUsers: boolean;
    usersError: string | null;
    fetchUsersList: () => Promise<void>;
    createUser: (email: string, name: string, is_admin: boolean, password?: string) => Promise<boolean>;
    updateUser: (id: number | null, email: string, name: string, is_admin: boolean, password?: string, employee_number?: string) => Promise<boolean>;
    deleteUser: (id: number) => Promise<boolean>;

    // サーバー連携用アクション
    fetchSavedList: () => Promise<void>;
    saveSimulation: (title: string) => Promise<boolean>;
    loadSimulation: (id: number) => Promise<void>;
    deleteSimulation: (id: number) => Promise<boolean>;
    clearErrors: () => void;

    // ログイン認証用アクション
    checkAuthStatus: () => Promise<void>;
    login: (loginId: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;

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
        latitude: null,
        longitude: null,
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
        documents: [],
        propertyType: 'apartment',
    },

    budget: {
        landPrice: 0,
        demolitionCost: 0,
        buildingWorksCost: 0,
        stampDuty: 0,
        isAutoStampDuty: true,
        registrationTax: 0,
        isAutoRegistrationTax: true,
        acquisitionTax: 0,
        isAutoAcquisitionTax: true,
        fireInsurancePrepaid: 0,
        waterContribution: 0,
        brokerageFee: 0,
        isAutoBrokerageFee: true,
        otherInitialCost: 0,
        constructionInterest: 0,
        landLeaseDeposit: 0, // 土地敷金デフォルト値 (万円)
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
            { id: '1', name: '1K', count: 0, areaM2: 25, rent: 60000, commonFee: 5000, depositMonths: 1, cooperationMonths: 120, cooperationReturnYears: 20, usage: 'residential' }
        ],
        parkingCount: 0,
        parkingFee: 0,
        solarPowerIncome: 0,
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
        landAssessedValue: 0,
        buildingAssessedValue: 0,
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
        buildingRatio: 50,           // 中古物件購入における建物割合のデフォルト値 (50%)
        usefulLifeMethod: 'simplified', // 償却期間算出方法のデフォルト値 (簡便法)
        landLeaseFee: 0,             // 月額地代デフォルト値 (円)
    },
};

// 日本語コメント: 開発環境と本番環境でAPIのベースURLを自動的に切り替えます
const API_BASE_URL = import.meta.env.DEV
    ? 'https://lp.yashimaltd.com/real-estate/api'
    : (() => {
        const path = window.location.pathname;
        const base = path.endsWith('/') ? path : path.substring(0, path.lastIndexOf('/') + 1);
        return `${window.location.origin}${base}api`;
      })();

export const useSimulationStore = create<SimulationState>()(
    persist(
        (set, get) => ({
            data: INITIAL_DATA,
            activeStep: 1,
            viewMode: 'menu', // 日本語コメント: 初期表示はメニュー画面に設定

            // サーバー保存・同期用の初期状態
            savedList: [],
            isSaving: false,
            isLoadingList: false,
            isLoadingData: false,
            saveError: null,
            loadError: null,
            listError: null,

            // ログイン認証用の初期状態
            isAuthenticated: null,
            isAuthenticating: false,
            authError: null,
            currentUser: null,

            // 日本語コメント: アカウント管理用の初期状態
            usersList: { app_users: [], employee_users: [] },
            isLoadingUsers: false,
            usersError: null,

            // Actions
            updateData: (updates) =>
                set((state) => ({ data: { ...state.data, ...updates } })),

            updateProperty: (updates) =>
                set((state) => {
                    const nextProperty = { ...state.data.property, ...updates };
                    const nextExpenses = { ...state.data.expenses };

                    // 日本語コメント: 物件種別が変更され、かつ土地評価額が入力されている場合、固都税を自動的に再計算・連動させる
                    if (updates.propertyType !== undefined && nextExpenses.landAssessedValue) {
                        const isResidential = updates.propertyType === 'apartment' || updates.propertyType === 'store_apartment';
                        const valueYen = nextExpenses.landAssessedValue * 10000;
                        if (isResidential) {
                            nextExpenses.fixedAssetTaxLand = Math.round(valueYen * 0.014 * (1 / 6));
                            nextExpenses.cityPlanningTaxLand = Math.round(valueYen * 0.003 * (1 / 3));
                        } else {
                            nextExpenses.fixedAssetTaxLand = Math.round(valueYen * 0.014);
                            nextExpenses.cityPlanningTaxLand = Math.round(valueYen * 0.003);
                        }
                    }

                    return { data: { ...state.data, property: nextProperty, expenses: nextExpenses } };
                }),

            updateBudget: (updates) =>
                set((state) => {
                    const nextBudget = { ...state.data.budget, ...updates };
                    const mode = state.data.mode;
                    const buildingRatio = state.data.advancedSettings.buildingRatio;

                    // 日本語コメント: 自動計算フラグが有効な場合は自律的に計算を実行。buildingRatioを引数に追加
                    if (nextBudget.isAutoStampDuty !== false) {
                        nextBudget.stampDuty = calculateAutoStampDuty(nextBudget, mode);
                    }
                    if (nextBudget.isAutoRegistrationTax !== false) {
                        nextBudget.registrationTax = calculateAutoRegistrationTax(nextBudget, mode, buildingRatio);
                    }
                    if (nextBudget.isAutoAcquisitionTax !== false) {
                        nextBudget.acquisitionTax = calculateAutoAcquisitionTax(nextBudget, mode, buildingRatio);
                    }
                    if (nextBudget.isAutoBrokerageFee !== false) {
                        nextBudget.brokerageFee = calculateAutoBrokerageFee(nextBudget, mode);
                    }

                    return { data: { ...state.data, budget: nextBudget } };
                }),

            updateFunding: (updates) =>
                set((state) => ({ data: { ...state.data, funding: { ...state.data.funding, ...updates } } })),

            updateRentRoll: (updates) =>
                set((state) => ({ data: { ...state.data, rentRoll: { ...state.data.rentRoll, ...updates } } })),

            updateExpenses: (updates) =>
                set((state) => {
                    const nextExpenses = { ...state.data.expenses, ...updates };
                    const propType = state.data.property.propertyType || 'apartment';
                    const isResidential = propType === 'apartment' || propType === 'store_apartment';

                    // 日本語コメント: 土地評価額が変更された場合の固都税（固定資産税、都市計画税）自動計算・分離格納
                    if (updates.landAssessedValue !== undefined) {
                        const valueYen = updates.landAssessedValue * 10000;
                        if (isResidential) {
                            nextExpenses.fixedAssetTaxLand = Math.round(valueYen * 0.014 * (1 / 6));
                            nextExpenses.cityPlanningTaxLand = Math.round(valueYen * 0.003 * (1 / 3));
                        } else {
                            nextExpenses.fixedAssetTaxLand = Math.round(valueYen * 0.014);
                            nextExpenses.cityPlanningTaxLand = Math.round(valueYen * 0.003);
                        }
                    }

                    // 日本語コメント: 建物評価額が変更された場合の固都税（固定資産税、都市計画税）自動計算・分離格納
                    if (updates.buildingAssessedValue !== undefined) {
                        const valueYen = updates.buildingAssessedValue * 10000;
                        nextExpenses.fixedAssetTaxBuilding = Math.round(valueYen * 0.014);
                        nextExpenses.cityPlanningTaxBuilding = Math.round(valueYen * 0.003);
                    }

                    return { data: { ...state.data, expenses: nextExpenses } };
                }),

            updateAdvancedSettings: (updates) =>
                set((state) => {
                    const nextSettings = { ...state.data.advancedSettings, ...updates };
                    const nextBudget = { ...state.data.budget };
                    const mode = state.data.mode;

                    // 日本語コメント: 建物価格割合（buildingRatio）が変更された場合、関連する自動税金計算をリアルタイム再連動させる
                    if (updates.buildingRatio !== undefined) {
                        if (nextBudget.isAutoRegistrationTax !== false) {
                            nextBudget.registrationTax = calculateAutoRegistrationTax(nextBudget, mode, nextSettings.buildingRatio);
                        }
                        if (nextBudget.isAutoAcquisitionTax !== false) {
                            nextBudget.acquisitionTax = calculateAutoAcquisitionTax(nextBudget, mode, nextSettings.buildingRatio);
                        }
                        if (nextBudget.isAutoBrokerageFee !== false) {
                            nextBudget.brokerageFee = calculateAutoBrokerageFee(nextBudget, mode);
                        }
                    }

                    return {
                        data: {
                            ...state.data,
                            advancedSettings: nextSettings,
                            budget: nextBudget
                        }
                    };
                }),

            setViewMode: (mode) => set({ viewMode: mode }),
            setStep: (step) => set({ activeStep: step }),
            nextStep: () => set((state) => ({ activeStep: Math.min(state.activeStep + 1, 5) })),
            prevStep: () => set((state) => {
                const nextStep = state.activeStep - 1;
                if (nextStep <= 0) {
                    return { activeStep: 1, viewMode: 'menu' };
                }
                return { activeStep: nextStep };
            }),
            reset: () => set({ data: INITIAL_DATA, activeStep: 1, viewMode: 'menu' }),

            // 日本語コメント: サーバーからシミュレーション一覧を非同期取得します
            fetchSavedList: async () => {
                set({ isLoadingList: true, listError: null });
                try {
                    const response = await fetch(`${API_BASE_URL}/list.php`, {
                        credentials: 'include'
                    });
                    if (!response.ok) throw new Error('一覧の取得に失敗しました');
                    const result = await response.json();
                    if (result.status === 'success') {
                        set({ savedList: result.list || [] });
                    } else {
                        throw new Error(result.message || '一覧の取得に失敗しました');
                    }
                } catch (err: any) {
                    set({ listError: err.message || '通信エラーが発生しました' });
                } finally {
                    set({ isLoadingList: false });
                }
            },

            // 日本語コメント: シミュレーションデータを新規保存または上書き保存します
            saveSimulation: async (title: string) => {
                set({ isSaving: true, saveError: null });
                try {
                    const currentData = get().data;
                    const payload = {
                        id: currentData.id || null,
                        title: title,
                        mode: currentData.mode,
                        data: {
                            ...currentData,
                            title: title // 新しいタイトルを設定
                        }
                    };
                    const response = await fetch(`${API_BASE_URL}/save.php`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                        credentials: 'include'
                    });
                    if (!response.ok) throw new Error('保存に失敗しました');
                    const result = await response.json();
                    if (result.status === 'success') {
                        // 保存したデータのIDを状態に設定
                        set((state) => ({
                            data: { ...state.data, id: result.id, title: title }
                        }));
                        // 一覧を再取得
                        await get().fetchSavedList();
                        return true;
                    } else {
                        throw new Error(result.message || '保存に失敗しました');
                    }
                } catch (err: any) {
                    set({ saveError: err.message || '通信エラーが発生しました' });
                    return false;
                } finally {
                    set({ isSaving: false });
                }
            },

            // 日本語コメント: 選択されたIDのデータをサーバーから読み込みます
            loadSimulation: async (id: number) => {
                set({ isLoadingData: true, loadError: null });
                try {
                    const response = await fetch(`${API_BASE_URL}/load.php?id=${id}`, {
                        credentials: 'include'
                    });
                    if (!response.ok) throw new Error('読み込みに失敗しました');
                    const result = await response.json();
                    if (result.status === 'success' && result.data) {
                        const simData = result.data.data;
                        const nextData = {
                            ...simData,
                            id: result.data.id,
                            title: result.data.title,
                            mode: result.data.mode
                        };
                        set({ data: nextData, activeStep: 5, viewMode: 'simulator' }); // 日本語コメント: 読み込み時はステップを5(分析)に設定し、シミュレーターを起動
                    } else {
                        throw new Error(result.message || '読み込みに失敗しました');
                    }
                } catch (err: any) {
                    set({ loadError: err.message || '通信エラーが発生しました' });
                } finally {
                    set({ isLoadingData: false });
                }
            },

            // 日本語コメント: 選択されたIDのデータをサーバーから削除します
            deleteSimulation: async (id: number) => {
                set({ loadError: null });
                try {
                    const response = await fetch(`${API_BASE_URL}/delete.php`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id }),
                        credentials: 'include'
                    });
                    if (!response.ok) throw new Error('削除に失敗しました');
                    const result = await response.json();
                    if (result.status === 'success') {
                        // 削除したデータが現在表示中ならIDを解除
                        const currentData = get().data;
                        if (currentData.id === id) {
                            set((state) => ({ data: { ...state.data, id: undefined } }));
                        }
                        await get().fetchSavedList();
                        return true;
                    } else {
                        throw new Error(result.message || '削除に失敗しました');
                    }
                } catch (err: any) {
                    set({ loadError: err.message || '通信エラーが発生しました' });
                    return false;
                }
            },

            // 日本語コメント: 通信エラー状態をクリアします
            clearErrors: () => set({ saveError: null, loadError: null, listError: null }),

            // 日本語コメント: サーバー側セッションの認証状態を確認します
            checkAuthStatus: async () => {
                set({ isAuthenticating: true, authError: null });
                try {
                    const response = await fetch(`${API_BASE_URL}/check_auth.php`, {
                        credentials: 'include'
                    });
                    if (!response.ok) throw new Error('認証ステータスの確認に失敗しました');
                    const result = await response.json();
                    if (result.status === 'success' && result.authenticated) {
                        set({ 
                            isAuthenticated: true,
                            currentUser: result.user || null
                        });
                    } else {
                        set({ isAuthenticated: false, currentUser: null });
                    }
                } catch (err: any) {
                    set({ isAuthenticated: false, currentUser: null, authError: err.message || '通信エラーが発生しました' });
                } finally {
                    set({ isAuthenticating: false });
                }
            },

            // 日本語コメント: メールアドレスとパスワードを入力してログインを試みます
            login: async (loginId: string, password: string) => {
                set({ isAuthenticating: true, authError: null });
                try {
                    const response = await fetch(`${API_BASE_URL}/login.php`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ login_id: loginId, password }),
                        credentials: 'include'
                    });
                    if (!response.ok) {
                        const errResult = await response.json().catch(() => ({}));
                        throw new Error(errResult.message || 'ログインIDまたはパスワードが正しくありません。');
                    }
                    const result = await response.json();
                    if (result.status === 'success') {
                        set({ 
                            isAuthenticated: true,
                            currentUser: result.user || null
                        });
                        return true;
                    } else {
                        throw new Error(result.message || 'ログインに失敗しました');
                    }
                } catch (err: any) {
                    set({ authError: err.message || '通信エラーが発生しました' });
                    return false;
                } finally {
                    set({ isAuthenticating: false });
                }
            },

            // 日本語コメント: ログアウト処理を行いセッションを破棄します
            logout: async () => {
                try {
                    await fetch(`${API_BASE_URL}/logout.php`, {
                        method: 'POST',
                        credentials: 'include'
                    });
                } catch (e) {
                    console.error('ログアウト通信エラー:', e);
                }
                set({ isAuthenticated: false, currentUser: null, data: INITIAL_DATA, activeStep: 1, viewMode: 'menu' });
            },

            // 日本語コメント: 管理者向けにユーザー一覧を統合取得します
            fetchUsersList: async () => {
                set({ isLoadingUsers: true, usersError: null });
                try {
                    const response = await fetch(`${API_BASE_URL}/users_list.php`, {
                        credentials: 'include'
                    });
                    if (!response.ok) throw new Error('ユーザー一覧の取得に失敗しました');
                    const result = await response.json();
                    if (result.status === 'success') {
                        set({ usersList: { app_users: result.app_users || [], employee_users: result.employee_users || [] } });
                    } else {
                        throw new Error(result.message || 'ユーザー一覧の取得に失敗しました');
                    }
                } catch (err: any) {
                    set({ usersError: err.message || '通信エラーが発生しました' });
                } finally {
                    set({ isLoadingUsers: false });
                }
            },

            // 日本語コメント: 新規社外アカウントを登録します
            createUser: async (email, name, is_admin, password) => {
                set({ isLoadingUsers: true, usersError: null });
                try {
                    const payload = { action: 'create', email, name, is_admin: is_admin ? 1 : 0, password };
                    const response = await fetch(`${API_BASE_URL}/users_manage.php`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                        credentials: 'include'
                    });
                    const result = await response.json();
                    if (response.ok && result.status === 'success') {
                        await get().fetchUsersList();
                        return true;
                    } else {
                        throw new Error(result.message || 'アカウント作成に失敗しました');
                    }
                } catch (err: any) {
                    set({ usersError: err.message || '通信エラーが発生しました' });
                    return false;
                } finally {
                    set({ isLoadingUsers: false });
                }
            },

            // 日本語コメント: 社外アカウントまたは社内社員の権限情報を更新します
            updateUser: async (id, email, name, is_admin, password, employee_number) => {
                set({ isLoadingUsers: true, usersError: null });
                try {
                    const payload = { 
                        action: 'update', 
                        id: id === null ? undefined : id, 
                        employee_number: employee_number || undefined,
                        email, 
                        name, 
                        is_admin: is_admin ? 1 : 0, 
                        password: password || undefined 
                    };
                    const response = await fetch(`${API_BASE_URL}/users_manage.php`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                        credentials: 'include'
                    });
                    const result = await response.json();
                    if (response.ok && result.status === 'success') {
                        await get().fetchUsersList();
                        return true;
                    } else {
                        throw new Error(result.message || 'アカウント更新に失敗しました');
                    }
                } catch (err: any) {
                    set({ usersError: err.message || '通信エラーが発生しました' });
                    return false;
                } finally {
                    set({ isLoadingUsers: false });
                }
            },

            // 日本語コメント: 社外アカウントを削除します
            deleteUser: async (id) => {
                set({ isLoadingUsers: true, usersError: null });
                try {
                    const payload = { action: 'delete', id };
                    const response = await fetch(`${API_BASE_URL}/users_manage.php`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                        credentials: 'include'
                    });
                    const result = await response.json();
                    if (response.ok && result.status === 'success') {
                        await get().fetchUsersList();
                        return true;
                    } else {
                        throw new Error(result.message || 'アカウント削除に失敗しました');
                    }
                } catch (err: any) {
                    set({ usersError: err.message || '通信エラーが発生しました' });
                    return false;
                } finally {
                    set({ isLoadingUsers: false });
                }
            },

            getProgress: () => {
                const state = get().data;
                let score = 0;
                let total = 4; // Property, Budget, Funding, RentRoll

                // 1. Property
                if (state.property.landAreaM2 > 0) score += 1;

                // 2. Budget
                const hasBudgetInput = state.mode === 'land_lease'
                    ? ((state.budget.landLeaseDeposit || 0) > 0 || (state.budget.buildingWorksCost || 0) > 0)
                    : ((state.budget.landPrice || 0) > 0 || (state.budget.buildingWorksCost || 0) > 0);
                if (hasBudgetInput) score += 1;

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
            name: 'yashima-sim-storage',
            // 日本語コメント: セッションストレージ復元時の破損データチェックによるブラウザDoS攻撃の完全回避
            storage: {
                getItem: (name) => {
                    const raw = sessionStorage.getItem(name);
                    if (!raw) return null;
                    try {
                        const parsed = JSON.parse(raw);
                        // 基本構造の型安全性の検証
                        if (parsed && parsed.state && parsed.state.data) {
                            const d = parsed.state.data;
                            if (
                                d.property &&
                                d.budget &&
                                d.funding && Array.isArray(d.funding.loans) &&
                                d.rentRoll && Array.isArray(d.rentRoll.roomTypes) &&
                                d.expenses &&
                                d.advancedSettings
                            ) {
                                return parsed;
                            }
                        }
                        console.warn('検出: セッションデータが破損しています。安全のため初期値へリセットします。');
                        return null;
                    } catch (e) {
                        console.error('セッションデータ解析エラー:', e);
                        return null;
                    }
                },
                setItem: (name, value) => {
                    sessionStorage.setItem(name, JSON.stringify(value));
                },
                removeItem: (name) => {
                    sessionStorage.removeItem(name);
                }
            }
        }
    )
);
