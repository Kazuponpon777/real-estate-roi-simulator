import { useRef, type ChangeEvent } from 'react';
import { Building2, Search, ArrowRight, Upload, FileJson, PlayCircle, Store, CheckCircle2 } from 'lucide-react';
import { useSimulationStore } from '../stores/useSimulationStore';
import type { SimulationMode } from '../stores/useSimulationStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { loadProjectJSON, importCSV } from '../utils/fileHandler';
import { DEMO_DATA } from '../data/demoData';

interface ModeOption {
    mode: SimulationMode;
    title: string;
    tag: string;
    tagClass: string;
    gradientClass: string;
    description: string;
    features: string[];
    icon: React.ElementType;
}

const MODE_OPTIONS: ModeOption[] = [
    {
        mode: 'land_new',
        title: '土地活用 (新築)',
        tag: '資産形成の王道',
        tagClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        gradientClass: 'from-indigo-500/10 to-blue-500/10 border-indigo-100 hover:border-indigo-300',
        description: '更地からの新築建築企画、土地持ちオーナー様の長期的な事業収支シミュレーションに。',
        features: [
            '長期にわたる安定的な家賃収入',
            '相続税や固定資産税の劇的な節税効果',
            '最新設備による高い入居率と資産価値'
        ],
        icon: Building2
    },
    {
        mode: 'investment_used',
        title: '収益物件購入 (中古)',
        tag: 'スピード節税・高利回り',
        tagClass: 'bg-amber-100 text-amber-800 border-amber-200',
        gradientClass: 'from-amber-500/10 to-orange-500/10 border-amber-100 hover:border-amber-300',
        description: '既存の土地付き収益ビル・マンションの購入・運用収支シミュレーションに。',
        features: [
            '築古・木造等の簡便法による「短期減価償却」',
            '高い初期利回りと即座のキャッシュフロー',
            '建物比率の調整による税務メリットの極大化'
        ],
        icon: Search
    },
    {
        mode: 'land_lease',
        title: '借地リース (テナント開発)',
        tag: '他人資本で勝つ超高効率',
        tagClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        gradientClass: 'from-emerald-500/10 to-teal-500/10 border-emerald-100 hover:border-emerald-300',
        description: '地権者から借地し、上物を自社建設してテナントへリース・サブリースする事業スキームに。',
        features: [
            '土地購入費が完全ゼロ（初期投資の圧倒的圧縮）',
            'テナントからの建設協力金（無利息）での建築調達',
            '土地の固定資産税免除と爆発的な自己資金回収率'
        ],
        icon: Store
    }
];

const ModeCard = ({
    option,
    onClick,
    active
}: {
    option: ModeOption;
    onClick: () => void;
    active?: boolean;
}) => {
    const Icon = option.icon;
    return (
        <button
            onClick={onClick}
            className={`w-full group relative overflow-hidden text-left transition-all duration-300 rounded-2xl hover:scale-[1.03] active:scale-[1.01] ${active ? 'ring-2 ring-indigo-500 shadow-xl scale-[1.03]' : 'hover:shadow-lg'
                }`}
        >
            {/* 背景のグラデーション演出 */}
            <div className={`absolute inset-0 bg-gradient-to-br ${option.gradientClass} opacity-60 transition-opacity duration-300`} />
            
            <Card className={`relative h-full border-2 bg-white/70 backdrop-blur-md transition-colors duration-300 ${active ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-100'}`}>
                {/* タグ表示 */}
                <div className="flex justify-between items-start mb-6">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold transition-colors ${option.tagClass}`}>
                        {option.tag}
                    </span>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-600 group-hover:text-white'
                        }`}>
                        <Icon className="h-6 w-6" />
                    </div>
                </div>

                <h3 className={`mb-3 text-xl font-bold ${active ? 'text-indigo-900' : 'text-slate-900'}`}>{option.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-6 h-12 overflow-hidden">{option.description}</p>

                {/* 特徴リスト（箇条書き）の追加 */}
                <div className="space-y-2.5 mb-8 border-t border-slate-100/50 pt-4">
                    {option.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{feature}</span>
                        </div>
                    ))}
                </div>

                <div className={`flex items-center text-xs font-bold uppercase tracking-wider ${active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-600'
                    }`}>
                    このモードでシミュレーションを開始 <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
            </Card>
        </button>
    );
};

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
        <div className="flex h-full flex-col justify-center px-4 max-w-6xl mx-auto w-full animate-in pb-16">
            <div className="flex flex-col items-center justify-center mb-12 text-center">
                <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-400">
                    不動産収支シミュレーター
                </h1>
                <p className="text-lg text-slate-500 mb-8 max-w-md">
                    想定する事業スキームに合わせた最適な入力フォームとAI分析レポートを自動生成します
                </p>

                <div className="flex flex-wrap justify-center gap-4">
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

            <div className="grid gap-8 md:grid-cols-3">
                {MODE_OPTIONS.map((option) => (
                    <ModeCard
                        key={option.mode}
                        option={option}
                        onClick={() => handleSelect(option.mode)}
                        active={data.mode === option.mode}
                    />
                ))}
            </div>
        </div>
    );
};
