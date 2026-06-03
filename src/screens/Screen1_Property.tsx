import React, { useState } from 'react';
import { useSimulationStore } from '../stores/useSimulationStore';
import { Card } from '../components/ui/Card';
import { InputGroup } from '../components/ui/InputGroup';
import { Button } from '../components/ui/Button';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { TSUBO_TO_M2 } from '../utils/calculations';
import { validateProperty, validateAndSanitizeUrl, type ValidationErrors } from '../utils/validation';
import { MapDisplay } from '../components/ui/MapDisplay';
import { DocumentManager } from '../components/ui/DocumentManager';
import type { PropertyDocument } from '../stores/useSimulationStore';

export const Screen1_Property: React.FC = () => {
    const { data, updateProperty, updateBudget, updateAdvancedSettings, nextStep, prevStep } = useSimulationStore();
    const [activeTab, setActiveTab] = useState<'land' | 'building'>('land');
    const [errors, setErrors] = useState<ValidationErrors>({});

    const [areaUnit, setAreaUnit] = useState<'m2' | 'tsubo'>('m2');
    const [localTsubo, setLocalTsubo] = useState<string>(
        data.property.landAreaM2 ? (data.property.landAreaM2 / TSUBO_TO_M2).toFixed(2) : ''
    );

    // 平米が変更されたときの同期
    const handleM2Change = (m2Val: number) => {
        updateLandM2(m2Val);
        setLocalTsubo(m2Val > 0 ? (m2Val / TSUBO_TO_M2).toFixed(2) : '');
    };

    // 坪数が変更されたときの同期
    const handleTsuboChange = (tsuboVal: number) => {
        setLocalTsubo(tsuboVal.toString());
        updateLandM2(tsuboVal * TSUBO_TO_M2);
    };

    const isLandMode = data.mode === 'land_new';
    const isLeaseMode = data.mode === 'land_lease';
    const isUsedMode = data.mode === 'investment_used';

    const handleNext = () => {
        // 日本語コメント: 遷移時にクラウドフォルダのURLサニタイズを実行
        if (data.property.cloudFolderUrl) {
            const sanitized = validateAndSanitizeUrl(data.property.cloudFolderUrl);
            updateProperty({ cloudFolderUrl: sanitized || '' });
        }
        const validationErrors = validateProperty(data);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        setErrors({});
        nextStep();
    };

    const updateLandM2 = (m2: number) => {
        updateProperty({ landAreaM2: m2 });
    };

    const handleAddDocument = (doc: PropertyDocument) => {
        const newDocs = [...(data.property.documents || []), doc];
        updateProperty({ documents: newDocs });
    };

    const handleDeleteDocument = (id: string) => {
        const newDocs = (data.property.documents || []).filter(d => d.id !== id);
        updateProperty({ documents: newDocs });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in pb-20">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[#23150d]">物件概要 (Property Details)</h2>
                <div className="flex space-x-2 bg-[#ebd9c5]/30 p-1 rounded-lg border border-[#ebd9c5]/60">
                    <button
                        onClick={() => setActiveTab('land')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'land' ? 'bg-[#fdfaf5] text-[#8c6114] shadow-sm border border-[#e8dcc4]/50' : 'text-[#8c6c59] hover:text-[#23150d]'
                            }`}
                    >
                        敷地概要
                    </button>
                    <button
                        onClick={() => setActiveTab('building')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'building' ? 'bg-[#fdfaf5] text-[#8c6114] shadow-sm border border-[#e8dcc4]/50' : 'text-[#8c6c59] hover:text-[#23150d]'
                            }`}
                    >
                        建物概要
                    </button>
                </div>
            </div>

            <div className="grid gap-6">
                {activeTab === 'land' ? (
                    <Card className="space-y-6">
                        <h3 className="text-lg font-bold text-[#23150d] border-b border-[#ebd9c5] pb-2 mb-4">敷地情報</h3>

                        <div className="grid md:grid-cols-2 gap-6">
                            <InputGroup
                                label="所在地"
                                placeholder="例: 名古屋市中村区名駅..."
                                value={data.property.address}
                                onChange={(e) => updateProperty({ address: e.target.value })}
                                className="md:col-span-2"
                            />

                            {/* 【借地リース特別UI】地主への月額地代および土地敷金を入力するフォーム */}
                            {data.mode === 'land_lease' && (
                                <div className="md:col-span-2 grid md:grid-cols-2 gap-6 p-4 bg-[#fcf9f2] rounded-xl border border-[#ebd9c5] shadow-sm">
                                    <InputGroup
                                        label="地主への月額地代"
                                        type="number"
                                        unit="円/月"
                                        help="地権者へ毎月支払う土地の賃料（地代）です。これは運営費（経費）に自動加算されます。"
                                        value={data.advancedSettings?.landLeaseFee || ''}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            updateAdvancedSettings({ landLeaseFee: isNaN(val) ? 0 : val });
                                        }}
                                    />
                                    <InputGroup
                                        label="土地敷金 (地主への敷金)"
                                        type="number"
                                        unit="万円"
                                        help="契約時に地主に預託する敷金です。敷金は運用最終年に返還回収される前提でIRR計算等に反映されます。"
                                        value={data.budget.landLeaseDeposit || ''}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            updateBudget({ landLeaseDeposit: isNaN(val) ? 0 : val });
                                        }}
                                    />
                                </div>
                            )}

                            <div className="md:col-span-2">
                                <label className="text-sm font-bold text-[#23150d]/80 block mb-2">地図確認</label>
                                <MapDisplay
                                    address={data.property.address}
                                    latitude={data.property.latitude}
                                    longitude={data.property.longitude}
                                    onLocationChange={(lat, lon) => updateProperty({ latitude: lat, longitude: lon })}
                                />
                            </div>

                            {/* 【ダイナミック表示】敷地面積の入力基準・間口奥行は新築(land_new)のみ表示 */}
                            {isLandMode && (
                                <div className="md:col-span-2 grid md:grid-cols-2 gap-6 p-4 bg-[#ebd9c5]/15 rounded-xl border border-[#ebd9c5]">
                                    <div className="space-y-4">
                                        <label className="text-sm font-bold text-[#23150d]/85">敷地面積の入力基準</label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    checked={data.property.landAreaMode === 'public'}
                                                    onChange={() => updateProperty({ landAreaMode: 'public' })}
                                                    className="text-[#a87c28] focus:ring-[#a87c28]/40 accent-[#a87c28]"
                                                />
                                                <span className="text-sm font-bold text-[#23150d]/75">公簿面積</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    checked={data.property.landAreaMode === 'actual'}
                                                    onChange={() => updateProperty({ landAreaMode: 'actual' })}
                                                    className="text-[#a87c28] focus:ring-[#a87c28]/40 accent-[#a87c28]"
                                                />
                                                <span className="text-sm font-bold text-[#23150d]/75">実測面積</span>
                                            </label>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs font-bold text-[#8c6c59]">面積単位の選択</label>
                                                <div className="flex bg-[#ebd9c5]/35 p-0.5 rounded-lg text-[10px] font-bold border border-[#ebd9c5]/55">
                                                    <button
                                                        type="button"
                                                        onClick={() => setAreaUnit('m2')}
                                                        className={`px-2 py-0.5 rounded transition-all ${areaUnit === 'm2' ? 'bg-[#fdfaf5] text-[#8c6114] shadow-sm' : 'text-[#8c6c59] hover:text-[#23150d]'}`}
                                                    >
                                                        ㎡基準
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAreaUnit('tsubo')}
                                                        className={`px-2 py-0.5 rounded transition-all ${areaUnit === 'tsubo' ? 'bg-[#fdfaf5] text-[#8c6114] shadow-sm' : 'text-[#8c6c59] hover:text-[#23150d]'}`}
                                                    >
                                                        坪基準
                                                    </button>
                                                </div>
                                            </div>
                                            <InputGroup
                                                label={areaUnit === 'm2' ? "敷地面積 (㎡)" : "敷地面積 (坪)"}
                                                type="number"
                                                unit={areaUnit === 'm2' ? "㎡" : "坪"}
                                                help={areaUnit === 'm2' ? "登記簿または実測による敷地の面積。建蔽率・容積率の計算基礎になります" : "登記簿または実測による敷地の面積（坪単位）。建蔽率・容積率の計算基礎になります"}
                                                value={areaUnit === 'm2' ? (data.property.landAreaM2 || '') : (localTsubo || '')}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    if (areaUnit === 'm2') {
                                                        handleM2Change(val);
                                                    } else {
                                                        handleTsuboChange(val);
                                                    }
                                                }}
                                            />
                                            <div className="text-right text-xs text-[#8c6c59] font-semibold font-mono">
                                                {areaUnit === 'm2'
                                                    ? `≒ ${(data.property.landAreaM2 ? data.property.landAreaM2 / TSUBO_TO_M2 : 0).toFixed(2)} 坪`
                                                    : `≒ ${(data.property.landAreaM2 || 0).toFixed(2)} ㎡`}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <InputGroup
                                                label="間口"
                                                type="number"
                                                unit="m"
                                                value={data.property.frontage || ''}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    updateProperty({ frontage: isNaN(val) ? 0 : val });
                                                }}
                                            />
                                            <InputGroup
                                                label="奥行"
                                                type="number"
                                                unit="m"
                                                value={data.property.depth || ''}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    updateProperty({ depth: isNaN(val) ? 0 : val });
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!isLandMode && (
                                <div className="md:col-span-2 p-4 bg-[#ebd9c5]/15 rounded-xl border border-[#ebd9c5]">
                                    <div className="grid md:grid-cols-2 gap-6 items-center">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs font-bold text-[#8c6c59]">面積単位の選択</label>
                                                <div className="flex bg-[#ebd9c5]/35 p-0.5 rounded-lg text-[10px] font-bold border border-[#ebd9c5]/55">
                                                    <button
                                                        type="button"
                                                        onClick={() => setAreaUnit('m2')}
                                                        className={`px-2 py-0.5 rounded transition-all ${areaUnit === 'm2' ? 'bg-[#fdfaf5] text-[#8c6114] shadow-sm' : 'text-[#8c6c59] hover:text-[#23150d]'}`}
                                                    >
                                                        ㎡基準
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAreaUnit('tsubo')}
                                                        className={`px-2 py-0.5 rounded transition-all ${areaUnit === 'tsubo' ? 'bg-[#fdfaf5] text-[#8c6114] shadow-sm' : 'text-[#8c6c59] hover:text-[#23150d]'}`}
                                                    >
                                                        坪基準
                                                    </button>
                                                </div>
                                            </div>
                                            <InputGroup
                                                label={areaUnit === 'm2' ? "敷地面積 (㎡)" : "敷地面積 (坪)"}
                                                type="number"
                                                unit={areaUnit === 'm2' ? "㎡" : "坪"}
                                                help={areaUnit === 'm2' ? "敷地の登録面積です。" : "敷地の登録面積（坪単位）。"}
                                                value={areaUnit === 'm2' ? (data.property.landAreaM2 || '') : (localTsubo || '')}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    if (areaUnit === 'm2') {
                                                        handleM2Change(val);
                                                    } else {
                                                        handleTsuboChange(val);
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div className="text-left text-sm text-[#3d251a] font-bold font-mono mt-6">
                                            {areaUnit === 'm2'
                                                ? <>坪数換算: <span className="text-[#8c6114]">{(data.property.landAreaM2 ? data.property.landAreaM2 / TSUBO_TO_M2 : 0).toFixed(2)}</span> 坪</>
                                                : <>平米換算: <span className="text-[#8c6114]">{(data.property.landAreaM2 || 0).toFixed(2)}</span> ㎡</>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 【ダイナミック表示】道路付けは新築(land_new)のみ表示 */}
                            {isLandMode && (
                                <div className="md:col-span-2 p-4 bg-[#ebd9c5]/15 rounded-xl border border-[#ebd9c5]">
                                    <h4 className="text-sm font-bold text-[#23150d] mb-4">道路付け</h4>
                                    <div className="grid md:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-bold text-[#23150d]/80">種類</label>
                                            <select
                                                className="w-full rounded-lg border border-[#e8dcc4] bg-white px-3 py-2.5 text-[#23150d] focus:border-[#a87c28] focus:outline-none focus:ring-2 focus:ring-[#a87c28]/20"
                                                value={data.property.roadType1}
                                                onChange={(e) => updateProperty({ roadType1: e.target.value })}
                                            >
                                                <option value="公道">公道</option>
                                                <option value="私道">私道</option>
                                                <option value="県道">県道</option>
                                                <option value="市道">市道</option>
                                            </select>
                                        </div>
                                        <InputGroup
                                            label="方位"
                                            placeholder="例: 南側"
                                            value={data.property.roadDirection1}
                                            onChange={(e) => updateProperty({ roadDirection1: e.target.value })}
                                        />
                                        <InputGroup
                                            label="幅員"
                                            type="number"
                                            unit="m"
                                            value={data.property.roadWidth1 || ''}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                updateProperty({ roadWidth1: isNaN(val) ? 0 : val });
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 【ダイナミック表示】用途地域や建蔽率・容積率は新築(land_new)と借地(land_lease)（建築計画を伴うモード）のみ表示 */}
                            {(isLandMode || isLeaseMode) && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-bold text-[#23150d]/80">都市計画区域</label>
                                            <select
                                                className="w-full rounded-lg border border-[#e8dcc4] bg-white px-3 py-2.5 text-[#23150d] focus:border-[#a87c28] focus:outline-none focus:ring-2 focus:ring-[#a87c28]/20"
                                                value={data.property.urbanizationArea}
                                                onChange={(e) => updateProperty({ urbanizationArea: e.target.value as any })}
                                            >
                                                <option value="urbanization">市街化区域</option>
                                                <option value="adjustment">市街化調整区域</option>
                                            </select>
                                        </div>
                                        <InputGroup
                                            label="用途地域"
                                            placeholder="例: 第一種住居"
                                            value={data.property.zoning}
                                            onChange={(e) => updateProperty({ zoning: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <InputGroup
                                            label="建蔽率"
                                            type="number"
                                            unit="%"
                                            help="敷地面積に対する建築面積の割合。用途地域ごとに上限が定められています"
                                            value={data.property.coverageRate || ''}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                updateProperty({ coverageRate: isNaN(val) ? 0 : val });
                                            }}
                                        />
                                        <InputGroup
                                            label="容積率"
                                            type="number"
                                            unit="%"
                                            help="敷地面積に対する延床面積の上限割合。建物ボリュームの上限を決めます"
                                            value={data.property.floorAreaRate || ''}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                updateProperty({ floorAreaRate: isNaN(val) ? 0 : val });
                                            }}
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="border-t border-[#ebd9c5] pt-6 mt-6 space-y-6">
                            {/* Cloud Storage Link */}
                            <div className="bg-[#fcf9f2] p-4 rounded-xl border border-[#e8dcc4] shadow-sm">
                                <label className="text-sm font-bold text-[#23150d] block mb-2">クラウドストレージ連携 (Google Drive / OneDrive)</label>
                                <p className="text-xs text-[#8c6c59] mb-3 font-medium">
                                    元データ（公図・謄本など）が保存されているクラウドフォルダの共有リンクをここに貼り付けておくと、後からすぐにアクセスできます。
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        placeholder="例: https://drive.google.com/drive/folders/..."
                                        className="flex-1 rounded-lg border border-[#e8dcc4] bg-white px-3 py-2 text-sm text-[#23150d] focus:border-[#a87c28] focus:outline-none focus:ring-2 focus:ring-[#a87c28]/20"
                                        value={data.property.cloudFolderUrl || ''}
                                        onChange={(e) => updateProperty({ cloudFolderUrl: e.target.value })}
                                        onBlur={(e) => {
                                            const val = e.target.value;
                                            if (val) {
                                                const sanitized = validateAndSanitizeUrl(val);
                                                updateProperty({ cloudFolderUrl: sanitized || '' });
                                            }
                                        }}
                                    />
                                    {/* 【XSS脆弱性対策】URLがhttp:// または https:// で始まっている安全なリンクのみ開くボタンを有効化 */}
                                    {data.property.cloudFolderUrl && 
                                     (data.property.cloudFolderUrl.startsWith('http://') || data.property.cloudFolderUrl.startsWith('https://')) && (
                                        <a
                                            href={data.property.cloudFolderUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-gradient-to-r from-[#aa7c11] to-[#8a5d3b] hover:from-[#bfa153] hover:to-[#a47b52] text-white text-sm font-bold rounded-lg transition-colors flex items-center shadow"
                                        >
                                            開く
                                        </a>
                                    )}
                                </div>
                            </div>

                            <DocumentManager
                                documents={data.property.documents || []}
                                onAdd={handleAddDocument}
                                onDelete={handleDeleteDocument}
                            />
                        </div>
                    </Card>
                ) : (
                    <Card className="space-y-6">
                        <h3 className="text-lg font-bold text-[#23150d] border-b border-[#ebd9c5] pb-2 mb-4">建物情報</h3>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-[#23150d]/80">構造</label>
                                <select
                                    className="w-full rounded-lg border border-[#e8dcc4] bg-white px-3 py-2.5 text-[#23150d] focus:border-[#a87c28] focus:outline-none focus:ring-2 focus:ring-[#a87c28]/20"
                                    value={data.property.structure}
                                    onChange={(e) => updateProperty({ structure: e.target.value as any })}
                                >
                                    <option value="RC">RC (鉄筋コンクリート)</option>
                                    <option value="S">S (鉄骨)</option>
                                    <option value="Wood">木造</option>
                                    <option value="SteelLight">軽量鉄骨</option>
                                </select>
                            </div>

                            <InputGroup
                                label="総戸数"
                                type="number"
                                unit="戸"
                                value={data.property.totalUnits || ''}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    updateProperty({ totalUnits: isNaN(val) ? 0 : val });
                                }}
                            />

                            <InputGroup
                                label="建築面積"
                                type="number"
                                unit="㎡"
                                value={data.property.buildingAreaM2 || ''}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    updateProperty({ buildingAreaM2: isNaN(val) ? 0 : val });
                                }}
                            />

                            <InputGroup
                                label="延床面積"
                                type="number"
                                unit="㎡"
                                value={data.property.totalFloorAreaM2 || ''}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    updateProperty({ totalFloorAreaM2: isNaN(val) ? 0 : val });
                                }}
                            />

                            {/* 【中古物件専用】築年数（減価償却の算出基礎）を特別ハイライト表示 */}
                            {isUsedMode && (
                                <div className="md:col-span-2 p-5 bg-[#fcf9f2] rounded-2xl border border-[#ebd9c5] shadow-sm space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-[#8c6114] uppercase tracking-wider bg-[#fcf5e3] px-2.5 py-0.5 rounded-full border border-[#ebd9c5]">
                                            中古シミュレーションの超重要項目
                                        </span>
                                    </div>
                                    <InputGroup
                                        label="物件の築年数"
                                        type="number"
                                        unit="年"
                                        help="築年数に基づき、中古資産の「簡便法（残存耐用年数）」が自動計算され、毎年の減価償却費と所得税節税効果が算出されます。"
                                        value={data.advancedSettings?.buildingAge || ''}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            updateAdvancedSettings({ buildingAge: isNaN(val) ? 0 : val });
                                        }}
                                    />
                                    <p className="text-[11px] text-[#8c6114] font-medium leading-relaxed">
                                        💡 構造（RC:47年、S:34年、木造:22年）の法定耐用年数を超えている場合でも、「法定耐用年数 × 20%」が償却期間として適用されます。
                                    </p>
                                </div>
                            )}
                        </div>
                    </Card>
                )}
            </div>

            <div className="flex justify-between pt-6 border-t border-[#ebd9c5]">
                {/* 戻るボタンで安全にメニュー画面または前のステップへ戻る */}
                <Button variant="ghost" onClick={prevStep} className="flex items-center gap-2 text-[#8c6114] hover:text-[#23150d] hover:bg-[#ebd9c5]/20">
                    <ArrowLeft className="h-4 w-4" /> 戻る
                </Button>
                {Object.keys(errors).length > 0 && (
                    <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 font-semibold shadow-sm">
                        ❗ 入力内容に不足があります: {Object.values(errors).join(', ')}
                    </div>
                )}
                <Button onClick={handleNext} className="flex items-center gap-2">
                    次へ <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};
