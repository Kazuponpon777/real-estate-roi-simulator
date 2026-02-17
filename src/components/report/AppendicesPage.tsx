
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
        const loadDocuments = async () => {
            if (!data.property.documents || data.property.documents.length === 0) {
                setLoading(false);
                return;
            }

            const loadedImages: { id: string; name: string; src: string; isPdfPage?: boolean }[] = [];

            for (const doc of data.property.documents) {
                try {
                    const file = await getFile(doc.id);
                    if (!file) continue;

                    if (file.type.startsWith('image/')) {
                        const src = URL.createObjectURL(file.data);
                        loadedImages.push({ id: doc.id, name: doc.name, src });
                    } else if (file.type === 'application/pdf') {
                        // Render PDF first page to image
                        const arrayBuffer = await file.data.arrayBuffer();
                        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

                        // Render first 2 pages max
                        const pagesToRender = Math.min(pdf.numPages, 2);

                        for (let i = 1; i <= pagesToRender; i++) {
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

            setImages(loadedImages);
            setLoading(false);
        };

        loadDocuments();
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

            {/* Footer */}
            <div className="mt-auto pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
                <span>不動産収支シミュレーション</span>
                <span>© 2026 Yashima Co., Ltd.</span>
            </div>
        </div>
    );
};
