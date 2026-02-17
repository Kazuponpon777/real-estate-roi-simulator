import React from 'react';
import type { SimulationData } from '../../stores/useSimulationStore';

interface ReportCoverProps {
    data: SimulationData;
}

export const ReportCover: React.FC<ReportCoverProps> = ({ data }) => {
    const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="report-page flex">
            {/* Left Brand Panel - Bright gradient */}
            <div className="w-[88mm] h-full bg-gradient-to-b from-blue-600 via-indigo-600 to-violet-700 flex flex-col justify-between p-10 text-white relative overflow-hidden flex-shrink-0">
                {/* Top Logo Area */}
                <div className="relative z-10">
                    <div className="w-10 h-10 border-2 border-white/40 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm bg-white/10">
                        <span className="text-lg font-bold">R</span>
                    </div>
                    <p className="text-white/70 tracking-[0.15em] text-[10px] uppercase leading-relaxed mt-2">
                        不動産投資<br />収支シミュレーション
                    </p>
                </div>

                {/* Main Title */}
                <div className="relative z-10">
                    <div className="w-12 h-[3px] bg-amber-400 mb-5"></div>
                    <p className="text-3xl font-light leading-tight tracking-tight text-white/90">
                        不動産事業
                    </p>
                    <p className="text-3xl font-bold leading-tight">
                        収支計画書
                    </p>
                </div>

                {/* Footer */}
                <div className="relative z-10">
                    <p className="text-white/40 text-[9px] tracking-wider uppercase">収支計画書</p>
                </div>

                {/* Decorative */}
                <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full border-[16px] border-white/[0.08]"></div>
                <div className="absolute top-24 -left-8 w-40 h-40 rounded-full border-[12px] border-white/[0.05]"></div>
            </div>

            {/* Right Content Panel */}
            <div className="flex-1 flex flex-col justify-between p-12 pl-16">
                {/* Date */}
                <div className="text-right">
                    <p className="text-blue-400 text-[10px] uppercase tracking-widest">発行日</p>
                    <p className="text-slate-600 text-sm font-medium">{today}</p>
                </div>

                {/* Main Content */}
                <div>
                    <p className="text-blue-600 font-bold text-[10px] uppercase tracking-[0.2em] mb-3">プロジェクト名</p>
                    <h2 className="text-4xl font-extrabold text-slate-800 leading-tight mb-8">
                        {data.title || '無題プロジェクト'}
                    </h2>
                    <div className="w-full h-px bg-gradient-to-r from-blue-200 via-indigo-200 to-transparent mb-8"></div>

                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-1">物件住所</p>
                            <p className="text-base text-slate-700 font-medium">{data.property.address || '未設定'}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-1">構造 / 総戸数</p>
                            <p className="text-base text-slate-700 font-medium">{data.property.structure}造 ／ {data.property.totalUnits}戸</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-1">敷地面積</p>
                            <p className="text-base text-slate-700 font-medium">{data.property.landAreaM2} ㎡</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-1">延床面積</p>
                            <p className="text-base text-slate-700 font-medium">{data.property.totalFloorAreaM2} ㎡</p>
                        </div>
                    </div>
                </div>

                {/* Bottom */}
                <div className="text-right">
                    <p className="text-slate-300 text-[9px] tracking-widest uppercase">シミュレーション目的であり、実際の結果を保証するものではありません</p>
                </div>
            </div>
        </div>
    );
};
