import { useSimulationStore } from '../../stores/useSimulationStore';
import { twMerge } from 'tailwind-merge';
import { Check, ChevronRight } from 'lucide-react';
import { formatPercent } from '../../utils/formatters';

const STEPS = [
    { id: 0, label: 'Start' },
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
        <div className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm no-print">
            <div className="max-w-6xl mx-auto px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Progress</div>
                    <div className="text-xs font-bold text-indigo-600">{formatPercent(progress)} Completed</div>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-4">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Steps Navigation */}
                <div className="flex items-center justify-between md:justify-start md:gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {STEPS.map((step, index) => {
                        const isActive = activeStep === step.id;
                        const isCompleted = activeStep > step.id;

                        // Actually, simplify: Allow clicking any step.

                        return (
                            <div key={step.id} className="flex items-center">
                                <button
                                    onClick={() => setStep(step.id)}
                                    className={twMerge(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                                        isActive
                                            ? "bg-indigo-600 text-white shadow-md"
                                            : isCompleted
                                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <div className={twMerge(
                                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                                        isActive ? "bg-white text-indigo-600"
                                            : isCompleted ? "bg-emerald-500 text-white"
                                                : "bg-slate-200 text-slate-500"
                                    )}>
                                        {isCompleted ? <Check className="w-3 h-3" /> : step.id + 1}
                                    </div>
                                    <span>{step.label}</span>
                                </button>

                                {index < STEPS.length - 1 && (
                                    <ChevronRight className="w-4 h-4 text-slate-300 mx-1 md:mx-2 flex-shrink-0" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
