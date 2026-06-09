import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface PrintLayoutProps {
    children: React.ReactNode;
    componentRef?: React.RefObject<HTMLDivElement>;
}

export const PrintLayout: React.FC<PrintLayoutProps> = ({ children }) => {
    const [showPreview, setShowPreview] = useState(false);
    // 日本語コメント: body直下にポータル用のコンテナを作成・管理するためのState
    const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);

    // 日本語コメント: コンポーネントのマウント時に、body直下に印刷専用のコンテナ（div）を作成する
    // これにより、#root の外側に印刷用エリアが配置され、#root を非表示にしてもレポートは影響を受けない
    useEffect(() => {
        const container = document.createElement('div');
        container.id = 'report-print-portal';
        document.body.appendChild(container);
        setPortalContainer(container);

        // 日本語コメント: コンポーネントのアンマウント時にコンテナを削除する
        return () => {
            document.body.removeChild(container);
        };
    }, []);

    return (
        <>
            {/* 日本語コメント: PDFレポート作成ボタン（画面に常時表示、印刷時は非表示） */}
            <button
                onClick={() => setShowPreview(true)}
                className="no-print inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors shadow-lg"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                PDFレポート作成
            </button>

            {/* 日本語コメント: プレビュー画面（画面上でのみ表示。印刷時は非表示になる） */}
            {showPreview && (
                <div className="fixed inset-0 bg-slate-500/80 z-[9999] overflow-auto no-print" id="report-preview-overlay">
                    {/* 日本語コメント: 上部操作バー */}
                    <div className="sticky top-0 z-50 bg-slate-900 text-white px-6 py-3 flex items-center justify-between shadow-xl">
                        <span className="font-bold text-sm">プレビュー (A4横)</span>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    // 日本語コメント: 印刷ボタンを押すと、ブラウザの印刷ダイアログを開く
                                    // 印刷用コンテンツは #root の外側（body直下のポータル）にあるため、
                                    // CSSで #root を非表示にするだけでレポートだけが印刷される
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

                    {/* 日本語コメント: プレビュー表示用のページコンテナ */}
                    <div className="flex flex-col items-center gap-8 py-8 px-4">
                        {children}
                    </div>
                </div>
            )}

            {/* 日本語コメント: 印刷専用エリア（ReactポータルでBody直下に配置される）
                画面上では非表示（display:none）、印刷時のみ表示（display:block）される。
                #root の外側にあるため、#root を display:none にしても影響を受けない。 */}
            {portalContainer && createPortal(
                <div id="report-print-area">
                    {children}
                </div>,
                portalContainer
            )}

            <style>{`
                /* 日本語コメント: 画面プレビュー用：各ページをA4横サイズのカードとして表示 */
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

                /* 日本語コメント: 印刷専用エリアは画面上では完全に非表示にする */
                #report-print-portal {
                    display: none;
                }

                @media print {
                    /* 日本語コメント: 印刷時は #root（アプリ全体）を完全に非表示にする。
                       印刷用エリア（#report-print-portal）は #root の外側（body直下）にあるため、
                       この指定の影響を一切受けない。これが根本的な解決策。 */
                    #root {
                        display: none !important;
                    }
                    
                    /* 日本語コメント: 印刷専用エリアを表示する */
                    #report-print-portal {
                        display: block !important;
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
