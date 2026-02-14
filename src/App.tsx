import { useSimulationStore } from './stores/useSimulationStore';
import { Screen0_ModeSelect } from './screens/Screen0_ModeSelect';
import { Screen1_Property } from './screens/Screen1_Property';
import { Screen2_Budget } from './screens/Screen2_Budget';
import { Screen3_Funding } from './screens/Screen3_Funding';
import { Screen4_RentRoll } from './screens/Screen4_RentRoll';
import { Screen5_Analysis } from './screens/Screen5_Analysis';
import { Stepper } from './components/layout/Stepper';

function App() {
    const { activeStep } = useSimulationStore();

    const renderScreen = () => {
        switch (activeStep) {
            case 0: return <Screen0_ModeSelect />;
            case 1: return <Screen1_Property />;
            case 2: return <Screen2_Budget />;
            case 3: return <Screen3_Funding />;
            case 4: return <Screen4_RentRoll />;
            case 5: return <Screen5_Analysis />;
            default: return <Screen0_ModeSelect />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-6 no-print">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">Y</div>
                    <span className="font-bold text-lg tracking-tight">Yashima ROI Simulator</span>
                </div>

                <div className="hidden md:block w-full max-w-2xl">
                    {/* Stepper is now a full width component, maybe placed outside? */}
                </div>

                <div className="text-sm font-medium text-slate-500">
                    v1.1 (Revised)
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-20 pb-12 min-h-screen">
                {activeStep > 0 && <Stepper />}
                <div className="container mx-auto px-4 md:px-6 py-8">
                    {renderScreen()}
                </div>
            </main>
        </div>
    );
}

export default App;
