
import React, { useEffect, useState } from 'react';
import type { SimulationData } from '../../stores/useSimulationStore';
import { MapDisplay } from '../ui/MapDisplay';
import { getFile } from '../../utils/fileStorage';
import * as pdfjsLib from 'pdfjs-dist';

// Worker setting is required for pdf.js
// We need to point to the worker file in public or node_modules
// For Vite, we can import the worker script URL
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface AppendicesPageProps {
    data: SimulationData;
    pageNumber?: number;
}

export const AppendicesPage: React.FC<AppendicesPageProps> = ({ data, pageNumber }) => {
    const [images, setImages] = useState<{ id: string; name: string; src: string; isPdfPage?: boolean }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 日本語コメント: アンマウント後の非同期描画によるメモリリークを防ぐマウント状態フラグ
        let isMounted = true;
        // 日本語コメント: メモリリークを完全に防止するため、生成された全てのBlob URLを追跡してクリーンアップします
        const createdUrls: string[] = [];

        const loadDocuments = async () => {
            if (!data.property.documents || data.property.documents.length === 0) {
                if (isMounted) {
                    setLoading(false);
                }
                return;
            }

            const loadedImages: { id: string; name: string; src: string; isPdfPage?: boolean }[] = [];

            for (const doc of data.property.documents) {
                if (!isMounted) break;
                try {
                    const file = await getFile(doc.id);
                    if (!file) continue;

                    if (file.type.startsWith('image/')) {
                        const src = URL.createObjectURL(file.data);
                        createdUrls.push(src);
                        loadedImages.push({ id: doc.id, name: doc.name, src });
                    } else if (file.type === 'application/pdf') {
                        // Render PDF first page to image
                        const arrayBuffer = await file.data.arrayBuffer();
                        if (!isMounted) break;
                        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

                        // Render first 2 pages max
                        const pagesToRender = Math.min(pdf.numPages, 2);

                        for (let i = 1; i <= pagesToRender; i++) {
                            if (!isMounted) break;
                            const page = await pdf.getPage(i);
                            const viewport = page.getViewport({ scale: 1.5 }); // High quality for print
                            const canvas = document.createElement('canvas');
                            const context = canvas.getContext('2d');
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;

                            if (context) {
                                const renderContext: any = {
                                    canvasContext: context,
                                    viewport: viewport
                                };
                                await page.render(renderContext).promise;
                                if (!isMounted) break;
                                loadedImages.push({
                                    id: `${doc.id}-p${i}`,
                                    name: `${doc.name} (p.${i})`,
                                    src: canvas.toDataURL('image/jpeg', 0.8),
                                    isPdfPage: true
                                });
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Failed to load document ${doc.name}:`, error);
                }
            }

            if (isMounted) {
                setImages(loadedImages);
                setLoading(false);
            }
        };

        loadDocuments();

        // 日本語コメント: クリーンアップ（アンマウント）時にマウント状態を解除し、生成されたBlob URLを全解放
        return () => {
            isMounted = false;
            createdUrls.forEach(url => {
                try {
                    URL.revokeObjectURL(url);
                } catch (e) {
                    console.error('Blob URLの解放に失敗しました:', e);
                }
            });
        };
    }, [data.property.documents]);

    return (
        <div className="w-full h-full p-8 flex flex-col relative print-page-break-before bg-white text-slate-800">
            {/* Header */}
            <div className="flex justify-between items-end border-b-2 border-slate-800 pb-2 mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">添付資料・地図</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">{data.title}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-400">作成日: {new Date().toLocaleDateString()}</p>
                    {pageNumber && <p className="text-xs font-bold text-slate-600">{pageNumber} ページ</p>}
                </div>
            </div>

            <div className="flex-grow space-y-8">
                {/* Map Section */}
                {data.property.address && (
                    <div className="break-inside-avoid">
                        <h2 className="text-lg font-bold border-l-4 border-indigo-600 pl-3 mb-4 bg-indigo-50 py-1">
                            現地案内図
                        </h2>
                        <div className="border border-slate-200 rounded-lg overflow-hidden h-96">
                            <MapDisplay address={data.property.address} className="h-full w-full" />
                        </div>
                        <p className="text-sm text-slate-600 mt-2 ml-1">📍 {data.property.address}</p>
                    </div>
                )}

                {/* Documents Section */}
                {images.length > 0 && (
                    <div className="space-y-6">
                        {images.map((img) => (
                            <div key={img.id} className="break-inside-avoid break-before-page-if-needed">
                                <h2 className="text-lg font-bold border-l-4 border-slate-600 pl-3 mb-4 bg-slate-50 py-1">
                                    {img.name}
                                </h2>
                                <div className="border border-slate-200 rounded-lg overflow-hidden flex justify-center bg-slate-50 p-4">
                                    <img
                                        src={img.src}
                                        alt={img.name}
                                        className="max-w-full max-h-[800px] object-contain shadow-sm bg-white"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {images.length === 0 && loading && (
                    <div className="text-center py-12 text-slate-400">
                        <p>資料を読み込んでいます...</p>
                    </div>
                )}
            </div>

            {/* Disclaimer Section */}
            <div className="mt-8 pt-6 border-t border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 mb-2">【免責事項・ご注意】</h3>
                <ul className="text-xs text-slate-500 list-disc list-inside space-y-1">
                    <li>本シミュレーション結果はあくまでも概算の提案であり、将来の収益を保証するものではありません。</li>
                    <li>税金や諸経費は一般的な税率や評価額をもとにした概算です。正確な数値については税理士等の専門家へご確認下さい。</li>
                    <li>事業開始後における地価や建築費、金利の変動、賃料や修繕費用の変化を完全に予想したものではありません。</li>
                    <li>本資料の著作権は八洲建設株式会社に帰属します。無断での複製・転載を禁じます。</li>
                </ul>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
                <span>不動産収支シミュレーション</span>
                <span>© 2026 Yashima Co., Ltd. (v1.3)</span>
            </div>
        </div>
    );
};
