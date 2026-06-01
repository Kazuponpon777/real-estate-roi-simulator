/**
 * ============================================================
 *  AI組織型コードレビュー済み
 *  レビュー日: 2026-06-01
 *  レビュー部署: バグチェック部 / セキュリティ部 / 改善提案部
 *  統合修正: 開発部
 * ============================================================
 */

import React from 'react';
import { useSimulationStore } from '../stores/useSimulationStore';
import type { RoomType } from '../stores/useSimulationStore';
import { Card } from '../components/ui/Card';

import { InputGroup } from '../components/ui/InputGroup';
import { Button } from '../components/ui/Button';
import { ChevronRight, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { formatManYen } from '../utils/formatters';
import { validateRentRoll, type ValidationErrors } from '../utils/validation';

export const Screen4_RentRoll: React.FC = () => {
    const { data, updateRentRoll, updateExpenses, nextStep, prevStep } = useSimulationStore();

    // ローカルのエラー状態を定義
    const [errors, setErrors] = React.useState<ValidationErrors>({});

    // バリデーションチェックを実行して次へ進む
    const handleNext = () => {
        const validationErrors = validateRentRoll(data);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        setErrors({});
        nextStep();
    };

    // Helpers for Rent Roll
    const addRoomTypeWithUsage = (usage: 'residential' | 'commercial') => {
        const isComm = usage === 'commercial';
        const newRoom: RoomType = {
            id: Math.random().toString(36).substr(2, 9),
            name: isComm 
                ? `店舗${String.fromCharCode(65 + data.rentRoll.roomTypes.filter(r => r.usage === 'commercial').length)}`
                : `住居${String.fromCharCode(65 + data.rentRoll.roomTypes.filter(r => (r.usage || 'residential') === 'residential').length)}`,
            count: 1,
            areaM2: isComm ? 60 : 25,
            rent: isComm ? 150000 : 65000,
            commonFee: isComm ? 10000 : 5000,
            cooperationMonths: isComm ? 120 : 0, // 店舗用はデフォルトで120ヶ月の建設協力金、住居は0
            cooperationReturnYears: isComm ? 20 : 0,
            usage
        };
        updateRentRoll({ roomTypes: [...data.rentRoll.roomTypes, newRoom] });
    };

    const removeRoomType = (id: string) => {
        updateRentRoll({ roomTypes: data.rentRoll.roomTypes.filter(r => r.id !== id) });
    };

    const updateRoomType = (id: string, updates: Partial<RoomType>) => {
        updateRentRoll({
            roomTypes: data.rentRoll.roomTypes.map(r => r.id === id ? { ...r, ...updates } : r)
        });
    };

    // Calculations
    const totalMonthlyRent = data.rentRoll.roomTypes.reduce((acc, r) => acc + (r.rent + r.commonFee) * r.count, 0);
    const totalMonthlyParking = data.rentRoll.parkingCount * data.rentRoll.parkingFee;
    const grossMonthlyIncome = totalMonthlyRent + totalMonthlyParking;

    // 建設協力金総額の計算 (借地リース用)
    const totalCooperationMoney = data.rentRoll.roomTypes.reduce((acc, r) => {
        const months = r.cooperationMonths ?? 0;
        return acc + (r.rent * r.count * months);
    }, 0);

    // Req says "Others Revenue Condition". Let's assume it's included roughly.
    const annualPotentialGrossIncome = (grossMonthlyIncome + data.rentRoll.otherRevenue + (data.rentRoll.solarPowerIncome || 0)) * 12;

    // 用途ごとのフィルタリング
    const residentialRooms = data.rentRoll.roomTypes.filter(r => (r.usage || 'residential') === 'residential');
    const commercialRooms = data.rentRoll.roomTypes.filter(r => r.usage === 'commercial');

    // テーブル描画用ヘルパーコンポーネント (用途別に共通のレイアウトを綺麗に描画)
    const renderRoomTable = (rooms: RoomType[], titleLabel: string) => {
        if (rooms.length === 0) {
            return (
                <div className="text-xs text-slate-400 py-6 text-center border border-dashed rounded-xl bg-slate-50/30">
                    {titleLabel}の部屋タイプは登録されていません。
                </div>
            );
        }

        // 用途に応じた自動予測（オートコンプリート）用の選択リストID


        return (
            <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-sm bg-white">
                {/* 借地リース時は列数が多いため最小幅を1150pxに広げ、入力欄が絶対に潰れないようにバランスを調整 */}
                <table className="w-full text-sm text-left border-collapse" style={{ minWidth: data.mode === 'land_lease' ? '1150px' : '850px' }}>
                    <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs border-b border-slate-100">
                        <tr>
                            <th className="px-4 py-3.5 w-28 rounded-l-lg">用途</th>
                            <th className="px-4 py-3.5 w-48">間取り・名称</th>
                            <th className="px-4 py-3.5 w-20 text-center">戸数</th>
                            <th className="px-4 py-3.5 w-24 text-center">面積(㎡)</th>
                            <th className="px-4 py-3.5 w-28 text-center">賃料(円)</th>
                            <th className="px-4 py-3.5 w-24 text-center">共益費(円)</th>
                            {data.mode === 'land_lease' && (
                                <>
                                    <th className="px-4 py-3.5 w-24 text-right">協力金(ヶ月)</th>
                                    <th className="px-4 py-3.5 w-24 text-right">返還期間(年)</th>
                                    <th className="px-4 py-3.5 w-32 text-right">協力金総額(円)</th>
                                </>
                            )}
                            <th className="px-4 py-3.5 w-28 text-right">小計(円)</th>
                            <th className="px-4 py-3.5 rounded-r-lg w-10 text-center"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rooms.map((room) => (
                            <tr key={room.id} className="group hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-2.5">
                                    <select
                                        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all"
                                        value={room.usage || 'residential'}
                                        onChange={(e) => updateRoomType(room.id, { usage: e.target.value as any })}
                                    >
                                        <option value="residential">🏠 住居</option>
                                        <option value="commercial">🏬 店舗</option>
                                    </select>
                                </td>
                                <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-1.5 w-full">
                                        <input
                                            className="flex-1 bg-transparent border-b border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1 py-0.5 text-slate-700 placeholder-slate-300 transition-colors text-sm font-medium"
                                            placeholder={room.usage === 'commercial' ? "例: 店舗A" : "例: 1K"}
                                            value={room.name}
                                            onChange={(e) => updateRoomType(room.id, { name: e.target.value })}
                                        />
                                        {/* クイック選択プルダウン (選ぶと自動的に左の入力欄にコピーされます) */}
                                        <select
                                            className="rounded border border-slate-200 bg-slate-50 text-[10px] text-slate-500 px-1 py-1 focus:border-indigo-500 focus:outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                                            value=""
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    updateRoomType(room.id, { name: e.target.value });
                                                }
                                            }}
                                        >
                                            <option value="" disabled>選択</option>
                                            {room.usage === 'commercial' ? (
                                                <>
                                                    <option value="テナント店舗">店舗</option>
                                                    <option value="事務所・オフィス">オフィス</option>
                                                    <option value="コンビニ">コンビニ</option>
                                                    <option value="クリニック">医療</option>
                                                    <option value="飲食店">飲食</option>
                                                    <option value="ショールーム">展示</option>
                                                </>
                                            ) : (
                                                <>
                                                    <option value="1K">1K</option>
                                                    <option value="1DK">1DK</option>
                                                    <option value="1LDK">1LDK</option>
                                                    <option value="2DK">2DK</option>
                                                    <option value="2LDK">2LDK</option>
                                                    <option value="3LDK">3LDK</option>
                                                    <option value="ファミリー">家族</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                    <input
                                        type="number"
                                        className="w-16 bg-white border border-slate-200 rounded-md px-2 py-1 text-right focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 text-slate-700 transition-all text-xs"
                                        value={room.count}
                                        onChange={(e) => updateRoomType(room.id, { count: parseFloat(e.target.value) || 0 })}
                                    />
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                    <input
                                        type="number"
                                        className="w-16 bg-white border border-slate-200 rounded-md px-2 py-1 text-right focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 text-slate-700 transition-all text-xs"
                                        value={room.areaM2}
                                        onChange={(e) => updateRoomType(room.id, { areaM2: parseFloat(e.target.value) || 0 })}
                                    />
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                    <input
                                        type="number"
                                        className="w-24 bg-white border border-slate-200 rounded-md px-2 py-1 text-right focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 text-slate-700 font-mono transition-all text-xs font-semibold"
                                        value={room.rent === 0 ? '' : room.rent}
                                        onChange={(e) => updateRoomType(room.id, { rent: parseFloat(e.target.value) || 0 })}
                                    />
                                    <div className="text-[9px] text-slate-400 font-mono text-right mt-0.5 tracking-tight">
                                        {room.rent > 0 ? `¥${room.rent.toLocaleString()}` : '—'}
                                    </div>
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                    <input
                                        type="number"
                                        className="w-20 bg-white border border-slate-200 rounded-md px-2 py-1 text-right focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 text-slate-700 font-mono transition-all text-xs font-semibold"
                                        value={room.commonFee === 0 ? '' : room.commonFee}
                                        onChange={(e) => updateRoomType(room.id, { commonFee: parseFloat(e.target.value) || 0 })}
                                    />
                                    <div className="text-[9px] text-slate-400 font-mono text-right mt-0.5 tracking-tight">
                                        {room.commonFee > 0 ? `¥${room.commonFee.toLocaleString()}` : '—'}
                                    </div>
                                </td>
                                {data.mode === 'land_lease' && (
                                    <>
                                        <td className="px-4 py-2.5 text-center">
                                            <input
                                                type="number"
                                                className="w-16 bg-white border border-slate-200 rounded-md px-2 py-1 text-right focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 text-slate-700 transition-all"
                                                value={room.cooperationMonths ?? 0}
                                                onChange={(e) => updateRoomType(room.id, { cooperationMonths: parseFloat(e.target.value) || 0 })}
                                            />
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            <input
                                                type="number"
                                                className="w-16 bg-white border border-slate-200 rounded-md px-2 py-1 text-right focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 text-slate-700 transition-all"
                                                value={room.cooperationReturnYears ?? 0}
                                                onChange={(e) => updateRoomType(room.id, { cooperationReturnYears: parseFloat(e.target.value) || 0 })}
                                            />
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-slate-600 font-mono font-medium text-xs">
                                            {((room.rent * room.count * (room.cooperationMonths ?? 0))).toLocaleString()}
                                        </td>
                                    </>
                                )}
                                <td className="px-4 py-2.5 font-bold text-right text-slate-700 font-mono text-xs">
                                    {((room.rent + room.commonFee) * room.count).toLocaleString()}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                    <button onClick={() => removeRoomType(room.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in pb-20">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">収支条件設定 (Rent Roll & Expenses)</h2>
            </div>

            <div className="grid gap-6">
                <Card title="賃賃条件 (Rent Roll)">
                    <div className="space-y-6">
                        {/* 住居系アパートメントセクション */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl">
                                <span>🏠</span> 住居系アパートメント
                            </h4>
                            {renderRoomTable(residentialRooms, '住居系')}
                        </div>

                        {/* 店舗・テナント用セクション */}
                        <div className="space-y-3 pt-4 border-t border-slate-100">
                            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl">
                                <span>🏬</span> 店舗・テナント用
                            </h4>
                            {renderRoomTable(commercialRooms, '店舗・テナント用')}
                        </div>
                    </div>

                    {/* 用途別の新規追加ボタンを横並びで配置し、マテリアル感溢れるデザインに */}
                    <div className="flex flex-col sm:flex-row gap-4 mt-6 pt-4 border-t border-slate-100">
                        <Button variant="secondary" onClick={() => addRoomTypeWithUsage('residential')} className="flex-1 flex items-center justify-center gap-2 border-dashed border-2 border-slate-300 bg-transparent hover:bg-slate-50 hover:border-slate-400 py-2.5">
                            <Plus className="h-4 w-4" /> 🏠 住居タイプを追加
                        </Button>
                        <Button variant="secondary" onClick={() => addRoomTypeWithUsage('commercial')} className="flex-1 flex items-center justify-center gap-2 border-dashed border-2 border-slate-300 bg-transparent hover:bg-slate-50 hover:border-slate-400 py-2.5">
                            <Plus className="h-4 w-4" /> 🏬 店舗タイプを追加
                        </Button>
                    </div>

                    <div className="grid md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-slate-100">
                        <InputGroup
                            label="駐車場台数"
                            type="number"
                            unit="台"
                            value={data.rentRoll.parkingCount || ''}
                            onChange={(e) => updateRentRoll({ parkingCount: parseFloat(e.target.value) })}
                        />
                        <InputGroup
                            label="駐車場料金"
                            type="number"
                            unit="円"
                            value={data.rentRoll.parkingFee || ''}
                            onChange={(e) => updateRentRoll({ parkingFee: parseFloat(e.target.value) })}
                        />
                        <InputGroup
                            label="その他収入(月額)"
                            type="number"
                            unit="円"
                            value={data.rentRoll.otherRevenue || ''}
                            onChange={(e) => updateRentRoll({ otherRevenue: parseFloat(e.target.value) })}
                        />
                        <InputGroup
                            label="太陽光売電収入(月額)"
                            type="number"
                            unit="円"
                            value={data.rentRoll.solarPowerIncome || ''}
                            onChange={(e) => updateRentRoll({ solarPowerIncome: parseFloat(e.target.value) })}
                        />
                        <InputGroup
                            label="想定空室率"
                            type="number"
                            unit="%"
                            value={data.rentRoll.occupancyRate || ''}
                            onChange={(e) => updateRentRoll({ occupancyRate: parseFloat(e.target.value) })}
                        />
                    </div>
                </Card>

                <Card title="一時金・更新料 (Revenue Settings)">
                    <div className="grid md:grid-cols-4 gap-6">
                        <InputGroup
                            label="敷金"
                            type="number"
                            unit="ヶ月"
                            value={data.rentRoll.securityDepositMonth || ''}
                            onChange={(e) => updateRentRoll({ securityDepositMonth: parseFloat(e.target.value) })}
                        />
                        <InputGroup
                            label="礼金"
                            type="number"
                            unit="ヶ月"
                            value={data.rentRoll.keyMoneyMonth || ''}
                            onChange={(e) => updateRentRoll({ keyMoneyMonth: parseFloat(e.target.value) })}
                        />
                        <InputGroup
                            label="更新料 (2年毎)"
                            type="number"
                            unit="ヶ月"
                            value={data.rentRoll.renewalFeeMonth || ''}
                            onChange={(e) => updateRentRoll({ renewalFeeMonth: parseFloat(e.target.value) })}
                        />
                    </div>
                </Card>

                <Card title="運営経費 (Expenses)">
                    <div className="grid md:grid-cols-3 gap-6 mb-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-600">管理費方式</label>
                            <select
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                value={data.expenses.managementFeeMode}
                                onChange={(e) => updateExpenses({ managementFeeMode: e.target.value as any })}
                            >
                                <option value="ratio">賃料比率 (%)</option>
                                <option value="fixed">定額 (円)</option>
                            </select>
                        </div>

                        {data.expenses.managementFeeMode === 'ratio' ? (
                            <InputGroup
                                label="管理料率"
                                type="number"
                                unit="%"
                                value={data.expenses.managementFeeRatio || ''}
                                onChange={(e) => updateExpenses({ managementFeeRatio: parseFloat(e.target.value) })}
                            />
                        ) : (
                            <InputGroup
                                label="管理料 (月額)"
                                type="number"
                                unit="円"
                                value={data.expenses.managementFeeFixed || ''}
                                onChange={(e) => updateExpenses({ managementFeeFixed: parseFloat(e.target.value) })}
                            />
                        )}
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        <InputGroup
                            label="建物管理費(BM・清掃)"
                            type="number"
                            unit="円/月"
                            value={data.expenses.buildingMaintenance || ''}
                            onChange={(e) => updateExpenses({ buildingMaintenance: parseFloat(e.target.value) })}
                        />
                        <InputGroup
                            label="修繕積立金"
                            type="number"
                            unit="円/月"
                            value={data.expenses.maintenanceReserve || ''}
                            onChange={(e) => updateExpenses({ maintenanceReserve: parseFloat(e.target.value) })}
                        />
                        <InputGroup
                            label="その他経費(年額)"
                            type="number"
                            unit="円/年"
                            value={data.expenses.otherExpenses || ''}
                            onChange={(e) => updateExpenses({ otherExpenses: parseFloat(e.target.value) })}
                        />
                    </div>

                    <div className="grid md:grid-cols-4 gap-6 mt-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <InputGroup
                            label="固都税(土地・年額)"
                            type="number"
                            unit="円"
                            value={data.expenses.fixedAssetTaxLand || ''}
                            onChange={(e) => updateExpenses({ fixedAssetTaxLand: parseFloat(e.target.value) })}
                        />
                        <InputGroup
                            label="固都税(建物・年額)"
                            type="number"
                            unit="円"
                            value={data.expenses.fixedAssetTaxBuilding || ''}
                            onChange={(e) => updateExpenses({ fixedAssetTaxBuilding: parseFloat(e.target.value) })}
                        />
                        {/* 固都税の合計等は画面上で確認できれば親切 */}
                    </div>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                    <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-lg">
                        <span className="text-indigo-100 text-sm uppercase tracking-wider font-bold">年間満室想定収入 (Gross Potential Income)</span>
                        <div className="text-3xl font-bold mt-1">{(annualPotentialGrossIncome / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })} 万円</div>
                        <p className="text-sm text-indigo-200 mt-2">
                            月額: {(grossMonthlyIncome + data.rentRoll.otherRevenue + (data.rentRoll.solarPowerIncome || 0)).toLocaleString()} 円 × 12ヶ月
                        </p>
                    </div>

                    {data.mode === 'land_lease' ? (
                        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 rounded-2xl shadow-xl space-y-4">
                            <div>
                                <span className="text-emerald-100 text-xs uppercase tracking-wider font-bold">建設協力金 調達総額</span>
                                <div className="text-4xl font-extrabold mt-1 font-mono">{formatManYen(totalCooperationMoney / 10000)} 万円</div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-emerald-100">
                                    <span>建物本体工事費（{formatManYen(data.budget.buildingWorksCost)}万円）に対する補填率</span>
                                    <span className="font-bold">{(data.budget.buildingWorksCost > 0 ? (totalCooperationMoney / (data.budget.buildingWorksCost * 10000) * 100) : 0).toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-emerald-800/60 rounded-full h-2 overflow-hidden">
                                    <div 
                                        className="bg-emerald-300 h-full rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${Math.min(100, data.budget.buildingWorksCost > 0 ? (totalCooperationMoney / (data.budget.buildingWorksCost * 10000) * 100) : 0)}%` }}
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-emerald-100 leading-relaxed bg-emerald-800/20 p-2.5 rounded-lg">
                                💡 テナントから預かる建設協力金で、本体工事費の約 <span className="font-bold text-white">{(data.budget.buildingWorksCost > 0 ? (totalCooperationMoney / (data.budget.buildingWorksCost * 10000) * 100) : 0).toFixed(0)}%</span> を金利・返済負担なしで調達できています。
                            </p>
                        </div>
                    ) : (
                        <div className="bg-gradient-to-br from-amber-600 to-orange-700 text-white p-6 rounded-2xl shadow-xl space-y-4">
                            <div>
                                <span className="text-amber-100 text-xs uppercase tracking-wider font-bold">想定表面利回り (Gross Yield)</span>
                                <div className="text-4xl font-extrabold mt-1 font-mono">
                                    {((data.budget.landPrice || 0) + (data.budget.buildingWorksCost || 0) > 0)
                                        ? (annualPotentialGrossIncome / (((data.budget.landPrice || 0) + (data.budget.buildingWorksCost || 0) + (data.budget.demolitionCost || 0) + (data.budget.otherInitialCost || 0)) * 10000) * 100).toFixed(2)
                                        : '0.00'}%
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-amber-100">
                                    <span>総初期コストに対する満室時年間家賃の割合</span>
                                    <span>総投資額: {(((data.budget.landPrice || 0) + (data.budget.buildingWorksCost || 0) + (data.budget.demolitionCost || 0) + (data.budget.otherInitialCost || 0))).toLocaleString()} 万円</span>
                                </div>
                            </div>
                            <p className="text-xs text-amber-100 leading-relaxed bg-amber-800/20 p-2.5 rounded-lg">
                                💡 表面利回りは、年間家賃収入を「総事業費（土地代・工事費・諸経費）」で割った目安の指標です。実際の手残りを表すNOI利回りは、次の結果画面で詳しく分析します。
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* エラーメッセージの表示 */}
            {Object.keys(errors).length > 0 && (
                <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 font-medium">
                    ⚠️ 入力内容に不足があります:
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                        {Object.values(errors).map((err, i) => (
                            <li key={i}>{err}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="flex justify-between pt-6 border-t border-slate-200">
                <Button variant="ghost" onClick={prevStep} className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" /> 戻る
                </Button>
                <Button onClick={handleNext} className="flex items-center gap-2">
                    シミュレーション結果へ <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};
