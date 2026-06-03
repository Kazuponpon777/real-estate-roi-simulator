import React, { useEffect, useState } from 'react';
import { useSimulationStore, type SimulationMode } from '../stores/useSimulationStore';
import { 
    Building2, 
    Search, 
    Store, 
    Plus, 
    Trash2, 
    FolderOpen, 
    RefreshCw, 
    User, 
    Calendar,
    ChevronRight,
    AlertCircle,
    Loader2,
    Database,
    Home,
    Shield
} from 'lucide-react';
import { Button } from '../components/ui/Button';

// 日本語コメント: 新規シミュレーション作成用の3つの事業スキーム定義 (サドルブラウンカード内で映える配色)
const MODE_SCHEMES = [
    {
        mode: 'land_new' as SimulationMode,
        title: '土地活用 (新築)',
        description: '更地からの新築建築企画、土地持ちオーナー様の長期的な事業収支シミュレーションに。',
        icon: Building2,
        bgGradient: 'from-[#aa7c11]/15 to-[#d4af37]/5 border-[#d4af37]/20 hover:border-[#d4af37]/45',
        iconBg: 'bg-[#aa7c11]/15 text-[#d4af37] group-hover:bg-[#d4af37] group-hover:text-[#1c120c]',
        badge: '資産形成の王道',
        badgeClass: 'bg-[#aa7c11]/20 text-[#fcf5e3] border-[#d4af37]/30'
    },
    {
        mode: 'investment_used' as SimulationMode,
        title: '収益物件購入 (中古)',
        description: '既存の土地付き収益ビル・マンション of 購入・運用収支シミュレーションに。',
        icon: Search,
        bgGradient: 'from-[#8a5d3b]/20 to-[#c5a880]/5 border-[#c5a880]/20 hover:border-[#c5a880]/45',
        iconBg: 'bg-[#8a5d3b]/20 text-[#c5a880] group-hover:bg-[#c5a880] group-hover:text-[#1c120c]',
        badge: 'スピード節税・高利回り',
        badgeClass: 'bg-[#8a5d3b]/30 text-[#fcf5e3] border-[#c5a880]/30'
    },
    {
        mode: 'land_lease' as SimulationMode,
        title: '借地リース (テナント開発)',
        description: '地権者から借地し、上物を自社建設してテナントへリース・サブリースする事業スキームに。',
        icon: Store,
        bgGradient: 'from-[#5c3e21]/25 to-[#aa7c11]/5 border-[#d4af37]/15 hover:border-[#d4af37]/35',
        iconBg: 'bg-[#5c3e21]/30 text-[#c5a880] group-hover:bg-[#d4af37] group-hover:text-[#1c120c]',
        badge: '他人資本で勝つ超高効率',
        badgeClass: 'bg-[#251810]/70 text-[#fcf5e3] border-[#d4af37]/30'
    }
];

