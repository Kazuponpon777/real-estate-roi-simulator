import React, { useState } from 'react';

interface PrintLayoutProps {
    children: React.ReactNode;
    componentRef?: React.RefObject<HTMLDivElement>;
}

export const PrintLayout: React.FC<PrintLayoutProps> = ({ children }) => {
    const [showPreview, setShowPreview] = useState(false);

    return (
        <>
            {/* Trigger Button */}
            <button
                onClick={() => setShowPreview(true)}
                className="no-print inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors shadow-lg"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                PDFレポート作成
            </button>

            {/* Full-screen Preview Overlay */}
            {showPreview && (
                <div className="fixed inset-0 bg-slate-500/80 z-[9999] overflow-auto" id="report-preview-overlay">
                    {/* Top Bar */}
                    <div className="sticky top-0 z-50 bg-slate-900 text-white px-6 py-3 flex items-center justify-between shadow-xl no-print">
                        <span className="font-bold text-sm">プレビュー (A4横)</span>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    window.print();
                                }}
                                className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-500 font-medium"
                            >
                                印刷 / PDF保存
                            </button>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="px-4 py-1.5 bg-slate-700 text-white text-sm rounded-lg hover:bg-slate-600 font-medium"
                            >
                                閉じる
                            </button>
                        </div>
                    </div>

                    {/* Pages Container */}
                    <div className="flex flex-col items-center gap-8 py-8 px-4">
                        {children}
                    </div>
                </div>
            )}

            {/* Print-only: render pages directly */}
            <div className="hidden" id="report-print-area">
                {children}
            </div>

            <style>{`
                /* Screen Preview: show pages as cards */
                #report-preview-overlay .report-page {
                    width: 297mm;
                    height: 210mm;
                    background: white;
                    box-shadow: 0 4px 24px rgba(0,0,0,0.3);
                    overflow: hidden;
                    box-sizing: border-box;
                    padding: 12mm 16mm;
                    flex-shrink: 0;
                }

                @media print {
                    /* 日本語コメント: プレビュー画面（#report-preview-overlay）が存在する場合にのみ、大元の入力画面等を隠してレポートだけを印刷するための設定 */
                    body:has(#report-preview-overlay) #root {
                        visibility: hidden !important;
                    }
                    
                    body:has(#report-preview-overlay) #report-preview-overlay {
                        visibility: visible !important;
                        display: block !important;
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 297mm !important;
                        height: auto !important;
                        background: none !important;
                        overflow: visible !important;
                        box-shadow: none !important;
                    }
                    
                    body:has(#report-preview-overlay) #report-preview-overlay * {
                        visibility: visible !important;
                    }
                    
                    /* 日本語コメント: プレビュー画面内の印刷不要な要素（上部操作バー等）は完全に非表示にする */
                    body:has(#report-preview-overlay) .no-print,
                    body:has(#report-preview-overlay) .no-print * {
                        display: none !important;
                        visibility: hidden !important;
                    }
                    
                    body:has(#report-preview-overlay) #report-preview-overlay > div:last-of-type {
                        padding: 0 !important;
                        gap: 0 !important;
                    }

                    /* 日本語コメント: プレビュー画面がない場合の、通常の印刷専用エリアの設定 */
                    body:not(:has(#report-preview-overlay)) #root {
                        visibility: hidden !important;
                    }
                    body:not(:has(#report-preview-overlay)) #report-print-area {
                        visibility: visible !important;
                        display: block !important;
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 297mm !important;
                        height: auto !important;
                    }
                    body:not(:has(#report-preview-overlay)) #report-print-area * {
                        visibility: visible !important;
                    }

                    /* 日本語コメント: A4横サイズ（横297mm×縦210mm）の印刷ページ設定 */
                    @page {
                        size: 297mm 210mm;
                        margin: 0;
                    }
                    
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background-color: white !important;
                    }
                    
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    
                    /* 日本語コメント: 各レポートページの印刷設定（改ページ制御） */
                    .report-page {
                        width: 297mm !important;
                        height: 210mm !important;
                        padding: 12mm 16mm !important;
                        box-sizing: border-box !important;
                        page-break-after: always !important;
                        page-break-inside: avoid !important;
                        overflow: hidden !important;
                        box-shadow: none !important;
                        margin: 0 !important;
                        background: white !important;
                    }
                    
                    .report-page:last-child {
                        page-break-after: auto !important;
                    }
                }
            `}</style>
        </>
    );
};
