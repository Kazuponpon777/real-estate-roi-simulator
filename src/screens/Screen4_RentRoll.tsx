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
    const { data, updateRentRoll, updateExpenses, updateFunding, nextStep, prevStep } = useSimulationStore();

    // ローカルのエラー状態を定義
    const [errors, setErrors] = React.useState<ValidationErrors>({});

    // 敷金(預り)の自動同期 (賃料 × 戸数 × 各部屋の敷金ヶ月数 を合計し、funding.securityDepositIn に自動同期)
    React.useEffect(() => {
        const totalDeposit = data.rentRoll.roomTypes.reduce((acc, r) => {
            const depMonths = r.depositMonths !== undefined ? r.depositMonths : data.rentRoll.securityDepositMonth;
            return acc + (r.rent * r.count * depMonths);
        }, 0);
        
        const totalDepositManYen = Math.round(totalDeposit / 10000);
        if (data.funding.securityDepositIn !== totalDepositManYen) {
            updateFunding({ securityDepositIn: totalDepositManYen });
        }
    }, [data.rentRoll.roomTypes, data.rentRoll.securityDepositMonth, data.funding.securityDepositIn]);

    // 物件種別の変更に伴う固都税の自動再計算
    React.useEffect(() => {
        if (data.expenses.landAssessedValue) {
            const propType = data.property.propertyType || 'apartment';
            const isResidential = propType === 'apartment' || propType === 'store_apartment';
            const valueYen = data.expenses.landAssessedValue * 10000;
            let taxLand = 0;
            let cityTaxLand = 0;

            if (isResidential) {
                taxLand = Math.round(valueYen * 0.014 * (1 / 6));
                cityTaxLand = Math.round(valueYen * 0.003 * (1 / 3));
            } else {
                taxLand = Math.round(valueYen * 0.014);
                cityTaxLand = Math.round(valueYen * 0.003);
            }
            updateExpenses({
                fixedAssetTaxLand: taxLand + cityTaxLand
            });
        }
    }, [data.property.propertyType]);

    // 固定資産税評価額の変更ハンドラ
    const handleAssessedValueChange = (type: 'land' | 'building', value: number) => {
        const propType = data.property.propertyType || 'apartment';
        const isResidential = propType === 'apartment' || propType === 'store_apartment';

        if (type === 'land') {
            const valueYen = value * 10000;
            let taxLand = 0;
            let cityTaxLand = 0;

            if (isResidential) {
                taxLand = Math.round(valueYen * 0.014 * (1 / 6));
                cityTaxLand = Math.round(valueYen * 0.003 * (1 / 3));
            } else {
                taxLand = Math.round(valueYen * 0.014);
                cityTaxLand = Math.round(valueYen * 0.003);
            }
            updateExpenses({
                landAssessedValue: value,
                fixedAssetTaxLand: taxLand + cityTaxLand
            });
        } else {
            const valueYen = value * 10000;
            const taxBuilding = Math.round(valueYen * 0.014);
            const cityTaxBuilding = Math.round(valueYen * 0.003);
            updateExpenses({
                buildingAssessedValue: value,
                fixedAssetTaxBuilding: taxBuilding + cityTaxBuilding
            });
        }
    };

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
            <div className="overflow-x-auto rounded-xl border border-[#ebd9c5]/60 shadow-sm bg-white">
                {/* 常に建設協力金や敷金などを表示するため、最小幅を1150pxに調整 */}
                <table className="w-full text-sm text-left border-collapse" style={{ minWidth: '1150px' }}>
                    <thead className="bg-[#fcf9f2] text-[#3d251a] uppercase font-bold text-xs border-b border-[#ebd9c5]">
                        <tr>
                            <th className="px-4 py-3.5 w-24 rounded-l-lg">用途</th>
                            <th className="px-4 py-3.5 w-36">間取り・名称</th>
                            <th className="px-4 py-3.5 w-16 text-center">戸数</th>
                            <th className="px-4 py-3.5 w-20 text-center">面積(㎡)</th>
                            <th className="px-4 py-3.5 w-24 text-center">賃料(円)</th>
                            <th className="px-4 py-3.5 w-20 text-center">共益費(円)</th>
                            <th className="px-4 py-3.5 w-20 text-center">敷金(ヶ月)</th>
                            <th className="px-4 py-3.5 w-20 text-center">協力金(月)</th>
                            <th className="px-4 py-3.5 w-20 text-center">返還(年)</th>
                            <th className="px-4 py-3.5 w-24 text-right">小計(円)</th>
                            <th className="px-4 py-3.5 rounded-r-lg w-10 text-center"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ebd9c5]/40">
                        {rooms.map((room) => (
                            <tr key={room.id} className="group hover:bg-[#ebd9c5]/10 transition-colors">
                                <td className="px-4 py-2.5">
                                    <select
                                        className="w-full rounded-md border border-[#ebd9c5] bg-white px-2 py-1 text-xs font-semibold text-[#3d251a] focus:border-[#a87c28] focus:outline-none focus:ring-1 focus:ring-[#a87c28]/20 transition-all"
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
                                            className="flex-1 bg-transparent border-b border-[#ebd9c5] hover:border-[#a87c28]/60 focus:border-[#a87c28] focus:outline-none px-1 py-0.5 text-[#3d251a] placeholder-slate-300 transition-colors text-sm font-medium"
                                            placeholder={room.usage === 'commercial' ? "例: 店舗A" : "例: 1K"}
                                            value={room.name}
                                            onChange={(e) => updateRoomType(room.id, { name: e.target.value })}
                                        />
                                        {/* クイック選択プルダウン */}
                                        <select
                                            className="rounded border border-[#ebd9c5] bg-[#fcf9f2] text-[10px] text-[#8c6114] px-1 py-1 focus:border-[#a87c28] focus:outline-none cursor-pointer hover:bg-[#ebd9c5]/30 transition-colors"
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
                                        className="w-16 bg-white border border-[#ebd9c5] rounded-md px-2 py-1 text-right focus:border-[#a87c28] focus:outline-none focus:ring-1 focus:ring-[#a87c28]/20 text-[#3d251a] transition-all text-xs"
                                        value={room.count}
                                        onChange={(e) => updateRoomType(room.id, { count: parseFloat(e.target.value) || 0 })}
                                    />
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                    <input
                                        type="number"
                                        className="w-16 bg-white border border-[#ebd9c5] rounded-md px-2 py-1 text-right focus:border-[#a87c28] focus:outline-none focus:ring-1 focus:ring-[#a87c28]/20 text-[#3d251a] transition-all text-xs"
                                        value={room.areaM2}
                                        onChange={(e) => updateRoomType(room.id, { areaM2: parseFloat(e.target.value) || 0 })}
                                    />
                                    <div className="text-[9px] text-[#8c6c59] text-right mt-0.5 tracking-tight font-mono">
                                        {room.areaM2 > 0 ? `${(room.areaM2 / 3.30579).toFixed(2)}坪` : '—'}
                                    </div>
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                    <input
                                        type="number"
                                        className="w-24 bg-white border border-[#ebd9c5] rounded-md px-2 py-1 text-right focus:border-[#a87c28] focus:outline-none focus:ring-1 focus:ring-[#a87c28]/20 text-[#3d251a] font-mono transition-all text-xs font-semibold"
                                        value={room.rent === 0 ? '' : room.rent}
                                        onChange={(e) => updateRoomType(room.id, { rent: parseFloat(e.target.value) || 0 })}
                                    />
                                    <div className="text-[9px] text-[#8c6114]/70 font-mono text-right mt-0.5 tracking-tight">
                                        {room.rent > 0 ? `¥${room.rent.toLocaleString()}` : '—'}
                                        {room.rent > 0 && room.areaM2 > 0 && ` (坪¥${Math.round(room.rent / (room.areaM2 / 3.30579)).toLocaleString()})`}
                                    </div>
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                    <input
                                        type="number"
                                        className="w-20 bg-white border border-[#ebd9c5] rounded-md px-2 py-1 text-right focus:border-[#a87c28] focus:outline-none focus:ring-1 focus:ring-[#a87c28]/20 text-[#3d251a] font-mono transition-all text-xs font-semibold"
                                        value={room.commonFee === 0 ? '' : room.commonFee}
                                        onChange={(e) => updateRoomType(room.id, { commonFee: parseFloat(e.target.value) || 0 })}
                                    />
                                    <div className="text-[9px] text-[#8c6114]/70 font-mono text-right mt-0.5 tracking-tight">
                                        {room.commonFee > 0 ? `¥${room.commonFee.toLocaleString()}` : '—'}
                                    </div>
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                    <input
                                        type="number"
                                        className="w-16 bg-white border border-[#ebd9c5] rounded-md px-2 py-1 text-right focus:border-[#a87c28] focus:outline-none focus:ring-1 focus:ring-[#a87c28]/20 text-[#3d251a] transition-all text-xs"
                                        value={room.depositMonths !== undefined ? room.depositMonths : (data.rentRoll.securityDepositMonth ?? 1)}
                                        onChange={(e) => updateRoomType(room.id, { depositMonths: parseFloat(e.target.value) || 0 })}
                                    />
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                    <input
                                        type="number"
                                        className="w-16 bg-white border border-[#ebd9c5] rounded-md px-2 py-1 text-right focus:border-[#a87c28] focus:outline-none focus:ring-1 focus:ring-[#a87c28]/20 text-[#3d251a] transition-all text-xs"
                                        value={room.cooperationMonths ?? 0}
                                        onChange={(e) => updateRoomType(room.id, { cooperationMonths: parseFloat(e.target.value) || 0 })}
                                    />
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                    <input
                                        type="number"
                                        className="w-16 bg-white border border-[#ebd9c5] rounded-md px-2 py-1 text-right focus:border-[#a87c28] focus:outline-none focus:ring-1 focus:ring-[#a87c28]/20 text-[#3d251a] transition-all text-xs"
                                        value={room.cooperationReturnYears ?? 0}
                                        onChange={(e) => updateRoomType(room.id, { cooperationReturnYears: parseFloat(e.target.value) || 0 })}
                                    />
                                </td>
                                <td className="px-4 py-2.5 font-bold text-right text-[#3d251a] font-mono text-xs">
                                    {((room.rent + room.commonFee) * room.count).toLocaleString()}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                    <button onClick={() => removeRoomType(room.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-rose-50">
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
                <h2 className="text-2xl font-bold text-[#23150d]">収支条件設定 (Rent Roll & Expenses)</h2>
            </div>

            <div className="grid gap-6">
                <Card title="賃貸条件 (Rent Roll)">
                    <div className="space-y-6">
                        {/* 住居系アパートメントセクション */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-[#23150d] flex items-center gap-1.5 bg-[#fcf9f2] border border-[#ebd9c5] px-3 py-2 rounded-xl">
                                <span>🏠</span> 住居系アパートメント
                            </h4>
                            {renderRoomTable(residentialRooms, '住居系')}
                        </div>

                        {/* 店舗・テナント用セクション */}
                        <div className="space-y-3 pt-4 border-t border-[#ebd9c5]/50">
                            <h4 className="text-sm font-bold text-[#23150d] flex items-center gap-1.5 bg-[#fcf9f2] border border-[#ebd9c5] px-3 py-2 rounded-xl">
                                <span>🏬</span> 店舗・テナント用
                            </h4>
                            {renderRoomTable(commercialRooms, '店舗・テナント用')}
                        </div>
                    </div>

                    {/* 用途別の新規追加ボタン */}
                    <div className="flex flex-col sm:flex-row gap-4 mt-6 pt-4 border-t border-[#ebd9c5]/50">
                        <Button variant="secondary" onClick={() => addRoomTypeWithUsage('residential')} className="flex-1 flex items-center justify-center gap-2 border-dashed border-2 border-[#d4af37]/45 bg-transparent hover:bg-[#ebd9c5]/25 text-[#a87c28] hover:border-[#a87c28] py-2.5">
                            <Plus className="h-4 w-4" /> 🏠 住居タイプを追加
                        </Button>
                        <Button variant="secondary" onClick={() => addRoomTypeWithUsage('commercial')} className="flex-1 flex items-center justify-center gap-2 border-dashed border-2 border-[#d4af37]/45 bg-transparent hover:bg-[#ebd9c5]/25 text-[#a87c28] hover:border-[#a87c28] py-2.5">
                            <Plus className="h-4 w-4" /> 🏬 店舗タイプを追加
                        </Button>
                    </div>

                    <div className="grid md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-[#ebd9c5]/50">
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
                            <label className="text-sm font-semibold text-[#3d251a]">管理費方式</label>
                            <select
                                className="w-full rounded-lg border border-[#ebd9c5] bg-white px-3 py-2.5 text-[#3d251a] focus:border-[#a87c28] focus:outline-none focus:ring-2 focus:ring-[#a87c28]/20 transition-all font-semibold text-sm"
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

                    <div className="mt-6 bg-[#fcf9f2] p-5 rounded-xl border border-[#ebd9c5] shadow-sm space-y-4">
                        <h4 className="text-sm font-bold text-[#23150d] border-b border-[#ebd9c5] pb-1.5 flex justify-between items-center">
                            <span>🏢 固定資産税・都市計画税の自動計算 (評価額入力)</span>
                            <span className="text-xs text-[#8c6114] font-medium bg-[#fcf5e3] px-2 py-0.5 rounded border border-[#ebd9c5]">
                                物件種別: {data.property.propertyType === 'apartment' ? 'アパート・賃貸マンション' : 
                                         data.property.propertyType === 'store_apartment' ? '店舗マンション' :
                                         data.property.propertyType === 'office_building' ? '商業ビル・店舗' : 'その他'}
                                         {(data.property.propertyType === 'apartment' || data.property.propertyType === 'store_apartment') && '（小規模宅地軽減 適用中）'}
                            </span>
                        </h4>

                        <div className="grid md:grid-cols-4 gap-6">
                            <InputGroup
                                label="土地固定資産税評価額"
                                type="number"
                                unit="万円"
                                help="土地の固定資産税評価額。アパート・賃貸マンション、店舗マンションの場合は小規模宅地軽減（固定資産税1/6、都市計画税1/3）が自動適用されます。"
                                value={data.expenses.landAssessedValue || ''}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    handleAssessedValueChange('land', val);
                                }}
                            />
                            <InputGroup
                                label="建物固定資産税評価額"
                                type="number"
                                unit="万円"
                                help="建物の固定資産税評価額。固定資産税1.4%、都市計画税0.3%で自動計算されます。"
                                value={data.expenses.buildingAssessedValue || ''}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    handleAssessedValueChange('building', val);
                                }}
                            />
                            <InputGroup
                                label="固都税(土地・年額)"
                                type="number"
                                unit="円"
                                help="土地の固定資産税と都市計画税の合算年額。評価額から自動計算されますが、手動調整も可能です。"
                                value={data.expenses.fixedAssetTaxLand === 0 ? '' : data.expenses.fixedAssetTaxLand}
                                onChange={(e) => updateExpenses({ fixedAssetTaxLand: parseFloat(e.target.value) || 0 })}
                            />
                            <InputGroup
                                label="固都税(建物・年額)"
                                type="number"
                                unit="円"
                                help="建物の固定資産税と都市計画税の合算年額。評価額から自動計算されますが、手動調整も可能です。"
                                value={data.expenses.fixedAssetTaxBuilding === 0 ? '' : data.expenses.fixedAssetTaxBuilding}
                                onChange={(e) => updateExpenses({ fixedAssetTaxBuilding: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                    </div>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                    <div className="bg-gradient-to-r from-[#aa7c11] to-[#8a5d3b] text-[#fdfaf5] p-6 rounded-2xl shadow-lg border border-[#ebd9c5]/20">
                        <span className="text-[#fdfaf5]/90 text-sm uppercase tracking-wider font-semibold">年間満室想定収入 (Gross Potential Income)</span>
                        <div className="text-3xl font-bold font-serif mt-1">{(annualPotentialGrossIncome / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })} 万円</div>
                        <p className="text-xs text-[#fdfaf5]/80 mt-2 font-medium">
                            月額: {(grossMonthlyIncome + data.rentRoll.otherRevenue + (data.rentRoll.solarPowerIncome || 0)).toLocaleString()} 円 × 12ヶ月
                        </p>
                    </div>

                    {data.mode === 'land_lease' ? (
                        <div className="bg-gradient-to-br from-[#1e3d2f] to-[#12261d] text-[#fdfaf5] p-6 rounded-2xl shadow-xl border border-[#ebd9c5]/20 space-y-4">
                            <div>
                                <span className="text-[#ebd9c5] text-xs uppercase tracking-wider font-semibold">建設協力金 調達総額</span>
                                <div className="text-4xl font-extrabold mt-1 font-mono">{formatManYen(totalCooperationMoney / 10000)} 万円</div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-[#ebd9c5]/90">
                                    <span>建物本体工事費（{formatManYen(data.budget.buildingWorksCost)}万円）に対する補填率</span>
                                    <span className="font-bold">{(data.budget.buildingWorksCost > 0 ? (totalCooperationMoney / (data.budget.buildingWorksCost * 10000) * 100) : 0).toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-[#12261d]/60 rounded-full h-2 overflow-hidden border border-[#ebd9c5]/10">
                                    <div 
                                        className="bg-[#ebd9c5] h-full rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${Math.min(100, data.budget.buildingWorksCost > 0 ? (totalCooperationMoney / (data.budget.buildingWorksCost * 10000) * 100) : 0)}%` }}
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-[#ebd9c5]/90 leading-relaxed bg-[#ebd9c5]/10 p-2.5 rounded-lg">
                                💡 テナントから預かる建設協力金で、本体工事費の約 <span className="font-bold text-white">{(data.budget.buildingWorksCost > 0 ? (totalCooperationMoney / (data.budget.buildingWorksCost * 10000) * 100) : 0).toFixed(0)}%</span> を金利・返済負担なしで調達できています。
                            </p>
                        </div>
                    ) : (
                        <div className="bg-gradient-to-br from-[#8c6114] to-[#5c3e0a] text-[#fdfaf5] p-6 rounded-2xl shadow-xl border border-[#ebd9c5]/35 space-y-4">
                            <div>
                                <span className="text-[#ebd9c5] text-xs uppercase tracking-wider font-semibold">想定表面利回り (Gross Yield)</span>
                                <div className="text-4xl font-extrabold mt-1 font-mono">
                                    {((data.budget.landPrice || 0) + (data.budget.buildingWorksCost || 0) > 0)
                                        ? (annualPotentialGrossIncome / (((data.budget.landPrice || 0) + (data.budget.buildingWorksCost || 0) + (data.budget.demolitionCost || 0) + (data.budget.otherInitialCost || 0)) * 10000) * 100).toFixed(2)
                                        : '0.00'}%
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs text-[#ebd9c5]/90">
                                    <span>総初期コストに対する満室時年間家賃の割合</span>
                                    <span className="font-semibold">総投資額: {(((data.budget.landPrice || 0) + (data.budget.buildingWorksCost || 0) + (data.budget.demolitionCost || 0) + (data.budget.otherInitialCost || 0))).toLocaleString()} 万円</span>
                                </div>
                            </div>
                            <p className="text-xs text-[#ebd9c5]/90 leading-relaxed bg-[#ebd9c5]/10 p-2.5 rounded-lg">
                                💡 表面利回りは、年間家賃収入を「総事業費（土地代・工事費・諸経費）」で割った目安の指標です。実際の手残りを表すNOI利回りは、次の結果画面で詳しく分析します。
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* エラーメッセージの表示 */}
            {Object.keys(errors).length > 0 && (
                <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 font-semibold shadow-sm">
                    ⚠️ 入力内容に不足があります:
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                        {Object.values(errors).map((err, i) => (
                            <li key={i}>{err}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="flex justify-between pt-6 border-t border-[#ebd9c5]">
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
