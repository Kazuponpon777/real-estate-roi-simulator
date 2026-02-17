
import React, { useState } from 'react';
import type { PropertyDocument } from '../../stores/useSimulationStore';
import { saveFile, getFile, deleteFile } from '../../utils/fileStorage';
import { Button } from './Button';
import { FileText, Trash2, Eye, Plus, Loader2 } from 'lucide-react';

interface DocumentManagerProps {
    documents: PropertyDocument[];
    onAdd: (doc: PropertyDocument) => void;
    onDelete: (id: string) => void;
    className?: string;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
    documents,
    onAdd,
    onDelete,
    className
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const [viewingId, setViewingId] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        setIsUploading(true);
        try {
            const id = await saveFile(file);
            const newDoc: PropertyDocument = {
                id,
                name: file.name,
                type: file.type,
                size: file.size
            };
            onAdd(newDoc);
        } catch (error) {
            console.error('Failed to save file:', error);
            alert('ファイルの保存に失敗しました。');
        } finally {
            setIsUploading(false);
            // Reset input
            e.target.value = '';
        }
    };

    const handleView = async (doc: PropertyDocument) => {
        setViewingId(doc.id);
        try {
            const storedFile = await getFile(doc.id);
            if (storedFile && storedFile.data) {
                const url = URL.createObjectURL(storedFile.data);
                window.open(url, '_blank');
                // URL.revokeObjectURL(url); // Should handle cleanup, but for now let browser handle it on unload or create a specialized viewer
            } else {
                alert('ファイルが見つかりません。');
            }
        } catch (error) {
            console.error('Failed to load file:', error);
            alert('ファイルの読み込みに失敗しました。');
        } finally {
            setViewingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('このファイルを削除してもよろしいですか？')) return;
        try {
            await deleteFile(id);
            onDelete(id);
        } catch (error) {
            console.error('Failed to delete file:', error);
            alert('ファイルの削除に失敗しました。');
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className={`space-y-4 ${className}`}>
            <h3 className="text-sm font-bold text-slate-700">物件資料 (謄本・測量図など)</h3>

            <div className="space-y-2">
                {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="bg-blue-50 p-2 rounded-lg">
                                <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate" title={doc.name}>{doc.name}</p>
                                <p className="text-xs text-slate-500">{formatSize(doc.size)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleView(doc)}
                                disabled={viewingId === doc.id}
                                className="text-slate-600 hover:text-blue-600"
                            >
                                {viewingId === doc.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(doc.id)}
                                className="text-slate-400 hover:text-rose-600"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}

                {documents.length === 0 && (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                        資料は登録されていません
                    </div>
                )}
            </div>

            <div className="relative">
                <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.jpg,.jpeg,.png" // Limit to common formats
                />
                <label
                    htmlFor="file-upload"
                    className={`flex items-center justify-center gap-2 w-full p-3 rounded-lg border-2 border-dashed border-slate-300 text-slate-600 font-medium hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 cursor-pointer transition-all ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                    {isUploading ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            アップロード中...
                        </>
                    ) : (
                        <>
                            <Plus className="h-5 w-5" />
                            資料を追加する
                        </>
                    )}
                </label>
            </div>
            <p className="text-xs text-slate-500 text-center">
                ※ファイルはブラウザ内に保存されます (PDF, JPG, PNG)
            </p>
        </div>
    );
};
