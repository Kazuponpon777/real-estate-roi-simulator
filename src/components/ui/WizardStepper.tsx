import React from 'react';
import { Check } from 'lucide-react';
import { clsx } from 'clsx';

interface WizardStepperProps {
    steps: string[];
    currentStep: number;
}

export const WizardStepper: React.FC<WizardStepperProps> = ({ steps, currentStep }) => {
    return (
        <div className="w-full">
            <div className="relative flex items-center justify-between">
                {/* Connection Line */}
                <div className="absolute left-0 top-1/2 -z-10 h-0.5 w-full bg-[#ebd9c5] -translate-y-1/2" />

                {steps.map((step, index) => {
                    const isCompleted = index < currentStep;
                    const isCurrent = index === currentStep;

                    return (
                        <div key={index} className="flex flex-col items-center bg-[#fdfaf5] px-2">
                            <div
                                className={clsx(
                                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors duration-300",
                                    isCompleted ? "border-[#a87c28] bg-gradient-to-tr from-[#aa7c11] to-[#d4af37] text-[#1c120c]" :
                                        isCurrent ? "border-[#a87c28] bg-[#fdfaf5] text-[#a87c28]" :
                                            "border-[#ebd9c5] bg-[#fdfaf5] text-[#8c6114]/60"
                                )}
                            >
                                {isCompleted ? <Check className="h-4 w-4" /> : <span className="text-xs font-bold">{index + 1}</span>}
                            </div>
                            <span
                                className={clsx(
                                    "mt-2 text-xs font-bold transition-colors duration-300",
                                    isCurrent ? "text-[#a87c28]" : "text-[#8c6114]/70"
                                )}
                            >
                                {step}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
