import { Building2, Search, ArrowRight, PlayCircle, Store, CheckCircle2 } from 'lucide-react';
import { useSimulationStore } from '../stores/useSimulationStore';
import type { SimulationMode } from '../stores/useSimulationStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
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
        tagClass: 'bg-[#fcf5e3] text-[#8c6114] border-[#ebd9c5]',
        gradientClass: 'from-[#d4af37]/10 to-[#aa7c11]/10 border-[#ebd9c5] hover:border-[#a87c28]',
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
        tagClass: 'bg-[#f5ebd9] text-[#8a5d3b] border-[#ebd9c5]',
        gradientClass: 'from-[#8a5d3b]/10 to-[#ebd9c5]/20 border-[#ebd9c5] hover:border-[#8a5d3b]/50',
        description: '既存の土地付き収益ビル・マンションの購入・運用収支シミュレーションに。',
        features: [
            '築古・木造等の簡便法による「短期減価償却」',
            '高い初期利回りと即座의キャッシュフロー',
            '建物比率の調整による税務メリットの極大化'
        ],
        icon: Search
    },
    {
        mode: 'land_lease',
        title: '借地リース (テナント開発)',
        tag: '他人資本で勝つ超高効率',
        tagClass: 'bg-[#ebd9c5]/40 text-[#23150d] border-[#ebd9c5]',
        gradientClass: 'from-[#3d251a]/5 to-[#8c6114]/10 border-[#ebd9c5] hover:border-[#3d251a]/30',
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
            className={`w-full group relative overflow-hidden text-left transition-all duration-300 rounded-2xl hover:scale-[1.03] active:scale-[1.01] ${active ? 'ring-2 ring-[#a87c28] shadow-xl scale-[1.03]' : 'hover:shadow-lg'
                }`}
        >
            {/* 背景のグラデーション演出 */}
            <div className={`absolute inset-0 bg-gradient-to-br ${option.gradientClass} opacity-60 transition-opacity duration-300`} />
            
            <Card className={`relative h-full border-2 bg-[#fcf9f2]/90 backdrop-blur-md transition-colors duration-300 ${active ? 'border-[#a87c28] bg-[#ebd9c5]/10' : 'border-[#e8dcc4]/60'}`}>
                {/* タグ表示 */}
                <div className="flex justify-between items-start mb-6">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold transition-colors ${option.tagClass}`}>
                        {option.tag}
                    </span>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${active ? 'bg-gradient-to-tr from-[#aa7c11] to-[#d4af37] text-[#1c120c] shadow-sm' : 'bg-[#fcf9f2] text-[#8c6114] border border-[#e8dcc4] group-hover:bg-gradient-to-tr group-hover:from-[#aa7c11] group-hover:to-[#d4af37] group-hover:text-[#1c120c]'
                        }`}>
                        <Icon className="h-6 w-6" />
                    </div>
                </div>

                <h3 className={`mb-3 text-xl font-bold ${active ? 'text-[#23150d]' : 'text-[#23150d]/90'}`}>{option.title}</h3>
                <p className="text-sm text-[#8c6c59] leading-relaxed mb-6 h-12 overflow-hidden">{option.description}</p>

                {/* 特徴リスト（箇条書き）の追加 */}
                <div className="space-y-2.5 mb-8 border-t border-[#ebd9c5] pt-4">
                    {option.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-[#3d251a]">
                            <CheckCircle2 className="h-4 w-4 text-[#ebd9c5] shrink-0 mt-0.5" />
                            <span>{feature}</span>
                        </div>
                    ))}
                </div>

                <div className={`flex items-center text-xs font-bold uppercase tracking-wider ${active ? 'text-[#a87c28]' : 'text-[#8c6114] group-hover:text-[#a87c28]'
                    }`}>
                    このモードでシミュレーションを開始 <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
            </Card>
        </button>
    );
};

export const Screen0_ModeSelect: React.FC = () => {
    const { data, updateData, nextStep, setStep } = useSimulationStore();

    const handleSelect = (mode: SimulationMode) => {
        updateData({ mode });
        nextStep();
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
                <h1 className="text-4xl font-extrabold font-serif text-transparent bg-clip-text bg-gradient-to-r from-[#8c6114] via-[#a87c28] to-[#aa7c11] mb-4 tracking-wide">
                    不動産収支シミュレーター
                </h1>
                <p className="text-lg text-[#8c6c59] mb-8 max-w-md font-medium">
                    想定する事業スキームに合わせた最適な入力フォームとAI分析レポートを自動生成します
                </p>

                <div className="flex flex-wrap justify-center gap-4">
                    <Button onClick={handleLoadDemo} className="flex items-center gap-2 bg-gradient-to-r from-[#aa7c11] to-[#8a5d3b] hover:from-[#bfa153] hover:to-[#a47b52] text-[#fdfaf5] border-none shadow-lg">
                        <PlayCircle className="h-4 w-4" /> デモデータを読み込んで試す
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
