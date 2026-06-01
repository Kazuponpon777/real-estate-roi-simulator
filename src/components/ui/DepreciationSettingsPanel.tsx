import React from 'react';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { Card } from './Card';
import { Slider } from './Slider';
import { STATUTORY_USEFUL_LIFE, calculateDepreciation } from '../../utils/taxCalculations';
import { formatCurrency } from '../../utils/formatters';

/**
 * 減価償却・税務詳細設定コントローラーパネル
 * 物件の構造、築年数、耐用年数の計算方式、設備比率を美麗なUIで調整可能
 */
export const DepreciationSettingsPanel: React.FC = () => {
    const { data, updateProperty, updateAdvancedSettings } = useSimulationStore();
    
    const isUsed = data.mode === 'investment_used';
    const isLeaseMode = data.mode === 'land_lease';
    const buildingRatio = data.advancedSettings?.buildingRatio ?? 50;
    const usefulLifeMethod = data.advancedSettings?.usefulLifeMethod ?? 'simplified';
    const equipmentRatio = data.advancedSettings?.equipmentRatio ?? 0.2;
    const buildingAge = data.advancedSettings?.buildingAge ?? 0;
    
    // 現在の設定に応じた建物・土地価格と償却期間の概算
    const buildingTotalCostYen = isUsed
        ? (data.budget.landPrice * buildingRatio / 100) * 10000
        : data.budget.buildingWorksCost * 10000;

    const landTotalCostYen = isUsed
        ? (data.budget.landPrice * (100 - buildingRatio) / 100) * 10000
        : (isLeaseMode ? (data.budget.landLeaseDeposit ?? 0) * 10000 : data.budget.landPrice * 10000);

    const depInfo = calculateDepreciation(
        data.property.structure,
        buildingTotalCostYen,
        equipmentRatio,
        isUsed,
        buildingAge,
        usefulLifeMethod,
        data.advancedSettings?.customBuildingUsefulLife,
        data.advancedSettings?.customEquipmentUsefulLife
    );

    return (
        <Card className="border-indigo-100 bg-white/70 backdrop-blur-md p-6 rounded-2xl shadow-sm space-y-6 no-print">
            <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                    減価償却・税額シミュレーション詳細設定
                </h3>
                <p className="text-xs text-slate-500 mt-1">減価償却費の按分比率や、築年数に応じた耐用年数の計算方式をリアルタイムで変更します。</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 左側：設定項目 */}
                <div className="space-y-5">
                    {/* 物件構造 */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">物件構造 (法定耐用年数の基準)</label>
                        <select
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            value={data.property.structure}
                            onChange={(e) => updateProperty({ structure: e.target.value as any })}
                        >
                            <option value="RC">RC造 (鉄筋コンクリート: 法定47年)</option>
                            <option value="S">S造 (鉄骨造: 法定34年)</option>
                            <option value="Wood">木造 (法定22年)</option>
                            <option value="SteelLight">軽量鉄骨造 (法定27年)</option>
                        </select>
                    </div>

                    {/* 償却期間算出方法 */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">耐用年数（償却期間）の算出方法</label>
                        <select
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            value={usefulLifeMethod}
                            onChange={(e) => updateAdvancedSettings({ usefulLifeMethod: e.target.value as any })}
                        >
                            <option value="simplified" disabled={!isUsed}>中古物件の簡便法を適用 (税法推奨)</option>
                            <option value="statutory">法定耐用年数をそのまま適用 (新築同様)</option>
                            <option value="custom">直接カスタマイズ指定 (カスタム指定)</option>
                        </select>
                        {!isUsed && (
                            <p className="text-[10px] text-slate-400">※新築・借地では法定耐用年数が初期適用されます。「直接カスタマイズ指定」を選択することで償却期間を自由に変更可能です。</p>
                        )}
                    </div>

                    {/* カスタム耐用年数入力 (カスタム選択時のみ表示) */}
                    {usefulLifeMethod === 'custom' && (
                        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 animate-in fade-in duration-300">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600">建物 償却期間 (年)</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                                    value={data.advancedSettings?.customBuildingUsefulLife ?? STATUTORY_USEFUL_LIFE[data.property.structure]}
                                    onChange={(e) => updateAdvancedSettings({ customBuildingUsefulLife: Math.max(1, parseInt(e.target.value) || 1) })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600">設備 償却期間 (年)</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={50}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                                    value={data.advancedSettings?.customEquipmentUsefulLife ?? 15}
                                    onChange={(e) => updateAdvancedSettings({ customEquipmentUsefulLife: Math.max(1, parseInt(e.target.value) || 1) })}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* 右側：スライダー調整 */}
                <div className="space-y-5">
                    {/* 建物割合スライダー (中古物件のみ表示) */}
                    {isUsed ? (
                        <Slider
                            label="建物価格の割合 (購入総額に対する建物比率)"
                            min={10}
                            max={90}
                            step={5}
                            value={buildingRatio}
                            onChange={(val) => updateAdvancedSettings({ buildingRatio: val })}
                            unit="%"
                            description="購入総額のうち、何％を減価償却可能な「建物」とするかの割合です。一般的に40%〜60%程度で設定します。"
                        />
                    ) : (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 space-y-1">
                            <span className="font-bold text-slate-700 block">{isLeaseMode ? '借地リース物件の按分価格' : '新築物件の按分価格'}</span>
                            <p>{isLeaseMode ? '借地リースでは、土地は地主から借りるため「建物本体工事費」のみが初期減価償却の対象となります。土地保証金は期末に返還される非償却資産となります。' : '新築では、土地価格（敷地仕入れ代金）と本体工事費（建物総額）が明確に分かれているため、建物割合は自動的に 100% (本体工事費全額) が償却対象となります。'}</p>
                        </div>
                    )}

                    {/* 設備比率スライダー */}
                    <Slider
                        label="設備按分比率 (建物価格に占める設備の割合)"
                        min={0}
                        max={0.5}
                        step={0.05}
                        value={equipmentRatio}
                        onChange={(val) => updateAdvancedSettings({ equipmentRatio: val })}
                        unit=""
                        description="建物全体の価格のうち、15年で早期償却できる「建物附属設備」に割り当てる割合。比率を高くするほど初期の節税効果が高まります。"
                    />

                    {/* 築年数スライダー (中古物件のみ表示) */}
                    {isUsed && (
                        <Slider
                            label="中古物件の築年数"
                            min={0}
                            max={50}
                            step={1}
                            value={buildingAge}
                            onChange={(val) => updateAdvancedSettings({ buildingAge: val })}
                            unit="年"
                            description="物件の経過築年数。簡便法を選択している場合、これに基づいて税法に則った正確な残存耐用年数が自動計算されます。"
                        />
                    )}
                </div>
            </div>

            {/* 下部：リアルタイム按分結果の表示 */}
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-xs">
                <div>
                    <span className="text-slate-400 block mb-0.5">償却対象 建物本体</span>
                    <span className="font-bold text-slate-800 text-sm font-mono">{formatCurrency(buildingTotalCostYen * (1 - equipmentRatio))}</span>
                    <span className="text-slate-400 block text-[10px] mt-0.5">({usefulLifeMethod === 'custom' ? depInfo.buildingUsefulLife : depInfo.buildingUsefulLife}年償却)</span>
                </div>
                <div>
                    <span className="text-slate-400 block mb-0.5">償却対象 附属設備</span>
                    <span className="font-bold text-indigo-600 text-sm font-mono">{formatCurrency(buildingTotalCostYen * equipmentRatio)}</span>
                    <span className="text-slate-400 block text-[10px] mt-0.5">({usefulLifeMethod === 'custom' ? depInfo.equipmentUsefulLife : depInfo.equipmentUsefulLife}年償却)</span>
                </div>
                <div>
                    <span className="text-slate-400 block mb-0.5">{isLeaseMode ? '非償却対象 保証金' : '非償却対象 土地分'}</span>
                    <span className="font-bold text-slate-800 text-sm font-mono">{formatCurrency(landTotalCostYen)}</span>
                    <span className="text-slate-400 block text-[10px] mt-0.5">(非減価償却資産)</span>
                </div>
                <div>
                    <span className="text-slate-400 block mb-0.5">初年度 減価償却費計</span>
                    <span className="font-bold text-emerald-600 text-sm font-mono">{formatCurrency(depInfo.totalDepreciation)}</span>
                    <span className="text-slate-400 block text-[10px] mt-0.5">(年間損金計上額)</span>
                </div>
            </div>
        </Card>
    );
};
