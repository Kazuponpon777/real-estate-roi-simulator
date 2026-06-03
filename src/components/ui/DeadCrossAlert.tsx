import React from 'react';
import { AlertTriangle, Lightbulb, Info } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface DeadCrossAlertProps {
    hasDeadCross: boolean;           // デッドクロスが発生するかどうか
    deadCrossYear: number | null;    // デッドクロス発生年度 (最初の年)
    maxTaxIncrease: number;          // デッドクロス発生後の最大想定増税額 (円)
    maxCashCrunchYear: number | null; // キャッシュフローが最も圧迫される年
    buildingUsefulLife: number;      // 建物耐用年数 (年)
    equipmentUsefulLife: number;     // 設備耐用年数 (年)
}

/**
 * デッドクロス（元金返済額 ＞ 減価償却費）の警告およびコンサルタント推奨アドバイスカード
 */
export const DeadCrossAlert: React.FC<DeadCrossAlertProps> = ({
    hasDeadCross,
    deadCrossYear,
    maxTaxIncrease,
    maxCashCrunchYear,
    buildingUsefulLife,
    equipmentUsefulLife
}) => {
    // デッドクロスが発生しない場合の安全な表示
    if (!hasDeadCross || !deadCrossYear) {
        return (
            <div className="p-5 rounded-2xl border border-[#e8dcc4] bg-[#fcf9f2]/70 backdrop-blur-md shadow-sm flex gap-4 items-start no-print">
                <div className="p-3 rounded-xl bg-[#1e3d2f]/10 text-[#1e3d2f]">
                    <Info className="h-6 w-6" />
                </div>
                <div>
                    <h4 className="font-bold text-[#23150d] text-base">デッドクロスのリスクはありません</h4>
                    <p className="text-sm text-[#8c6c59] mt-1">
                        このシミュレーション期間中、ローンの元金返済額が減価償却費を上回る現象（デッドクロス）は検出されませんでした。安定した手残りキャッシュフロー（ATCF）が期待できます。
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 rounded-2xl border border-rose-200 bg-[#fdfaf5] shadow-md flex flex-col md:flex-row gap-5 items-start transition-all duration-300 hover:shadow-lg no-print">
            {/* 警告アイコンエリア */}
            <div className="p-3.5 rounded-2xl bg-rose-50 text-[#a30000] flex-shrink-0 animate-pulse">
                <AlertTriangle className="h-7 w-7" />
            </div>
            
            {/* テキスト詳細情報 */}
            <div className="space-y-4 flex-1">
                <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-[#a30000] mb-2">
                        デッドクロス警告 (収支悪化リスク)
                    </span>
                    <h4 className="font-extrabold text-[#23150d] text-lg leading-snug">
                        運用第 <span className="text-[#a30000] text-2xl font-mono">{deadCrossYear}</span> 年目にデッドクロスが発生します！
                    </h4>
                    <p className="text-sm text-[#3d251a] mt-1 leading-relaxed">
                        設備部分の減価償却（耐用年数 {equipmentUsefulLife}年）が終了することで、経費として計上できる償却額がガクッと減少します。
                        これにより、帳簿上の利益（課税所得）が押し上げられ、**年間最大で約 {formatCurrency(maxTaxIncrease)}** の所得税・住民税が跳ね上がり、手残りキャッシュフロー（ATCF）が急激に圧迫される見込みです。
                    </p>
                </div>

                {/* 指標クイックビュー */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#fcf9f2] p-4 rounded-xl border border-[#ebd9c5] text-xs">
                    <div>
                        <span className="text-[#8c6c59] block">最も手残りが厳しくなる年</span>
                        <span className="font-bold text-[#23150d] text-sm font-mono">{maxCashCrunchYear} 年目</span>
                    </div>
                    <div>
                        <span className="text-[#8c6c59] block">償却期間 (設備 ｜ 建物)</span>
                        <span className="font-bold text-[#23150d] text-sm font-mono">{equipmentUsefulLife}年 ｜ {buildingUsefulLife}年</span>
                    </div>
                </div>

                {/* 凄腕コンサルタント推奨アドバイス */}
                <div className="flex gap-2.5 items-start bg-[#ebd9c5]/20 p-4 rounded-xl border border-[#e8dcc4] text-xs text-[#23150d]">
                    <Lightbulb className="h-5 w-5 text-[#a87c28] flex-shrink-0 mt-0.5" />
                    <div>
                        <span className="font-bold block text-[#8c6114] mb-1">💡 八洲建設 AIコンサルタント推奨対策アクション</span>
                        <ul className="list-disc list-inside space-y-1 text-[#3d251a]/90">
                            <li>設備の償却が終了する <span className="font-bold text-[#23150d]">第 {deadCrossYear - 1}〜{deadCrossYear}年目付近</span> での物件売却（出口戦略）を強く推奨します。</li>
                            <li>大規模修繕工事を前倒しで実施し、一括で経費（修繕費）化することで課税所得を圧縮します。</li>
                            <li>借入金の借換え（リファイナンス）を実行し、元金返済のペースをなだらかに調整します。</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
