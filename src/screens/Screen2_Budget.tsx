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

    React.useEffect(() => {
        const landPrice = (data.budget.landPrice || 0) * 10000;
        const buildingCost = (data.budget.buildingWorksCost || 0) * 10000;

        const newUpdates: Partial<typeof data.budget> = {};

        // 1. Stamp Duty
        if (data.budget.isAutoStampDuty !== false) {
            let stamp = 1;
            const total = landPrice + (isLandMode ? buildingCost : 0);
            if (total > 100000000) stamp = 6;
            else if (total > 50000000) stamp = 3;
            else if (total > 10000000) stamp = 1;
            else if (total > 5000000) stamp = 0.5;
            else stamp = 0; // Less than 5M, or 0

            if (data.budget.stampDuty !== stamp) newUpdates.stampDuty = stamp;
        }

        // Estimates
        const estLandTaxValue = landPrice * 0.7;
        const estBuildingTaxValue = buildingCost * 0.5;

        // 2. Registration Tax
        if (data.budget.isAutoRegistrationTax !== false) {
            const regLand = estLandTaxValue * TAX_RATES.REGISTRATION_LICENSE.LAND_OWNERSHIP_TRANSFER;
            const regBuilding = isLandMode
                ? estBuildingTaxValue * TAX_RATES.REGISTRATION_LICENSE.BUILDING_PRESERVATION
                : estBuildingTaxValue * TAX_RATES.REGISTRATION_LICENSE.LAND_OWNERSHIP_TRANSFER;
            const regTotalMan = Math.round((regLand + regBuilding) / 10000);

            if (data.budget.registrationTax !== regTotalMan) newUpdates.registrationTax = regTotalMan;
        }

        // 3. Acquisition Tax
        if (data.budget.isAutoAcquisitionTax !== false) {
            const acqLand = Math.max(0, (estLandTaxValue - (isLandMode ? 12000000 : 0)) * TAX_RATES.REAL_ESTATE_ACQUISITION.LAND);
            const acqBuilding = estBuildingTaxValue * TAX_RATES.REAL_ESTATE_ACQUISITION.BUILDING;
            const acqTotalMan = Math.max(0, Math.round((acqLand + acqBuilding) / 10000));

            if (data.budget.acquisitionTax !== acqTotalMan) newUpdates.acquisitionTax = acqTotalMan;
        }

        if (Object.keys(newUpdates).length > 0) {
            updateBudget(newUpdates);
        }
    }, [
        data.budget.landPrice,
        data.budget.buildingWorksCost,
        data.budget.isAutoStampDuty,
        data.budget.isAutoRegistrationTax,
        data.budget.isAutoAcquisitionTax,
        isLandMode,
        updateBudget
    ]);

    const calculateBrokerageEstimate = () => {
        const landPrice = (data.budget.landPrice || 0) * 10000;
        const buildingCost = (data.budget.buildingWorksCost || 0) * 10000;
        const brokerageBase = isLandMode ? landPrice : (landPrice + buildingCost);
        const brokerage = brokerageBase > 4000000 ? (brokerageBase * 0.03 + 60000) * 1.1 : 0;

        updateBudget({
            brokerageFee: Math.round(brokerage / 10000),
            isAutoStampDuty: true,
            isAutoRegistrationTax: true,
            isAutoAcquisitionTax: true,
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
                <Button variant="secondary" size="sm" onClick={calculateBrokerageEstimate} className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" /> 諸経費概算計算
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
                            value={data.budget.stampDuty === 0 ? '' : data.budget.stampDuty}
                            onChange={(e) => updateBudget({ stampDuty: parseFloat(e.target.value) || 0, isAutoStampDuty: false })}
                            actionIcon={data.budget.isAutoStampDuty === false ? <RefreshCw className="h-4 w-4" /> : undefined}
                            actionTooltip="自動計算に戻す"
                            onAction={() => updateBudget({ isAutoStampDuty: true })}
                            help="購入金額に基づき概算。手動変更で固定されます。"
                        />
                        <InputGroup
                            label="登録免許税"
                            type="number"
                            unit="万円"
                            value={data.budget.registrationTax === 0 ? '' : data.budget.registrationTax}
                            onChange={(e) => updateBudget({ registrationTax: parseFloat(e.target.value) || 0, isAutoRegistrationTax: false })}
                            actionIcon={data.budget.isAutoRegistrationTax === false ? <RefreshCw className="h-4 w-4" /> : undefined}
                            actionTooltip="自動計算に戻す"
                            onAction={() => updateBudget({ isAutoRegistrationTax: true })}
                            help="購入金額の70/50%を評価額として概算。手動変更で固定されます。"
                        />
                        <InputGroup
                            label="不動産取得税"
                            type="number"
                            unit="万円"
                            value={data.budget.acquisitionTax === 0 ? '' : data.budget.acquisitionTax}
                            onChange={(e) => updateBudget({ acquisitionTax: parseFloat(e.target.value) || 0, isAutoAcquisitionTax: false })}
                            actionIcon={data.budget.isAutoAcquisitionTax === false ? <RefreshCw className="h-4 w-4" /> : undefined}
                            actionTooltip="自動計算に戻す"
                            onAction={() => updateBudget({ isAutoAcquisitionTax: true })}
                            help="購入金額の70/50%を評価額として概算。手動変更で固定されます。"
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
