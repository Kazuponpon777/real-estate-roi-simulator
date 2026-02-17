import React, { useState } from 'react';
import { useSimulationStore } from '../stores/useSimulationStore';
import { Card } from '../components/ui/Card';
import { InputGroup } from '../components/ui/InputGroup';
import { Button } from '../components/ui/Button';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { TSUBO_TO_M2 } from '../utils/calculations';
import { validateProperty, type ValidationErrors } from '../utils/validation';
import { MapDisplay } from '../components/ui/MapDisplay';
import { DocumentManager } from '../components/ui/DocumentManager';
import type { PropertyDocument } from '../stores/useSimulationStore';

export const Screen1_Property: React.FC = () => {
    const { data, updateProperty, nextStep, prevStep } = useSimulationStore();
    const [activeTab, setActiveTab] = useState<'land' | 'building'>('land');
    const [errors, setErrors] = useState<ValidationErrors>({});

    const handleNext = () => {
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
                <h2 className="text-2xl font-bold text-slate-800">物件概要 (Property Details)</h2>
                <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('land')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'land' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        敷地概要
                    </button>
                    <button
                        onClick={() => setActiveTab('building')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'building' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        建物概要
                    </button>
                </div>
            </div>

            <div className="grid gap-6">
                {activeTab === 'land' ? (
                    <Card className="space-y-6">
                        <h3 className="text-lg font-bold text-slate-700 border-b pb-2 mb-4">敷地情報</h3>

                        <div className="grid md:grid-cols-2 gap-6">
                            <InputGroup
                                label="所在地"
                                placeholder="例: 名古屋市中村区名駅..."
                                value={data.property.address}
                                onChange={(e) => updateProperty({ address: e.target.value })}
                                className="md:col-span-2"
                            />

                            <div className="md:col-span-2">
                                <label className="text-sm font-semibold text-slate-600 block mb-2">地図確認</label>
                                <MapDisplay address={data.property.address} />
                            </div>


                            <div className="md:col-span-2 grid md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="space-y-4">
                                    <label className="text-sm font-semibold text-slate-600">敷地面積の入力基準</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                checked={data.property.landAreaMode === 'public'}
                                                onChange={() => updateProperty({ landAreaMode: 'public' })}
                                                className="text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-slate-700">公簿面積</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                checked={data.property.landAreaMode === 'actual'}
                                                onChange={() => updateProperty({ landAreaMode: 'actual' })}
                                                className="text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-slate-700">実測面積</span>
                                        </label>
                                    </div>

                                    <InputGroup
                                        label="敷地面積 (㎡)"
                                        type="number"
                                        unit="㎡"
                                        help="登記簿または実測による敷地の面積。建蔽率・容積率の計算基礎になります"
                                        value={data.property.landAreaM2 || ''}
                                        onChange={(e) => updateLandM2(parseFloat(e.target.value))}
                                    />
                                    <div className="text-right text-sm text-slate-500">
                                        ≒ {(data.property.landAreaM2 / TSUBO_TO_M2).toFixed(2)} 坪
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputGroup
                                            label="間口"
                                            type="number"
                                            unit="m"
                                            value={data.property.frontage || ''}
                                            onChange={(e) => updateProperty({ frontage: parseFloat(e.target.value) })}
                                        />
                                        <InputGroup
                                            label="奥行"
                                            type="number"
                                            unit="m"
                                            value={data.property.depth || ''}
                                            onChange={(e) => updateProperty({ depth: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <h4 className="text-sm font-bold text-slate-700 mb-4">道路付け</h4>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-600">種類</label>
                                        <select
                                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                                        onChange={(e) => updateProperty({ roadWidth1: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-600">都市計画区域</label>
                                    <select
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                                    onChange={(e) => updateProperty({ coverageRate: parseFloat(e.target.value) })}
                                />
                                <InputGroup
                                    label="容積率"
                                    type="number"
                                    unit="%"
                                    help="敷地面積に対する延床面積の上限割合。建物ボリュームの上限を決めます"
                                    value={data.property.floorAreaRate || ''}
                                    onChange={(e) => updateProperty({ floorAreaRate: parseFloat(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-6 mt-6">
                            <DocumentManager
                                documents={data.property.documents || []}
                                onAdd={handleAddDocument}
                                onDelete={handleDeleteDocument}
                            />
                        </div>
                    </Card>
                ) : (
                    <Card className="space-y-6">
                        <h3 className="text-lg font-bold text-slate-700 border-b pb-2 mb-4">建物情報</h3>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-600">構造</label>
                                <select
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                                onChange={(e) => updateProperty({ totalUnits: parseFloat(e.target.value) })}
                            />

                            <InputGroup
                                label="建築面積"
                                type="number"
                                unit="㎡"
                                value={data.property.buildingAreaM2 || ''}
                                onChange={(e) => updateProperty({ buildingAreaM2: parseFloat(e.target.value) })}
                            />

                            <InputGroup
                                label="延床面積"
                                type="number"
                                unit="㎡"
                                value={data.property.totalFloorAreaM2 || ''}
                                onChange={(e) => updateProperty({ totalFloorAreaM2: parseFloat(e.target.value) })}
                            />
                        </div>
                    </Card>
                )}
            </div>

            <div className="flex justify-between pt-6 border-t border-slate-200">
                <Button variant="ghost" onClick={prevStep} className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" /> 戻る
                </Button>
                {Object.keys(errors).length > 0 && (
                    <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
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
