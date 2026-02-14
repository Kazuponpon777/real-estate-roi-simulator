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
                <div className="fixed inset-0 bg-slate-500/80 z-[9999] overflow-auto no-print" id="report-preview-overlay">
                    {/* Top Bar */}
                    <div className="sticky top-0 z-50 bg-slate-900 text-white px-6 py-3 flex items-center justify-between shadow-xl no-print">
                        <span className="font-bold text-sm">PDF Report Preview (A4 Landscape)</span>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    const overlay = document.getElementById('report-preview-overlay');
                                    if (overlay) overlay.classList.add('printing');
                                    window.print();
                                    setTimeout(() => {
                                        if (overlay) overlay.classList.remove('printing');
                                    }, 500);
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
                    /* Hide everything */
                    body > * {
                        display: none !important;
                    }
                    body > #root {
                        display: block !important;
                    }
                    #root > * {
                        display: none !important;
                    }
                    
                    /* Show only report print area */
                    #report-print-area {
                        display: block !important;
                    }
                    
                    /* Also allow overlay printing */
                    #report-preview-overlay.printing {
                        display: block !important;
                        position: static !important;
                        background: none !important;
                        overflow: visible !important;
                    }
                    #report-preview-overlay.printing .no-print {
                        display: none !important;
                    }
                    #report-preview-overlay.printing > div:last-of-type {
                        padding: 0 !important;
                        gap: 0 !important;
                    }

                    @page {
                        size: 297mm 210mm;
                        margin: 0;
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .no-print {
                        display: none !important;
                    }
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
                    }
                    .report-page:last-child {
                        page-break-after: auto !important;
                    }
                }
            `}</style>
        </>
    );
};
