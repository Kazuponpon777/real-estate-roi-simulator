import { useRef, type ChangeEvent } from 'react';
import { Building2, Search, ArrowRight, Upload, FileJson, PlayCircle } from 'lucide-react';
import { useSimulationStore } from '../stores/useSimulationStore';
import type { SimulationMode } from '../stores/useSimulationStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { loadProjectJSON, importCSV } from '../utils/fileHandler';
import { DEMO_DATA } from '../data/demoData';

const ModeCard = ({
    title,
    description,
    icon: Icon,
    onClick,
    active
}: {
    title: string;
    description: string;
    icon: React.ElementType;
    onClick: () => void;
    active?: boolean;
}) => (
    <button
        onClick={onClick}
        className={`w-full group relative overflow-hidden text-left transition-all duration-300 hover:scale-[1.02] ${active ? 'ring-2 ring-indigo-500 shadow-lg scale-[1.02]' : 'hover:shadow-md'
            }`}
    >
        <Card className={`h-full border-2 ${active ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-100'}`}>
            <div className={`mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300'
                }`}>
                <Icon className="h-8 w-8" />
            </div>

            <h3 className={`mb-3 text-2xl font-bold ${active ? 'text-indigo-900' : 'text-slate-900'}`}>{title}</h3>
            <p className="text-slate-500 leading-relaxed mb-8">{description}</p>

            <div className={`flex items-center text-sm font-bold uppercase tracking-wider ${active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-600'
                }`}>
                Select Mode <ArrowRight className="ml-2 h-4 w-4" />
            </div>
        </Card>
    </button>
);

export const Screen0_ModeSelect: React.FC = () => {
    const { data, updateData, nextStep, setStep } = useSimulationStore();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const csvInputRef = useRef<HTMLInputElement>(null);

    const handleSelect = (mode: SimulationMode) => {
        updateData({ mode });
        nextStep();
    };

    const handleLoadJSON = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const loadedData = await loadProjectJSON(file);
            updateData(loadedData);
            setStep(5); // Jump to analysis
            alert('プロジェクトを読み込みました');
        } catch (err) {
            console.error(err);
            alert('ファイルの読み込みに失敗しました');
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleImportCSV = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const newData = await importCSV(file, data);
            updateData(newData);
            setStep(1); // Jump to Property
            alert('CSVデータをインポートしました');
        } catch (err) {
            console.error(err);
            alert('CSVの読み込みに失敗しました');
        }
        if (csvInputRef.current) csvInputRef.current.value = '';
    };

    const handleLoadDemo = () => {
        if (confirm('デモデータを読み込みますか？\n（入力中のデータは上書きされます）')) {
            updateData(DEMO_DATA);
            setStep(5); // Jump to analysis
        }
    };

    return (
        <div className="flex h-full flex-col justify-center px-4 max-w-5xl mx-auto w-full animate-in">
            <div className="flex flex-col items-center justify-center mb-12 text-center">
                <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-400">
                    不動産収支シミュレーター
                </h1>
                <p className="text-lg text-slate-500 mb-8">
                    シミュレーションの目的を選択してください
                </p>

                <div className="flex gap-4">
                    <input type="file" ref={fileInputRef} onChange={handleLoadJSON} accept=".json" className="hidden" />
                    <input type="file" ref={csvInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />

                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2">
                        <Upload className="h-4 w-4" /> つづきから始める (JSON)
                    </Button>
                    <Button variant="ghost" onClick={() => csvInputRef.current?.click()} className="flex items-center gap-2 text-slate-500">
                        <FileJson className="h-4 w-4" /> CSVインポート
                    </Button>
                    <Button variant="ghost" onClick={handleLoadDemo} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600">
                        <PlayCircle className="h-4 w-4" /> デモデータ読込
                    </Button>
                </div>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                <ModeCard
                    title="土地活用 (新築)"
                    description="土地オーナー様向け。更地からの建築企画、事業収支をシミュレーションします。"
                    icon={Building2}
                    onClick={() => handleSelect('land_new')}
                    active={data.mode === 'land_new'}
                />
                <ModeCard
                    title="収益物件購入 (中古)"
                    description="投資家様向け。既存の土地付き建物の購入・運用収支をシミュレーションします。"
                    icon={Search}
                    onClick={() => handleSelect('investment_used')}
                    active={data.mode === 'investment_used'}
                />
            </div>
        </div>
    );
};
