import React from 'react';
import { useSimulationStore } from '../stores/useSimulationStore';
import type { Loan } from '../stores/useSimulationStore';
import { Card } from '../components/ui/Card';
import { InputGroup } from '../components/ui/InputGroup';
import { Button } from '../components/ui/Button';
import { ChevronRight, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { formatManYen } from '../utils/formatters';

export const Screen3_Funding: React.FC = () => {
    const { data, updateFunding, nextStep, prevStep } = useSimulationStore();

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

    const totalLoans = data.funding.loans.reduce((acc, loan) => acc + loan.amount, 0);
    const totalFunding = totalLoans + data.funding.ownCapital + data.funding.cooperationMoney + data.funding.securityDepositIn;

    const balance = totalFunding - totalBudget;
    const isBalanced = Math.abs(balance) < 0.1;

    const addLoan = () => {
        const newLoan: Loan = {
            id: Math.random().toString(36).substr(2, 9),
            name: `借入金 ${data.funding.loans.length + 1}`,
            amount: 0,
            rate: 1.5,
            duration: 35
        };
        updateFunding({ loans: [...data.funding.loans, newLoan] });
    };

    const removeLoan = (id: string) => {
        updateFunding({ loans: data.funding.loans.filter(l => l.id !== id) });
    };

    const updateLoan = (id: string, updates: Partial<Loan>) => {
        updateFunding({
            loans: data.funding.loans.map(l => l.id === id ? { ...l, ...updates } : l)
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in pb-20">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">資金計画 (Financial Plan)</h2>
            </div>

            <div className="grid gap-6">
                <Card title="自己資金・その他">
                    <div className="grid md:grid-cols-3 gap-6">
                        <InputGroup
                            label="自己資金"
                            type="number"
                            unit="万円"
                            value={data.funding.ownCapital || ''}
                            onChange={(e) => updateFunding({ ownCapital: parseFloat(e.target.value) || 0 })}
                        />
                        <InputGroup
                            label="建設協力金"
                            type="number"
                            unit="万円"
                            value={data.funding.cooperationMoney || ''}
                            onChange={(e) => updateFunding({ cooperationMoney: parseFloat(e.target.value) || 0 })}
                        />
                        {/* Note: Security Deposit (Tenant) is usually liabilities but treated as cash inflow for construction? 
                   Req says "預り金". Usually tenant deposits come AFTER completion. 
                   But maybe owner puts in advanced tenant deposits? 
                   Or this is effectively "Loan from Tenant". */}
                        <InputGroup
                            label="保証金 (預り金)"
                            type="number"
                            unit="万円"
                            value={data.funding.securityDepositIn || ''}
                            onChange={(e) => updateFunding({ securityDepositIn: parseFloat(e.target.value) || 0 })}
                        />
                    </div>
                </Card>

                <Card title="借入金">
                    <div className="space-y-4">
                        {data.funding.loans.map((loan) => (
                            <div key={loan.id} className="grid md:grid-cols-12 gap-4 items-end p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="md:col-span-3">
                                    <InputGroup
                                        label="金融機関名"
                                        value={loan.name}
                                        onChange={(e) => updateLoan(loan.id, { name: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <InputGroup
                                        label="借入金額"
                                        type="number"
                                        unit="万円"
                                        value={loan.amount || ''}
                                        onChange={(e) => updateLoan(loan.id, { amount: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <InputGroup
                                        label="金利"
                                        type="number"
                                        unit="%"
                                        step={0.01}
                                        value={loan.rate || ''}
                                        onChange={(e) => updateLoan(loan.id, { rate: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <InputGroup
                                        label="期間"
                                        type="number"
                                        unit="年"
                                        value={loan.duration || ''}
                                        onChange={(e) => updateLoan(loan.id, { duration: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="md:col-span-2 flex justify-end pb-1">
                                    {data.funding.loans.length > 1 && (
                                        <Button variant="ghost" size="sm" onClick={() => removeLoan(loan.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}

                        <Button variant="secondary" onClick={addLoan} className="w-full flex items-center justify-center gap-2 border-dashed border-2 border-slate-300 bg-transparent hover:bg-slate-50 hover:border-slate-400">
                            <Plus className="h-4 w-4" /> 借入を追加
                        </Button>
                    </div>
                </Card>

                <div className={`p-6 rounded-xl shadow-lg flex items-center justify-between transition-colors duration-300 ${isBalanced ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'
                    }`}>
                    <div>
                        <div className="text-sm opacity-90 mb-1">調達合計 (Funding)</div>
                        <div className="text-3xl font-bold">{formatManYen(totalFunding)} 万円</div>
                        <div className="text-xs opacity-75 mt-1">
                            総事業費: {formatManYen(totalBudget)} 万円
                            {!isBalanced && ` (差額: ${formatManYen(balance)} 万円)`}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm opacity-90">Cover Ratio</div>
                        <div className={`text-2xl font-bold ${totalBudget > 0 ? (totalFunding / totalBudget * 100) >= 100 ? 'text-white' : 'text-yellow-300' : ''}`}>
                            {totalBudget > 0 ? (totalFunding / totalBudget * 100).toFixed(1) : 0}%
                        </div>
                    </div>
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
