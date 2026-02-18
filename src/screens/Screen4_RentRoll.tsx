import React from 'react';
import { useSimulationStore } from '../stores/useSimulationStore';
import type { RoomType } from '../stores/useSimulationStore';
import { Card } from '../components/ui/Card';
import { InputGroup } from '../components/ui/InputGroup';
import { Button } from '../components/ui/Button';
import { ChevronRight, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { formatManYen } from '../utils/formatters';

export const Screen4_RentRoll: React.FC = () => {
    const { data, updateRentRoll, updateExpenses, nextStep, prevStep } = useSimulationStore();

    // Helpers for Rent Roll
    const addRoomType = () => {
        const newRoom: RoomType = {
            id: Math.random().toString(36).substr(2, 9),
            name: `タイプ${String.fromCharCode(65 + data.rentRoll.roomTypes.length)}`, // Type A, B, C...
            count: 1,
            areaM2: 25,
            rent: 65000,
            commonFee: 5000
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

    // Req says "Others Revenue Condition". Let's assume it's included roughly.
    const annualPotentialGrossIncome = (grossMonthlyIncome + data.rentRoll.otherRevenue + (data.rentRoll.solarPowerIncome || 0)) * 12;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in pb-20">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">収支条件設定 (Rent Roll & Expenses)</h2>
            </div>

            <div className="grid gap-6">
                <Card title="賃貸条件 (Rent Roll)">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">タイプ名</th>
                                    <th className="px-4 py-3">戸数</th>
                                    <th className="px-4 py-3">面積(㎡)</th>
                                    <th className="px-4 py-3">賃料(円)</th>
                                    <th className="px-4 py-3">共益費(円)</th>
                                    <th className="px-4 py-3">小計(円)</th>
                                    <th className="px-4 py-3 rounded-r-lg w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.rentRoll.roomTypes.map((room) => (
                                    <tr key={room.id} className="group hover:bg-slate-50">
                                        <td className="px-4 py-2">
                                            <input
                                                className="w-full bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none"
                                                value={room.name}
                                                onChange={(e) => updateRoomType(room.id, { name: e.target.value })}
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                className="w-20 bg-transparent border rounded px-2 py-1 text-right focus:border-blue-500 focus:outline-none"
                                                value={room.count}
                                                onChange={(e) => updateRoomType(room.id, { count: parseFloat(e.target.value) })}
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                className="w-20 bg-transparent border rounded px-2 py-1 text-right focus:border-blue-500 focus:outline-none"
                                                value={room.areaM2}
                                                onChange={(e) => updateRoomType(room.id, { areaM2: parseFloat(e.target.value) })}
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                className="w-28 bg-transparent border rounded px-2 py-1 text-right focus:border-blue-500 focus:outline-none"
                                                value={room.rent}
                                                onChange={(e) => updateRoomType(room.id, { rent: parseFloat(e.target.value) })}
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                className="w-24 bg-transparent border rounded px-2 py-1 text-right focus:border-blue-500 focus:outline-none"
                                                value={room.commonFee}
                                                onChange={(e) => updateRoomType(room.id, { commonFee: parseFloat(e.target.value) })}
                                            />
                                        </td>
                                        <td className="px-4 py-2 font-medium text-right text-slate-700">
                                            {((room.rent + room.commonFee) * room.count).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <button onClick={() => removeRoomType(room.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <Button variant="secondary" onClick={addRoomType} className="mt-4 w-full flex items-center justify-center gap-2 border-dashed border-2 border-slate-300 bg-transparent hover:bg-slate-50 hover:border-slate-400">
                        <Plus className="h-4 w-4" /> 部屋タイプを追加
                    </Button>

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

                <div className="bg-indigo-600 text-white p-6 rounded-xl shadow-lg">
                    <span className="text-indigo-100 text-sm uppercase tracking-wider font-bold">年間満室想定収入 (Gross Potential Income)</span>
                    <div className="text-3xl font-bold mt-1">{formatManYen(annualPotentialGrossIncome / 10000)} 万円</div>
                    <p className="text-sm text-indigo-200 mt-2">
                        月額: {(grossMonthlyIncome + data.rentRoll.otherRevenue + (data.rentRoll.solarPowerIncome || 0)).toLocaleString()} 円 × 12ヶ月
                    </p>
                </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-slate-200">
                <Button variant="ghost" onClick={prevStep} className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" /> 戻る
                </Button>
                <Button onClick={nextStep} className="flex items-center gap-2">
                    シミュレーション結果へ <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};
