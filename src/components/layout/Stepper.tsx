import { useSimulationStore } from '../../stores/useSimulationStore';
import { twMerge } from 'tailwind-merge';
import { Check, ChevronRight } from 'lucide-react';
import { formatPercent } from '../../utils/formatters';

const STEPS = [
    { id: 1, label: '物件詳細' },
    { id: 2, label: '事業予算' },
    { id: 3, label: '資金計画' },
    { id: 4, label: 'レントロール' },
    { id: 5, label: '収支分析' },
];

export const Stepper = () => {
    const { activeStep, setStep, getProgress } = useSimulationStore();
    const progress = getProgress();

    return (
        <div className="w-full bg-[#fdfaf5]/95 bg-[radial-gradient(#a87c2808_1px,transparent_1px)] [background-size:24px_24px] border-b border-[#e8dcc4] sticky top-16 z-40 shadow-sm no-print">
            <div className="max-w-6xl mx-auto px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold text-[#8c6114] uppercase tracking-widest">Progress</div>
                    <div className="text-xs font-bold text-[#a87c28]">{formatPercent(progress)} Completed</div>
                </div>

                {/* Progress Bar (ゴールドグラデーション) */}
                <div className="h-1.5 w-full bg-[#ebd9c5]/40 rounded-full overflow-hidden mb-4">
                    <div
                        className="h-full bg-gradient-to-r from-[#aa7c11] to-[#d4af37] transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Steps Navigation */}
                <div className="flex items-center justify-between md:justify-start md:gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {STEPS.map((step, index) => {
                        const isActive = activeStep === step.id;
                        const isCompleted = activeStep > step.id;

                        return (
                            <div key={step.id} className="flex items-center">
                                <button
                                    onClick={() => setStep(step.id)}
                                    className={twMerge(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                                        isActive
                                            ? "bg-gradient-to-r from-[#aa7c11] to-[#8a5d3b] text-[#fdfaf5] shadow-md"
                                            : isCompleted
                                                ? "bg-[#ebd9c5]/30 text-[#8c6114] hover:bg-[#ebd9c5]/50 border border-[#e8dcc4]/60"
                                                : "text-[#8c6114]/60 hover:text-[#23150d] hover:bg-[#ebd9c5]/20"
                                    )}
                                >
                                    <div className={twMerge(
                                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                                        isActive ? "bg-[#fdfaf5] text-[#8c6114]"
                                            : isCompleted ? "bg-[#a87c28] text-white"
                                                : "bg-[#ebd9c5]/40 text-[#8c6114]/65"
                                    )}>
                                        {isCompleted ? <Check className="w-3 h-3 text-white" /> : index + 1}
                                    </div>
                                    <span>{step.label}</span>
                                </button>

                                {index < STEPS.length - 1 && (
                                    <ChevronRight className="w-4 h-4 text-[#ebd9c5] mx-1 md:mx-2 flex-shrink-0" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
