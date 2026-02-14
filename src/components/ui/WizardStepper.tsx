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
                <div className="absolute left-0 top-1/2 -z-10 h-0.5 w-full bg-slate-200 -translate-y-1/2" />

                {steps.map((step, index) => {
                    const isCompleted = index < currentStep;
                    const isCurrent = index === currentStep;

                    return (
                        <div key={index} className="flex flex-col items-center bg-white px-2">
                            <div
                                className={clsx(
                                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors duration-300",
                                    isCompleted ? "border-blue-600 bg-blue-600 text-white" :
                                        isCurrent ? "border-blue-600 bg-white text-blue-600" :
                                            "border-slate-300 bg-white text-slate-400"
                                )}
                            >
                                {isCompleted ? <Check className="h-4 w-4" /> : <span className="text-xs font-bold">{index + 1}</span>}
                            </div>
                            <span
                                className={clsx(
                                    "mt-2 text-xs font-medium transition-colors duration-300",
                                    isCurrent ? "text-blue-600" : "text-slate-500"
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