export const ScreenMenu_Home: React.FC = () => {
    const {
        savedList,
        isLoadingList,
        listError,
        fetchSavedList,
        loadSimulation,
        deleteSimulation,
        currentUser,
        setViewMode,
        updateData,
        setStep
    } = useSimulationStore();

    // 検索語句とフィルター状態
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | SimulationMode>('all');
    const [isDeletingId, setIsDeletingId] = useState<number | null>(null);

    // 日本語コメント: 初期マウント時にデータ一覧をサーバーから取得
    useEffect(() => {
        fetchSavedList();
    }, []);

    // 日本語コメント: 新規シミュレーション作成開始処理（ダイアログ確認なしで直接開始）
    const handleCreateNew = (mode: SimulationMode) => {
        // 初期データを設定してシミュレータを起動
        updateData({
            id: undefined,
            title: '新規シミュレーション',
            mode: mode,
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
                landLeaseDeposit: 0,
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
                    { id: '1', name: '1K', count: 0, areaM2: 25, rent: 60000, commonFee: 5000, cooperationMonths: 120, cooperationReturnYears: 20, usage: 'residential' }
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
                buildingRatio: 50,
                usefulLifeMethod: 'simplified',
                landLeaseFee: 0,
            }
        });
        setStep(1); // ステップ1 (物件概要) へ
        setViewMode('simulator'); // シミュレータ起動
    };

    // 日本語コメント: 旧シミュレータ等のJSONファイルインポート処理
    const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const parsed = JSON.parse(text);

                // シミュレーションデータの必須プロパティチェック
                if (
                    parsed &&
                    typeof parsed === 'object' &&
                    parsed.property &&
                    parsed.budget &&
                    parsed.funding &&
                    parsed.rentRoll
                ) {
                    updateData({
                        ...parsed,
                        id: undefined // 新規開始として扱うためIDはクリアする
                    });
                    setStep(5); // 分析画面（ステップ5）へ直接遷移
                    setViewMode('simulator'); // シミュレータ起動
                } else {
                    throw new Error('必要なシミュレーションデータの構成（物件概要、予算、資金計画、レントロール等）が見つかりません。');
                }
            } catch (err: any) {
                alert(`JSONインポートエラー: ${err.message || '正しいJSON形式ではありません。'}`);
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // 同一ファイルの再選択を可能にするためにリセット
    };

    // 日本語コメント: 保存データのロード処理
    const handleLoad = async (id: number) => {
        await loadSimulation(id);
    };

    // 日本語コメント: 保存データの削除処理
    const handleDelete = async (e: React.MouseEvent, id: number, title: string) => {
        e.stopPropagation(); // テーブル行クリックイベントの発生を防ぐ
        if (window.confirm(`「${title}」のシミュレーションデータを完全に削除しますか？`)) {
            setIsDeletingId(id);
            const success = await deleteSimulation(id);
            if (success) {
                // 削除成功時はリストを再読込
                fetchSavedList();
            }
            setIsDeletingId(null);
        }
    };

    // 日本語コメント: 検索フィルタリングの実行
    const filteredList = savedList.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.creator_name && item.creator_name.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesFilter = activeFilter === 'all' || item.mode === activeFilter;
        
        return matchesSearch && matchesFilter;
    });

    // 日本語コメント: モード名に対応する和名とバッジデザイン
    const getModeLabelAndClass = (mode: SimulationMode) => {
        switch (mode) {
            case 'land_new':
                return { label: '土地から新築', className: 'bg-[#aa7c11]/15 text-[#8c6114] border-[#d4af37]/35' };
            case 'investment_used':
                return { label: '中古投資', className: 'bg-[#8a5d3b]/15 text-[#8c6114] border-[#c5a880]/35' };
            case 'land_lease':
                return { label: '借地リース', className: 'bg-[#5c3e21]/15 text-[#8c6114] border-[#d4af37]/25' };
            default:
                return { label: 'その他', className: 'bg-slate-100 text-slate-600 border-slate-200' };
        }
    };

    // 日本語コメント: 日付のフォーマット処理
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        } catch (e) {
            return dateStr;
        }
    };

    return (
        <div className="w-full min-h-screen bg-gradient-to-br from-[#fdfaf5] to-[#f3ebd9] text-[#23150d] font-sans relative overflow-hidden select-none bg-[radial-gradient(#a87c2808_1px,transparent_1px)] [background-size:24px_24px] p-8">
            {/* 上品なブロンズ・ゴールドグロー効果 */}
            <div className="absolute top-[-15%] left-[-15%] w-[800px] h-[800px] rounded-full bg-[#d4af37]/1.5 blur-[150px] pointer-events-none animate-pulse duration-10000" />
            <div className="absolute bottom-[-15%] right-[-15%] w-[800px] h-[800px] rounded-full bg-[#aa7c11]/2 blur-[150px] pointer-events-none animate-pulse duration-8000" />

            <div className="max-w-7xl mx-auto px-2 py-6 relative z-10 animate-in fade-in duration-500">
                {/* 挨拶ヘッダー */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-6 border-b border-[#e8dcc4] pb-8">
                    <div>
                        <h1 className="text-3.5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#23150d] via-[#8c6114] to-[#a87c28] tracking-wide flex items-center gap-3.5">
                            <Home className="w-8 h-8 text-[#a87c28]" />
                            お客様データ管理メニュー
                        </h1>
                        <p className="text-[#8c6114]/80 mt-2.5 text-sm font-medium tracking-wide">
                            新規シミュレーションの作成、または過去に作成された保存データを選択して再開できます。
                        </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3.5">
                        {/* 日本語コメント: JSONファイルから読み込むインポート機能 */}
                        <label className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-[#fcf9f2] hover:bg-[#ebd9c5]/60 border border-[#e8dcc4] rounded-2xl shadow-sm text-sm font-bold text-[#8c6114] cursor-pointer transition-all hover:shadow-[0_4px_12px_rgba(43,23,14,0.06)] active:scale-[0.98]">
                            <FolderOpen className="w-4 h-4 text-[#8c6114]/80" />
                            JSONインポート
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleJsonImport}
                                className="hidden"
                            />
                        </label>

                        {/* 日本語コメント: 管理者専用 ユーザー管理画面への導線 */}
                        {currentUser?.is_admin && (
                            <Button
                                onClick={() => setViewMode('admin')}
                                className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#aa7c11] to-[#8a5d3b] hover:from-[#bfa153] hover:to-[#a47b52] text-[#fdfaf5] rounded-2xl shadow-md px-4.5 py-2.5 h-auto text-sm font-bold border-none active:scale-[0.98] transition-all tracking-wide"
                            >
                                <Shield className="w-4.5 h-4.5 text-[#fdfaf5]" />
                                ユーザー管理
                            </Button>
                        )}

                        {currentUser && (
                            <div className="flex items-center gap-3.5 bg-[#fcf9f2] border border-[#e8dcc4] shadow-md rounded-2xl px-4 py-2.5 text-sm">
                                <div className={`w-9.5 h-9.5 rounded-full flex items-center justify-center ${currentUser.is_admin ? 'bg-[#aa7c11]/15 text-[#a87c28] border border-[#e8dcc4]' : 'bg-[#f5ebd9] text-[#8c6114]'}`}>
                                    {currentUser.is_admin ? <Shield className="w-5 h-5 text-[#a87c28]" /> : <User className="w-5 h-5 text-[#8c6114]" />}
                                </div>
                                <div>
                                    <div className="font-bold text-[#23150d] flex items-center gap-1.5">
                                        {currentUser.name}
                                        {currentUser.is_admin && (
                                            <span className="text-[9px] font-bold px-2.5 py-0.5 bg-[#a87c28] text-[#fdfaf5] rounded-full font-serif">
                                                管理者
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-[#8c6114]/70 font-bold tracking-wider">ID: {currentUser.employee_number}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 新規シミュレーション作成セクション */}
                <div className="mb-14">
                    <h2 className="text-lg font-bold text-[#23150d] mb-6 flex items-center gap-2.5 font-serif border-l-4 border-[#a87c28] pl-3">
                        <Plus className="w-5 h-5 text-[#a87c28]" />
                        新規シミュレーション作成
                    </h2>
                    <div className="grid gap-6 md:grid-cols-3">
                        {MODE_SCHEMES.map((scheme) => {
                            const Icon = scheme.icon;
                            // キャメルブラウンの美しい陰影
                            const themeShadowClass = 'hover:shadow-[0_15px_30px_rgba(43,23,14,0.15)] hover:border-[#d4af37]/45';
                            
                            return (
                                <button
                                    key={scheme.mode}
                                    onClick={() => handleCreateNew(scheme.mode)}
                                    className={`group text-left relative overflow-hidden bg-[#2b170e] border border-[#d4af37]/20 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 rounded-3xl p-7 flex flex-col justify-between min-h-[220px] ${themeShadowClass} text-[#fcf5e3]`}
                                >
                                    {/* 皮革のステッチ（縫い目）風の内枠 */}
                                    <div className="absolute inset-1.5 border border-dashed border-[#d4af37]/20 rounded-[20px] pointer-events-none" />
                                    
                                    {/* カード内の背景微細グラデーション */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${scheme.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                                    
                                    <div className="relative z-10 flex flex-col h-full justify-between w-full">
                                        <div className="mb-5 flex justify-between items-start">
                                            <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-[9px] font-black uppercase tracking-wider ${scheme.badgeClass}`}>
                                                {scheme.badge}
                                            </span>
                                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm border border-[#d4af37]/20 group-hover:scale-110 group-hover:shadow-md ${scheme.iconBg}`}>
                                                <Icon className="w-5.5 h-5.5" />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <h3 className="text-xl font-bold text-white group-hover:text-[#f3e7c4] transition-colors mb-2.5 font-serif">
                                                {scheme.title}
                                            </h3>
                                            <p className="text-[#fcf5e3]/80 text-xs leading-relaxed font-medium">
                                                {scheme.description}
                                            </p>
                                        </div>
                                        
                                        <div className="mt-6 flex items-center text-xs font-bold text-[#d4af37] opacity-90 group-hover:opacity-100 transition-opacity">
                                            新規作成を開始
                                            <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 保存データ一覧セクション */}
                <div className="bg-[#fcf9f2]/90 border border-[#e8dcc4] rounded-3xl shadow-lg overflow-hidden relative">
                    {/* 皮革のステッチ縫い目内枠（コンテナ全体） */}
                    <div className="absolute inset-1.5 border border-dashed border-[#e8dcc4]/55 rounded-[20px] pointer-events-none" />

                    {/* ツールバー */}
                    <div className="p-6.5 border-b border-[#e8dcc4] flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                        <h2 className="text-lg font-bold text-[#23150d] flex items-center gap-2.5 font-serif">
                            <Database className="w-5 h-5 text-[#a87c28]" />
                            保存済みお客様データ一覧
                        </h2>
                        
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                            {/* 検索窓 */}
                            <div className="relative max-w-xs">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-[#8c6114]/60" />
                                </span>
                                <input
                                    type="text"
                                    placeholder="お客様名、物件名、作成者..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9.5 pr-4 py-2.5 bg-white border border-[#e8dcc4] rounded-xl text-[#23150d] text-sm placeholder-[#8c7466] focus:outline-none focus:ring-2 focus:ring-[#a87c28]/20 focus:border-[#a87c28] transition-all font-medium"
                                />
                            </div>

                            {/* リロードボタン */}
                            <Button
                                variant="outline"
                                onClick={fetchSavedList}
                                disabled={isLoadingList}
                                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white border-[#e8dcc4] hover:bg-[#ebd9c5]/30 text-[#8c6114] rounded-xl text-xs h-auto font-bold"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingList ? 'animate-spin' : ''} text-[#a87c28]`} />
                                更新
                            </Button>
                        </div>
                    </div>

                    {/* 絞り込みタブ */}
                    <div className="px-6.5 py-2.5 bg-[#f5ebd9]/45 border-b border-[#e8dcc4] flex overflow-x-auto gap-2 relative z-10">
                        <button
                            onClick={() => setActiveFilter('all')}
                            className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all whitespace-nowrap ${
                                activeFilter === 'all'
                                    ? 'bg-[#fdfaf5] border-[#e8dcc4] text-[#8c6114] shadow-sm'
                                    : 'border-transparent text-[#8c6114]/60 hover:text-[#23150d]'
                            }`}
                        >
                            すべて表示 ({savedList.length})
                        </button>
                        <button
                            onClick={() => setActiveFilter('land_new')}
                            className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all whitespace-nowrap ${
                                activeFilter === 'land_new'
                                    ? 'bg-[#fdfaf5] border-[#e8dcc4] text-[#8c6114] shadow-sm'
                                    : 'border-transparent text-[#8c6114]/60 hover:text-[#23150d]'
                            }`}
                        >
                            土地から新築 ({savedList.filter(i => i.mode === 'land_new').length})
                        </button>
                        <button
                            onClick={() => setActiveFilter('investment_used')}
                            className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all whitespace-nowrap ${
                                activeFilter === 'investment_used'
                                    ? 'bg-[#fdfaf5] border-[#e8dcc4] text-[#8c6114] shadow-sm'
                                    : 'border-transparent text-[#8c6114]/60 hover:text-[#23150d]'
                            }`}
                        >
                            中古投資 ({savedList.filter(i => i.mode === 'investment_used').length})
                        </button>
                        <button
                            onClick={() => setActiveFilter('land_lease')}
                            className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all whitespace-nowrap ${
                                activeFilter === 'land_lease'
                                    ? 'bg-[#fdfaf5] border-[#e8dcc4] text-[#8c6114] shadow-sm'
                                    : 'border-transparent text-[#8c6114]/60 hover:text-[#23150d]'
                            }`}
                        >
                            借地リース ({savedList.filter(i => i.mode === 'land_lease').length})
                        </button>
                    </div>

                    {/* リスト本体 */}
                    <div className="overflow-x-auto relative z-10 bg-white/50">
                        {isLoadingList ? (
                            <div className="py-24 flex flex-col items-center justify-center bg-white/80">
                                <Loader2 className="w-10 h-10 text-[#a87c28] animate-spin mb-4" />
                                <p className="text-[#8c6114] text-sm font-medium animate-pulse">データを読み込み中...</p>
                            </div>
                        ) : listError ? (
                            <div className="py-20 px-6 text-center">
                                <div className="inline-flex p-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-full mb-4">
                                    <AlertCircle className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-[#23150d] mb-1">一覧の取得に失敗しました</h3>
                                <p className="text-[#8c6114] text-sm mb-4">{listError}</p>
                                <Button onClick={fetchSavedList} variant="outline" size="sm" className="mx-auto border-[#e8dcc4] text-[#8c6114]">
                                    再試行
                                </Button>
                            </div>
                        ) : filteredList.length === 0 ? (
                            <div className="py-24 text-center text-[#8c6114]/60 bg-white/80">
                                <FolderOpen className="w-12 h-12 text-[#ebd9c5] mx-auto mb-4" />
                                <p className="text-sm font-medium">該当する保存データはありません</p>
                                <p className="text-xs text-[#8c6114]/50 mt-1.5">新規シミュレーションを作成して保存してください</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#f5ebd9]/30 text-[#8c6114]/85 font-bold text-xs uppercase tracking-widest border-b border-[#e8dcc4]">
                                        <th className="py-4.5 px-6 font-bold">お客様名・シミュレーションタイトル</th>
                                        <th className="py-4.5 px-6 font-bold w-40">事業スキーム</th>
                                        {currentUser?.is_admin && (
                                            <th className="py-4.5 px-6 font-bold w-44">作成者</th>
                                        )}
                                        <th className="py-4.5 px-6 font-bold w-48">最終更新日時</th>
                                        <th className="py-4.5 px-6 font-bold w-32 text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredList.map((item) => {
                                        const { label, className } = getModeLabelAndClass(item.mode);
                                        return (
                                            <tr
                                                key={item.id}
                                                onClick={() => handleLoad(item.id)}
                                                className="border-b border-[#e8dcc4]/55 hover:bg-[#f5ebd9]/20 transition-all duration-300 cursor-pointer group"
                                            >
                                                <td className="py-5 px-6">
                                                    <div className="font-bold text-[#23150d] group-hover:text-[#8c6114] transition-colors flex items-center gap-2">
                                                        <span>{item.title}</span>
                                                        <ChevronRight className="w-4 h-4 text-[#a87c28] opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all duration-300" />
                                                    </div>
                                                </td>
                                                <td className="py-5 px-6">
                                                    <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-bold ${className}`}>
                                                        {label}
                                                    </span>
                                                </td>
                                                {currentUser?.is_admin && (
                                                    <td className="py-5 px-6">
                                                        <div className="flex items-center gap-2 text-[#23150d] text-xs font-bold">
                                                            <div className="w-6 h-6 rounded-full bg-[#ebd9c5] text-[#8c6114] flex items-center justify-center font-bold border border-[#e8dcc4]">
                                                                {(item.creator_name || '未').charAt(0)}
                                                            </div>
                                                            <span>{item.creator_name || '未設定'}</span>
                                                            <span className="text-[10px] text-[#8c6114]/70 font-normal">({item.created_by})</span>
                                                        </div>
                                                    </td>
                                                )}
                                                <td className="py-5 px-6 text-[#8c6114]/80 text-xs font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-3.5 h-3.5 opacity-60 text-[#a87c28]" />
                                                        <span>{formatDate(item.updated_at)}</span>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={(e) => handleDelete(e, item.id, item.title)}
                                                            disabled={isDeletingId === item.id}
                                                            className="p-2 text-[#8c6114]/60 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all"
                                                            title="削除"
                                                        >
                                                            {isDeletingId === item.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                                                            ) : (
                                                                <Trash2 className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
