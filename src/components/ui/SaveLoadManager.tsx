import React, { useState, useEffect } from 'react';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { Button } from './Button';
import { Save, FolderOpen, Trash2, X, Loader2, RefreshCw } from 'lucide-react';

export const SaveLoadManager: React.FC = () => {
    const {
        data,
        savedList,
        currentUser,
        isSaving,
        isLoadingList,
        isLoadingData,
        saveError,
        loadError,
        listError,
        fetchSavedList,
        saveSimulation,
        loadSimulation,
        deleteSimulation,
        clearErrors
    } = useSimulationStore();

    // モーダルの状態管理
    const [isSaveOpen, setIsSaveOpen] = useState(false);
    const [isLoadOpen, setIsLoadOpen] = useState(false);
    const [titleInput, setTitleInput] = useState('');
    const [isNewSave, setIsNewSave] = useState(false); // 上書き or 新規保存

    // 現在のシミュレーションデータのタイトルを初期値として設定
    useEffect(() => {
        if (isSaveOpen) {
            setTitleInput(data.title || '新規シミュレーション');
            setIsNewSave(!data.id); // IDがなければ強制的に新規保存
            clearErrors();
        }
    }, [isSaveOpen, data.id, data.title]);

    useEffect(() => {
        if (isLoadOpen) {
            fetchSavedList();
            clearErrors();
        }
    }, [isLoadOpen]);

    // 保存処理のハンドラ
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!titleInput.trim()) return;

        // 新規保存の場合は、store側のデータIDを一時的に消して保存させる
        if (isNewSave && data.id) {
            // 一時的にIDを取り除いて保存するため、状態を一旦クローン
            useSimulationStore.setState((state) => ({
                data: { ...state.data, id: undefined }
            }));
        }

        const success = await saveSimulation(titleInput.trim());
        if (success) {
            setIsSaveOpen(false);
        }
    };

    // 読み込み処理のハンドラ
    const handleLoad = async (id: number) => {
        await loadSimulation(id);
        setIsLoadOpen(false);
    };

    // 削除処理のハンドラ
    const handleDelete = async (e: React.MouseEvent, id: number, title: string) => {
        e.stopPropagation(); // 行クリックの読み込み処理を防止
        if (window.confirm(`「${title}」のシミュレーションデータを完全に削除しますか？`)) {
            await deleteSimulation(id);
        }
    };

    // モード表示用のバッジヘルパー
    const renderModeBadge = (mode: string) => {
        switch (mode) {
            case 'land_new':
                return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[#aa7c11]/15 text-[#fcf5e3] border border-[#d4af37]/25">土地から新築</span>;
            case 'investment_used':
                return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[#8a5d3b]/20 text-[#fcf5e3] border border-[#c5a880]/25">中古投資</span>;
            case 'land_lease':
                return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[#251810]/60 text-[#fcf5e3] border border-[#d4af37]/20">借地リース</span>;
            default:
                return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-350 border border-slate-700">{mode}</span>;
        }
    };

    // 日付フォーマットヘルパー
    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="flex items-center gap-2 no-print">
            {/* 保存ボタン */}
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSaveOpen(true)}
                className="flex items-center gap-1.5 border-[#e8dcc4] hover:border-[#ebd9c5] hover:bg-[#ebd9c5]/30 text-[#8c6114] bg-[#fdfaf5]/40"
            >
                <Save className="w-4 h-4 text-[#8c6114]" />
                <span>保存</span>
                {data.id && <span className="w-1.5 h-1.5 bg-[#a87c28] rounded-full" title="サーバー同期中" />}
            </Button>

            {/* 開くボタン */}
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLoadOpen(true)}
                className="flex items-center gap-1.5 border-[#e8dcc4] hover:border-[#ebd9c5] hover:bg-[#ebd9c5]/30 text-[#8c6114] bg-[#fdfaf5]/40"
            >
                <FolderOpen className="w-4 h-4 text-[#8c6114]" />
                <span>開く</span>
            </Button>

            {/* --- 保存ダイアログ (モーダル) --- */}
            {/* 明るく美しいクリームベージュ背景とゴールド枠線で視認性を最大化 */}
            {isSaveOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0a0503]/60 backdrop-blur-sm animate-fade-in p-4">
                    <div className="bg-[#fcf9f2] rounded-2xl shadow-2xl border-2 border-[#ebd9c5] w-full max-w-md overflow-hidden transform transition-all scale-100 p-6 relative text-[#23150d]">
                        {/* 皮革のステッチ縫い目内枠（明るいゴールド調） */}
                        <div className="absolute inset-1.5 border border-dashed border-[#ebd9c5] rounded-[12px] pointer-events-none" />

                        <div className="flex items-center justify-between border-b border-[#ebd9c5] pb-4 mb-4 relative z-10">
                            <h3 className="text-lg font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#8c6114] to-[#a87c28] flex items-center gap-2">
                                <Save className="w-5 h-5 text-[#a87c28]" />
                                <span>シミュレーションの保存</span>
                            </h3>
                            <button
                                onClick={() => setIsSaveOpen(false)}
                                className="text-[#8c6114] hover:text-[#23150d] rounded-lg p-1 hover:bg-[#ebd9c5]/25 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4 relative z-10">
                            {/* 上書き or 新規保存のトグル */}
                            {data.id && (
                                <div className="bg-[#ebd9c5]/15 p-2.5 rounded-lg border border-[#ebd9c5] flex items-center justify-around gap-2 text-sm">
                                    <label className="flex items-center gap-2 cursor-pointer font-bold text-[#3d251a]">
                                        <input
                                            type="radio"
                                            checked={!isNewSave}
                                            onChange={() => setIsNewSave(false)}
                                            className="text-[#a87c28] focus:ring-[#a87c28]/40"
                                        />
                                        <span>上書き保存</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer font-bold text-[#3d251a]">
                                        <input
                                            type="radio"
                                            checked={isNewSave}
                                            onChange={() => setIsNewSave(true)}
                                            className="text-[#a87c28] focus:ring-[#a87c28]/40"
                                        />
                                        <span>新規コピー保存</span>
                                    </label>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-[#8c6114] mb-1.5 uppercase tracking-wider">
                                    シミュレーション名 <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={titleInput}
                                    onChange={(e) => setTitleInput(e.target.value)}
                                    placeholder="例: 八洲計画ビルA棟シミュレーション"
                                    className="w-full px-3.5 py-2.5 bg-white border border-[#ebd9c5] rounded-xl text-[#23150d] text-sm placeholder-[#8c6c59] focus:outline-none focus:ring-2 focus:ring-[#a87c28]/20 focus:border-[#a87c28] transition-all font-semibold shadow-sm"
                                    maxLength={100}
                                />
                            </div>

                            {saveError && (
                                <div className="p-3 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg font-bold">
                                    ⚠️ {saveError}
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#ebd9c5]">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsSaveOpen(false)}
                                    className="px-4 py-2 text-sm border-[#ebd9c5] text-[#3d251a] hover:bg-[#ebd9c5]/20 font-bold"
                                >
                                    キャンセル
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    isLoading={isSaving}
                                    className="px-5 py-2 text-sm bg-gradient-to-r from-[#aa7c11] to-[#8a5d3b] hover:from-[#bfa153] hover:to-[#a47b52] text-[#fdfaf5] border-none font-bold shadow-md hover:shadow-lg"
                                >
                                    保存する
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- 開く・一覧ダイアログ (モーダル) --- */}
            {/* 明るく美しいクリームベージュ背景とゴールド枠線で一貫化 */}
            {isLoadOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0a0503]/60 backdrop-blur-sm animate-fade-in p-4">
                    <div className="bg-[#fcf9f2] rounded-2xl shadow-2xl border-2 border-[#ebd9c5] w-full max-w-2xl overflow-hidden transform transition-all scale-100 p-6 flex flex-col max-h-[85vh] relative text-[#23150d]">
                        {/* 皮革のステッチ縫い目内枠（明るいゴールド調） */}
                        <div className="absolute inset-1.5 border border-dashed border-[#ebd9c5] rounded-[12px] pointer-events-none" />

                        <div className="flex items-center justify-between border-b border-[#ebd9c5] pb-4 mb-4 relative z-10">
                            <h3 className="text-lg font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#8c6114] to-[#a87c28] flex items-center gap-2">
                                <FolderOpen className="w-5 h-5 text-[#a87c28]" />
                                <span>シミュレーションデータ一覧</span>
                            </h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={fetchSavedList}
                                    disabled={isLoadingList}
                                    title="一覧を更新"
                                    className="text-[#8c6114] hover:text-[#23150d] rounded-lg p-1 hover:bg-[#ebd9c5]/25 disabled:opacity-50 transition-colors"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isLoadingList ? 'animate-spin' : ''} text-[#a87c28]`} />
                                </button>
                                <button
                                    onClick={() => setIsLoadOpen(false)}
                                    className="text-[#8c6114] hover:text-[#23150d] rounded-lg p-1 hover:bg-[#ebd9c5]/25 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* エラー表示 */}
                        {listError && (
                            <div className="p-3 mb-4 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg font-bold relative z-10">
                                ⚠️ 一覧の取得に失敗しました: {listError}
                            </div>
                        )}
                        {loadError && (
                            <div className="p-3 mb-4 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg font-bold relative z-10">
                                ⚠️ 処理エラー: {loadError}
                            </div>
                        )}

                        {/* 一覧リストエリア（白背景プレート） */}
                        <div className="flex-1 overflow-y-auto min-h-[300px] bg-white border border-[#ebd9c5] rounded-lg divide-y divide-[#ebd9c5] relative z-10">
                            {isLoadingList ? (
                                <div className="flex flex-col items-center justify-center py-20 text-[#8c6114]/60 gap-2">
                                    <Loader2 className="w-8 h-8 animate-spin text-[#a87c28]" />
                                    <span className="text-sm font-bold">データを読み込み中...</span>
                                </div>
                            ) : savedList.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-[#8c6114]/65">
                                    <span className="text-sm font-bold">保存されたシミュレーションはありません。</span>
                                    <span className="text-xs text-[#8c6114]/50 mt-1 font-semibold">「保存」ボタンから現在のデータを保存してください。</span>
                                </div>
                            ) : (
                                savedList.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleLoad(item.id)}
                                        className="flex items-center justify-between p-4 hover:bg-[#ebd9c5]/20 cursor-pointer transition-colors group"
                                    >
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                                                {renderModeBadge(item.mode)}
                                                <h4 className="font-bold text-[#23150d] truncate text-sm sm:text-base group-hover:text-[#8c6114] transition-colors flex items-center gap-2">
                                                    <span>{item.title}</span>
                                                    {currentUser?.is_admin && item.creator_name && (
                                                        <span className="text-xs font-semibold text-[#3d251a]/80 bg-[#ebd9c5]/15 px-2 py-0.5 rounded-md border border-[#ebd9c5]/30">
                                                            作成者: {item.creator_name} ({item.created_by})
                                                        </span>
                                                    )}
                                                </h4>
                                            </div>
                                            <div className="text-xs text-[#8c6114]/80 flex items-center gap-3 font-semibold">
                                                <span>ID: #{item.id}</span>
                                                <span>更新日: {formatDate(item.updated_at)}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => handleDelete(e, item.id, item.title)}
                                                className="text-[#8c6114]/65 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl p-2 transition-colors"
                                                title="削除する"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {isLoadingData && (
                            <div className="absolute inset-0 bg-[#fdfaf5]/85 backdrop-blur-[1px] flex items-center justify-center z-20 rounded-2xl">
                                <div className="flex flex-col items-center gap-2 bg-white px-6 py-4 rounded-xl shadow-lg border border-[#ebd9c5]">
                                    <Loader2 className="w-6 h-6 animate-spin text-[#a87c28]" />
                                    <span className="text-sm font-bold text-[#23150d]">データ読込中...</span>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-4 mt-4 border-t border-[#ebd9c5] relative z-10">
                            <Button
                                variant="outline"
                                onClick={() => setIsLoadOpen(false)}
                                className="px-5 py-2 text-sm border-[#ebd9c5] text-[#3d251a] hover:bg-[#ebd9c5]/20 font-bold"
                            >
                                閉じる
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
