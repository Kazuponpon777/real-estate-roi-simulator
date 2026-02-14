import React from 'react';
import { useSimulationStore } from '../stores/useSimulationStore';
import { Card } from '../components/ui/Card';
import { InputGroup } from '../components/ui/InputGroup';
import { Button } from '../components/ui/Button';
import { ChevronRight, ArrowLeft, RefreshCw } from 'lucide-react';
import { formatManYen } from '../utils/formatters';
import { TAX_RATES } from '../utils/calculations';

export const Screen2_Budget: React.FC = () => {
    const { data, updateBudget, nextStep, prevStep } = useSimulationStore();
    const isLandMode = data.mode === 'land_new';

    // Auto-calculate initial expenses if they are 0 (first time)
    // Simple heuristics for taxes based on Land Price / Building Cost
    // Note: True calculation needs Tax Evaluation Value (Fixed Asset Value), not Market Price.
    // We use valid approximation ratios: e.g. Tax Value ~= 70% of Market Price for Land, 50-60% for Building.

    const calculateEstimates = () => {
        const landPrice = data.budget.landPrice * 10000; // Yen
        const buildingCost = data.budget.buildingWorksCost * 10000; // Yen

        // Estimates
        const estLandTaxValue = landPrice * 0.7;
        const estBuildingTaxValue = buildingCost * 0.5; // New construction building value is usually lower than cost

        // Registration Tax
        const regLand = estLandTaxValue * TAX_RATES.REGISTRATION_LICENSE.LAND_OWNERSHIP_TRANSFER;
        // Building Preservation (New) or Transfer (Used)
        const regBuilding = isLandMode
            ? estBuildingTaxValue * TAX_RATES.REGISTRATION_LICENSE.BUILDING_PRESERVATION
            : estBuildingTaxValue * TAX_RATES.REGISTRATION_LICENSE.LAND_OWNERSHIP_TRANSFER; // Used building transfer usually higher rate

        // Acquisition Tax
        const acqLand = (estLandTaxValue - (isLandMode ? 12000000 : 0)) * TAX_RATES.REAL_ESTATE_ACQUISITION.LAND; // Simplified reduction
        const acqBuilding = estBuildingTaxValue * TAX_RATES.REAL_ESTATE_ACQUISITION.BUILDING;

        // Brokerage Fee (Land only for New, Total for Used)
        const brokerageBase = isLandMode ? landPrice : (landPrice + buildingCost);
        const brokerage = brokerageBase > 4000000 ? (brokerageBase * 0.03 + 60000) * 1.1 : 0;

        // Update Store (Convert back to Man-yen)
        updateBudget({
            registrationTax: Math.round((regLand + regBuilding) / 10000),
            acquisitionTax: Math.max(0, Math.round((acqLand + acqBuilding) / 10000)),
            brokerageFee: Math.round(brokerage / 10000),
            // Stamp duty is tiered, let's just leave it or generic 1-2 man
            stampDuty: 1,
        });
    };

    const totalBudget =
        data.budget.landPrice +
        data.budget.demolitionCost +
        data.budget.buildingWorksCost +
        data.budget.stampDuty +
        data.budget.registrationTax +
        data.budget.acquisitionTax +
        data.budget.fireInsurancePrepaid +
        data.budget.waterContribution +
        data.budget.brokerageFee +
        data.budget.otherInitialCost +
        data.budget.constructionInterest;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in pb-20">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">事業予算・建築費 (Project Budget)</h2>
                <Button variant="secondary" size="sm" onClick={calculateEstimates} className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" /> 諸経費概算を自動計算
                </Button>
            </div>

            <div className="grid gap-6">
                <Card title="物件・建築費">
                    <div className="grid md:grid-cols-2 gap-6">
                        <InputGroup
                            label={isLandMode ? "土地購入費" : "物件購入費 (土地+建物)"}
                            type="number"
                            unit="万円"
                            value={data.budget.landPrice || ''}
                            onChange={(e) => updateBudget({ landPrice: parseFloat(e.target.value) })}
                        />

                        {isLandMode && (
                            <>
                                <InputGroup
                                    label="解体費"
                                    type="number"
                                    unit="万円"
                                    value={data.budget.demolitionCost || ''}
                                    onChange={(e) => updateBudget({ demolitionCost: parseFloat(e.target.value) })}
                                />
                                <InputGroup
                                    label="本体工事費"
                                    type="number"
                                    unit="万円"
                                    value={data.budget.buildingWorksCost || ''}
                                    onChange={(e) => updateBudget({ buildingWorksCost: parseFloat(e.target.value) })}
                                />
                                <InputGroup
                                    label="工事中金利"
                                    type="number"
                                    unit="万円"
                                    value={data.budget.constructionInterest || ''}
                                    onChange={(e) => updateBudget({ constructionInterest: parseFloat(e.target.value) })}
                                />
                            </>
                        )}
                    </div>
                </Card>

                <Card title="諸経費 (初期費用)">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <InputGroup
                            label="仲介手数料"
                            type="number"
                            unit="万円"
                            value={data.budget.brokerageFee || ''}
                            onChange={(e) => updateBudget({ brokerageFee: parseFloat(e.target.value) })}
                        />
                        <InputGroup
                            label="印紙税"
                            type="number"
                            unit="万円"
                            value={data.budget.stampDuty || ''}
                            onChange={(e) => updateBudget({ stampDuty: parseFloat(e.target.value) })}
                        />
                        <InputGroup
                            label="登録免許税"
                            type="number"
                            unit="万円"
                            value={data.budget.registrationTax || ''}
                            onChange={(e) => updateBudget({ registrationTax: parseFloat(e.target.value) })}
                        />
                        <InputGroup
                            label="不動産取得税"
                            type="number"
                            unit="万円"
                            value={data.budget.acquisitionTax || ''}
                            onChange={(e) => updateBudget({ acquisitionTax: parseFloat(e.target.value) })}
                        />
                        <InputGroup
                            label="火災保険料 (一括)"
                            type="number"
                            unit="万円"
                            value={data.budget.fireInsurancePrepaid || ''}
                            onChange={(e) => updateBudget({ fireInsurancePrepaid: parseFloat(e.target.value) })}
                        />
                        <InputGroup
                            label="水道分担金等"
                            type="number"
                            unit="万円"
                            value={data.budget.waterContribution || ''}
                            onChange={(e) => updateBudget({ waterContribution: parseFloat(e.target.value) })}
                        />
                        <InputGroup
                            label="その他諸経費"
                            type="number"
                            unit="万円"
                            value={data.budget.otherInitialCost || ''}
                            onChange={(e) => updateBudget({ otherInitialCost: parseFloat(e.target.value) })}
                        />
                    </div>
                </Card>

                <div className="bg-blue-600 text-white p-6 rounded-xl shadow-lg flex items-center justify-between">
                    <div>
                        <span className="text-blue-100 text-sm uppercase tracking-wider font-bold">総事業費 (Total Budget)</span>
                        <div className="text-3xl font-bold mt-1">{formatManYen(totalBudget)} 万円</div>
                    </div>
                    {/* Optional: Add percentage breakdown or chart here */}
                </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-slate-200">
                <Button variant="ghost" onClick={prevStep} className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" /> 戻る
                </Button>
                <Button onClick={nextStep} className="flex items-center gap-2">
                    次へ <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};
