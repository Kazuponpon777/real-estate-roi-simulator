import React from 'react';
import { useSimulationStore } from '../stores/useSimulationStore';
import { Card } from '../components/ui/Card';
import { InputGroup } from '../components/ui/InputGroup';
import { Button } from '../components/ui/Button';
import { ChevronRight, ArrowLeft, RefreshCw } from 'lucide-react';
import { formatManYen } from '../utils/formatters';
import { validateBudget, type ValidationErrors } from '../utils/validation';

export const Screen2_Budget: React.FC = () => {
    const { data, updateBudget, nextStep, prevStep } = useSimulationStore();
    const isLandMode = data.mode === 'land_new';
    const isLeaseMode = data.mode === 'land_lease';

    // ローカルのエラー状態を定義
    const [errors, setErrors] = React.useState<ValidationErrors>({});

    // 諸経費概算計算の呼び出し (Zustandストア内での自動計算をトリガー)
    const calculateBrokerageEstimate = () => {
        updateBudget({
            isAutoStampDuty: true,
            isAutoRegistrationTax: true,
            isAutoAcquisitionTax: true,
            isAutoBrokerageFee: true,
        });
    };

    // 土地初期コストの選定：借地リースの場合は「土地敷金(landLeaseDeposit)」を計上、それ以外は「土地購入費(landPrice)」
    const landCostPart = isLeaseMode ? (data.budget.landLeaseDeposit || 0) : (data.budget.landPrice || 0);

    // 総事業費 (Total Budget) の算出
    // 借地リース以外のモード (新築および中古) では、土地購入に対する仲介手数料を正しく合算します
    const totalBudget =
        landCostPart +
        ((isLandMode || isLeaseMode) ? data.budget.demolitionCost : 0) +
        ((isLandMode || isLeaseMode) ? data.budget.buildingWorksCost : 0) +
        data.budget.stampDuty +
        data.budget.registrationTax +
        data.budget.acquisitionTax +
        data.budget.fireInsurancePrepaid +
        data.budget.waterContribution +
        (!isLeaseMode ? data.budget.brokerageFee : 0) + // 借地時以外（新築・中古）は仲介手数料を合算する
        data.budget.otherInitialCost +
        ((isLandMode || isLeaseMode) ? data.budget.constructionInterest : 0);

    // バリデーションチェックを実行して次へ進む
    const handleNext = () => {
        const validationErrors = validateBudget(data);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        setErrors({});
        nextStep();
    };

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
                        {isLeaseMode ? (
                            <InputGroup
                                label="土地敷金 (地主への敷金)"
                                type="number"
                                unit="万円"
                                help="地主に預託する敷金です。契約終了時に返還される前提で計上されます。"
                                value={data.budget.landLeaseDeposit || ''}
                                onChange={(e) => updateBudget({ landLeaseDeposit: parseFloat(e.target.value) || 0 })}
                            />
                        ) : (
                            <InputGroup
                                label={isLandMode ? "土地購入費" : "物件購入価格 (土地・建物総額)"}
                                type="number"
                                unit="万円"
                                value={data.budget.landPrice || ''}
                                onChange={(e) => updateBudget({ landPrice: parseFloat(e.target.value) || 0 })}
                            />
                        )}

                        {(isLandMode || isLeaseMode) && (
                            <>
                                <InputGroup
                                    label="解体費"
                                    type="number"
                                    unit="万円"
                                    value={data.budget.demolitionCost || ''}
                                    onChange={(e) => updateBudget({ demolitionCost: parseFloat(e.target.value) || 0 })}
                                />
                                <InputGroup
                                    label="本体工事費"
                                    type="number"
                                    unit="万円"
                                    value={data.budget.buildingWorksCost || ''}
                                    onChange={(e) => updateBudget({ buildingWorksCost: parseFloat(e.target.value) || 0 })}
                                />
                                <InputGroup
                                    label="工事中金利"
                                    type="number"
                                    unit="万円"
                                    value={data.budget.constructionInterest || ''}
                                    onChange={(e) => updateBudget({ constructionInterest: parseFloat(e.target.value) || 0 })}
                                />
                            </>
                        )}
                    </div>
                </Card>

                <Card title="諸経費 (初期費用)">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* 仲介手数料は土地を購入しない借地リースモード以外のときに表示 */}
                        {!isLeaseMode && (
                            <InputGroup
                                label="仲介手数料"
                                type="number"
                                unit="万円"
                                value={data.budget.brokerageFee || ''}
                                onChange={(e) => updateBudget({ brokerageFee: parseFloat(e.target.value) || 0, isAutoBrokerageFee: false })}
                            />
                        )}
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
                            label="火災保険料 (5年一括)"
                            type="number"
                            unit="万円"
                            help="5年契約分の一括火災保険料です。5年ごとにスポット更新費用として再計上されます。"
                            value={data.budget.fireInsurancePrepaid || ''}
                            onChange={(e) => updateBudget({ fireInsurancePrepaid: parseFloat(e.target.value) || 0 })}
                        />
                        {(isLandMode || isLeaseMode) && (
                            <InputGroup
                                label="市納金 (水道分担金等)"
                                type="number"
                                unit="万円"
                                help="地方自治体等へ支払う水道負担金などの市納金です。"
                                value={data.budget.waterContribution || ''}
                                onChange={(e) => updateBudget({ waterContribution: parseFloat(e.target.value) || 0 })}
                            />
                        )}
                        <InputGroup
                            label="その他諸経費"
                            type="number"
                            unit="万円"
                            value={data.budget.otherInitialCost || ''}
                            onChange={(e) => updateBudget({ otherInitialCost: parseFloat(e.target.value) || 0 })}
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
                    次へ <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};
