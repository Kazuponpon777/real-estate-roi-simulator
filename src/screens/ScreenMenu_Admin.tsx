import React, { useEffect, useState } from 'react';
import { useSimulationStore } from '../stores/useSimulationStore';
import { 
    User, 
    Shield, 
    Trash2, 
    Edit2, 
    ArrowLeft, 
    RefreshCw, 
    Mail, 
    Key, 
    UserPlus, 
    AlertTriangle,
    Loader2,
    ShieldAlert,
    CheckCircle2
} from 'lucide-react';
import { Button } from '../components/ui/Button';

export const ScreenMenu_Admin: React.FC = () => {
    const {
        usersList,
        isLoadingUsers,
        usersError,
        fetchUsersList,
        createUser,
        updateUser,
        deleteUser,
        currentUser,
        setViewMode
    } = useSimulationStore();

    // 状態管理
    const [activeTab, setActiveTab] = useState<'all' | 'employee' | 'external'>('all');
    const [searchQuery, setSearchQuery] = useState(''); // 日本語コメント: リアルタイム検索クエリ
    
    // モーダル制御
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    
    // フォーム入力値
    const [formEmail, setFormEmail] = useState('');
    const [formName, setFormName] = useState('');
    const [formPassword, setFormPassword] = useState('');
    const [formIsAdmin, setFormIsAdmin] = useState(false);
    
    // アクション処理中の状態
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // 日本語コメント: 編集中のユーザーの社員番号 (社員判別用)
    const [selectedUserEmpNum, setSelectedUserEmpNum] = useState<string | null>(null);
    const isEmployeeEdit = modalMode === 'edit' && selectedUserEmpNum !== null && !selectedUserEmpNum.startsWith('EX');

    // 日本語コメント: 初期表示時にユーザー一覧を取得
    useEffect(() => {
        fetchUsersList();
    }, []);

    // 日本語コメント: メッセージの自動消去
    useEffect(() => {
        if (actionMessage) {
            const timer = setTimeout(() => setActionMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [actionMessage]);

    // 日本語コメント: モーダルオープン（新規作成）
    const openCreateModal = () => {
        setModalMode('create');
        setSelectedUserId(null);
        setSelectedUserEmpNum(null);
        setFormEmail('');
        setFormName('');
        setFormPassword('');
        setFormIsAdmin(false);
        setActionMessage(null);
        setIsModalOpen(true);
    };

    // 日本語コメント: モーダルオープン（編集）
    const openEditModal = (user: any) => {
        setModalMode('edit');
        // 社員の場合はIDが数値ではない可能性があるため、EXで始まる社外パートナーのみIDを保持
        const isExt = user.employee_number && user.employee_number.startsWith('EX');
        setSelectedUserId(isExt && typeof user.id === 'number' ? user.id : null);
        setSelectedUserEmpNum(user.employee_number || null);
        setFormEmail(user.email || '');
        setFormName(user.name || '');
        setFormPassword(''); // パスワードは入力時のみ変更
        setFormIsAdmin(user.is_admin === true || user.is_admin === 1 || user.is_admin === '1');
        setActionMessage(null);
        setIsModalOpen(true);
    };

    // 日本語コメント: アカウント保存（登録・更新）の実行
    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setActionMessage(null);

        // バリデーション
        if (!formEmail.trim() || !formName.trim()) {
            setActionMessage({ type: 'error', text: 'メールアドレスと氏名は必須項目です。' });
            setIsSubmitting(false);
            return;
        }

        if (modalMode === 'create' && !formPassword) {
            setActionMessage({ type: 'error', text: '新規作成時はパスワードが必須です。' });
            setIsSubmitting(false);
            return;
        }

        let success = false;
        if (modalMode === 'create') {
            success = await createUser(formEmail, formName, formIsAdmin, formPassword);
            if (success) {
                setActionMessage({ type: 'success', text: 'アカウントを新規発行しました。' });
                setIsModalOpen(false);
            } else {
                setActionMessage({ type: 'error', text: usersError || 'アカウントの作成に失敗しました。' });
            }
        } else if (modalMode === 'edit') {
            if (isEmployeeEdit && selectedUserEmpNum) {
                // 日本語コメント: 社内社員の権限変更の実行 (idはnull, employee_numberを渡す)
                success = await updateUser(null, formEmail, formName, formIsAdmin, undefined, selectedUserEmpNum);
            } else if (selectedUserId !== null) {
                // 日本語コメント: 社外パートナーのアカウント更新
                success = await updateUser(selectedUserId, formEmail, formName, formIsAdmin, formPassword || undefined);
            }
            
            if (success) {
                setActionMessage({ type: 'success', text: 'アカウント情報を更新しました。' });
                setIsModalOpen(false);
            } else {
                setActionMessage({ type: 'error', text: usersError || 'アカウントの更新に失敗しました。' });
            }
        }

        setIsSubmitting(false);
    };

    // 日本語コメント: アカウント削除の実行
    const handleDeleteUser = async (id: number, name: string) => {
        if (window.confirm(`「${name}」のアカウントを完全に削除しますか？\nこの操作は取り消せません。`)) {
            setActionMessage(null);
            const success = await deleteUser(id);
            if (success) {
                setActionMessage({ type: 'success', text: 'アカウントを削除しました。' });
            } else {
                setActionMessage({ type: 'error', text: usersError || 'アカウントの削除に失敗しました。' });
            }
        }
    };

    // 日本語コメント: タブと検索クエリによるフィルタリング (null安全・型安全キャスト対策)
    const appUsersFiltered = (usersList.app_users || []).filter(u => {
        const name = String(u.name || '');
        const email = String(u.email || '');
        const empNum = String(u.employee_number || '');
        const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            empNum.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    const employeeUsersFiltered = (usersList.employee_users || []).filter(u => {
        const name = String(u.name || '');
        const email = String(u.email || '');
        const empNum = String(u.employee_number || '');
        const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            empNum.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    // 日本語コメント: 日付のフォーマット処理 (null安全・例外ガード)
    const formatDate = (dateStr: any) => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return String(dateStr);
            return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
        } catch (e) {
            return String(dateStr);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-2 py-6 relative z-10">
            {/* 親アニメーションによる fixed モーダルの位置ズレを防ぐため、コンテンツのみをアニメーションで囲む */}
            <div className="animate-in fade-in duration-300">
                {/* ヘッダー部 */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-[#e8dcc4] pb-8">
                    <div>
                        <button
                            onClick={() => setViewMode('menu')}
                            className="inline-flex items-center gap-1.5 text-xs text-[#8c6114] hover:text-[#23150d] font-semibold mb-4 transition-colors bg-white border border-[#e8dcc4] px-3.5 py-1.5 rounded-lg"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 text-[#a87c28]" />
                            お客様データ管理メニューへ戻る
                        </button>
                        <h1 className="text-3.5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#23150d] via-[#8c6114] to-[#a87c28] tracking-wide flex items-center gap-3">
                            <Shield className="w-8 h-8 text-[#a87c28]" />
                            ユーザー＆アカウント管理
                        </h1>
                        <p className="text-[#8c6114]/80 mt-2 text-sm font-medium">
                            社外ユーザーへのアカウント新規発行、および社内・社外ユーザーの権限一覧を確認・管理できます。
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Button
                            variant="outline"
                            onClick={fetchUsersList}
                            disabled={isLoadingUsers}
                            className="flex items-center justify-center gap-1.5 px-4 py-2.5 h-auto text-sm bg-white border-[#ebd9c5] hover:bg-[#ebd9c5]/30 text-[#8c6114] rounded-xl font-bold"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin' : ''} text-[#a87c28]`} />
                            リスト更新
                        </Button>
                        <Button
                            onClick={openCreateModal}
                            className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#aa7c11] to-[#8a5d3b] hover:from-[#bfa153] hover:to-[#a47b52] text-[#fdfaf5] rounded-xl shadow-md px-4.5 py-2.5 h-auto text-sm font-bold border-none active:scale-[0.98] transition-all tracking-wide"
                        >
                            <UserPlus className="w-4 h-4 text-[#fdfaf5]" />
                            社外アカウント新規発行
                        </Button>
                    </div>
                </div>

                {/* 通知メッセージ */}
                {actionMessage && (
                    <div className={`p-4 mb-6 rounded-xl border flex items-start gap-3 animate-in slide-in-from-top-4 duration-350 ${
                        actionMessage.type === 'success' 
                            ? 'bg-[#aa7c11]/15 border-[#d4af37]/35 text-[#8c6114]' 
                            : 'bg-rose-50 border border-rose-100 text-rose-700'
                    }`}>
                        {actionMessage.type === 'success' ? (
                            <CheckCircle2 className="w-5 h-5 shrink-0 text-[#a87c28] mt-0.5" />
                        ) : (
                            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                        )}
                        <span className="text-sm font-semibold">{actionMessage.text}</span>
                    </div>
                )}

                {/* メインカード */}
                <div className="bg-[#fcf9f2]/90 border border-[#e8dcc4] rounded-3xl shadow-lg relative overflow-hidden">
                    {/* 皮革のステッチ縫い目内枠 */}
                    <div className="absolute inset-1.5 border border-dashed border-[#e8dcc4]/55 rounded-[20px] pointer-events-none" />

                    {/* ツールバー */}
                    <div className="p-6 border-b border-[#e8dcc4] flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                        {/* タブ切り替え */}
                        <div className="flex bg-[#f5ebd9]/45 p-1 rounded-xl border border-[#e8dcc4]">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                                    activeTab === 'all'
                                        ? 'bg-[#fdfaf5] border border-[#e8dcc4] text-[#8c6114] shadow-sm'
                                        : 'text-[#8c6114]/60 hover:text-[#23150d]'
                                }`}
                            >
                                すべて表示 ({appUsersFiltered.length + employeeUsersFiltered.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('employee')}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                                    activeTab === 'employee'
                                        ? 'bg-[#fdfaf5] border border-[#e8dcc4] text-[#8c6114] shadow-sm'
                                        : 'text-[#8c6114]/60 hover:text-[#23150d]'
                                }`}
                            >
                                八洲建設 社内社員 ({employeeUsersFiltered.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('external')}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                                    activeTab === 'external'
                                        ? 'bg-[#fdfaf5] border border-[#e8dcc4] text-[#8c6114] shadow-sm'
                                        : 'text-[#8c6114]/60 hover:text-[#23150d]'
                                }`}
                            >
                                社外パートナー ({appUsersFiltered.length})
                            </button>
                        </div>

                        {/* 日本語コメント: リアルタイム検索フォーム */}
                        <form 
                            onSubmit={(e) => e.preventDefault()} 
                            className="relative w-full md:max-w-xs"
                        >
                            <div className="relative w-full">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <User className="h-4 w-4 text-[#8c6114]/60" />
                                </span>
                                <input
                                    type="text"
                                    placeholder="名前、メール、ID..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setSearchQuery(val);
                                        if (val.trim() !== '') {
                                            setActiveTab('all'); // 検索時は「すべて表示」にする
                                        }
                                    }}
                                    className="w-full pl-9.5 pr-4 py-2 bg-white border border-[#e8dcc4] rounded-xl text-sm text-[#23150d] placeholder-[#8c7466] focus:outline-none focus:ring-2 focus:ring-[#a87c28]/20 focus:border-[#a87c28] transition-all font-medium"
                                />
                            </div>
                        </form>
                    </div>

                    {/* テーブル本体 */}
                    <div className="overflow-x-auto relative z-10 bg-white/50">
                        {isLoadingUsers ? (
                            <div className="py-20 flex flex-col items-center justify-center bg-white/80">
                                <Loader2 className="w-10 h-10 text-[#a87c28] animate-spin mb-4" />
                                <p className="text-[#8c6114] text-sm font-medium animate-pulse">ユーザーデータを取得中...</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#f5ebd9]/30 text-[#8c6114]/85 font-bold text-xs uppercase tracking-widest border-b border-[#e8dcc4]">
                                        <th className="py-4.5 px-6 font-bold text-[#8c6114]">氏名</th>
                                        <th className="py-4.5 px-6 font-bold text-[#8c6114]">メールアドレス</th>
                                        <th className="py-4.5 px-6 font-bold text-[#8c6114] w-36">アカウント番号</th>
                                        <th className="py-4.5 px-6 font-bold text-[#8c6114] w-36">区分</th>
                                        <th className="py-4.5 px-6 font-bold text-[#8c6114] w-32">権限</th>
                                        <th className="py-4.5 px-6 font-bold text-[#8c6114] w-36">発行日</th>
                                        <th className="py-4.5 px-6 font-bold text-[#8c6114] w-32 text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* 1. 社外パートナー (app_users) */}
                                    {(activeTab === 'all' || activeTab === 'external') && appUsersFiltered.map((u, idx) => (
                                        <tr key={`ext-${u.id || idx}`} className="border-b border-[#e8dcc4]/55 hover:bg-[#f5ebd9]/20 transition-colors">
                                            <td className="py-4.5 px-6 font-bold text-[#23150d]">{u.name}</td>
                                            <td className="py-4.5 px-6 text-[#8c6114]/90 text-sm">{u.email}</td>
                                            <td className="py-4.5 px-6 font-mono text-[#23150d] text-xs font-bold">{u.employee_number}</td>
                                            <td className="py-4.5 px-6">
                                                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold bg-[#251810]/70 text-[#fcf5e3] border-[#d4af37]/20">
                                                    社外パートナー
                                                </span>
                                            </td>
                                            <td className="py-4.5 px-6">
                                                {(u.is_admin === true || u.is_admin === 1 || u.is_admin === '1') ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#a87c28]">
                                                        <Shield className="w-3.5 h-3.5" />
                                                        管理者
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-medium text-[#8c6114]/60">一般作業者</span>
                                                )}
                                            </td>
                                            <td className="py-4.5 px-6 text-[#8c6114]/50 text-xs font-medium">{formatDate(u.created_at)}</td>
                                            <td className="py-4.5 px-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditModal(u)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#8c6114] hover:text-[#23150d] bg-[#ebd9c5]/60 hover:bg-[#ebd9c5] border border-[#e8dcc4] rounded-xl transition-all"
                                                        title="アカウント情報編集"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                        編集
                                                    </button>
                                                    {currentUser?.employee_number !== u.employee_number && (
                                                        <button
                                                            onClick={() => handleDeleteUser(u.id, u.name)}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all"
                                                            title="アカウント削除"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            削除
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {/* 2. 社内社員 (employee_users) */}
                                    {(activeTab === 'all' || activeTab === 'employee') && employeeUsersFiltered.map((u, idx) => (
                                        <tr key={`emp-${u.employee_number || u.id || idx}`} className="border-b border-[#e8dcc4]/55 hover:bg-[#f5ebd9]/20 transition-colors opacity-95">
                                            <td className="py-4.5 px-6 font-bold text-[#23150d]">{u.name}</td>
                                            <td className="py-4.5 px-6 text-[#8c6114]/80 text-sm">{u.email || '-'}</td>
                                            <td className="py-4.5 px-6 font-mono text-[#8c6114]/80 text-xs font-bold">{u.employee_number}</td>
                                            <td className="py-4.5 px-6">
                                                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold bg-[#aa7c11]/15 text-[#fcf5e3] border-[#d4af37]/25">
                                                    八洲建設 社員
                                                </span>
                                            </td>
                                            <td className="py-4.5 px-6">
                                                {(u.is_admin === true || u.is_admin === 1 || u.is_admin === '1') ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#a87c28]">
                                                        <Shield className="w-3.5 h-3.5" />
                                                        管理者
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-medium text-[#8c6114]/60">一般作業者</span>
                                                )}
                                            </td>
                                            <td className="py-4.5 px-6 text-[#8c6114]/40 text-xs">-</td>
                                            <td className="py-4.5 px-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditModal(u)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#8c6114] hover:text-[#23150d] bg-[#ebd9c5]/60 hover:bg-[#ebd9c5] border border-[#e8dcc4] rounded-xl transition-all"
                                                        title="権限設定変更"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                        権限変更
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div> {/* animate-in fade-in の閉じタグ */}

            {/* 新規発行 / 編集モーダル */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0503]/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#2b170e] border border-[#d4af37]/35 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 relative text-[#fcf5e3]">
                        {/* 皮革のステッチ縫い目内枠 */}
                        <div className="absolute inset-1.5 border border-dashed border-[#d4af37]/20 rounded-[12px] pointer-events-none" />

                        {/* モーダルヘッダー */}
                        <div className="p-6 border-b border-[#d4af37]/15 flex items-center justify-between relative z-10 bg-[#0a0503]/20">
                            <h3 className="text-lg font-serif font-bold text-[#fcf5e3] flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5 text-[#d4af37]" />
                                {modalMode === 'create' ? '社外アカウントの新規発行' : isEmployeeEdit ? '社内社員の権限変更' : 'アカウント情報の編集'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-[#fcf5e3]/65 hover:text-white text-sm font-semibold p-1"
                            >
                                ✕
                            </button>
                        </div>

                        {/* モーダルフォーム */}
                        <form onSubmit={handleSaveUser} className="relative z-10">
                            <div className="p-6 space-y-4">
                                {/* 氏名入力 */}
                                <div>
                                    <label className="block text-xs font-bold text-[#fcf5e3]/80 mb-1.5 uppercase tracking-wider">氏名</label>
                                    <input
                                        type="text"
                                        required
                                        disabled={isEmployeeEdit}
                                        placeholder="例：山田 太郎"
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        className={`w-full px-3.5 py-2 bg-[#0a0503]/60 border border-[#d4af37]/20 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/20 focus:border-[#d4af37]/50 ${isEmployeeEdit ? 'bg-slate-900/60 text-slate-500 cursor-not-allowed border-[#d4af37]/10' : ''}`}
                                    />
                                </div>

                                {/* メールアドレス */}
                                <div>
                                    <label className="block text-xs font-bold text-[#fcf5e3]/80 mb-1.5 uppercase tracking-wider">メールアドレス (ログインID)</label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Mail className="h-4 w-4 text-[#fcf5e3]/50" />
                                        </span>
                                        <input
                                            type="email"
                                            required
                                            disabled={isEmployeeEdit}
                                            placeholder="example@example.com"
                                            value={formEmail}
                                            onChange={(e) => setFormEmail(e.target.value)}
                                            className={`w-full pl-9.5 pr-3.5 py-2 bg-[#0a0503]/60 border border-[#d4af37]/20 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/20 focus:border-[#d4af37]/50 ${isEmployeeEdit ? 'bg-slate-900/60 text-slate-500 cursor-not-allowed border-[#d4af37]/10' : ''}`}
                                        />
                                    </div>
                                </div>

                                {/* パスワード (社内社員の場合は入力不要) */}
                                {!isEmployeeEdit && (
                                    <div>
                                        <label className="block text-xs font-bold text-[#fcf5e3]/80 mb-1.5 uppercase tracking-wider">
                                            パスワード
                                            {modalMode === 'edit' && <span className="text-[10px] text-[#fcf5e3]/60 font-normal ml-1.5">（変更する場合のみ入力）</span>}
                                        </label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Key className="h-4 w-4 text-[#fcf5e3]/50" />
                                            </span>
                                            <input
                                                type="password"
                                                required={modalMode === 'create'}
                                                placeholder={modalMode === 'create' ? "任意のパスワード" : "••••••••"}
                                                value={formPassword}
                                                onChange={(e) => setFormPassword(e.target.value)}
                                                className="w-full pl-9.5 pr-3.5 py-2 bg-[#0a0503]/60 border border-[#d4af37]/20 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/20 focus:border-[#d4af37]/50"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* 権限設定 */}
                                <div>
                                    <label className="block text-xs font-bold text-[#fcf5e3]/80 mb-1.5 uppercase tracking-wider">利用権限</label>
                                    <select
                                        value={formIsAdmin ? 'admin' : 'worker'}
                                        onChange={(e) => setFormIsAdmin(e.target.value === 'admin')}
                                        className="w-full px-3.5 py-2 bg-[#0a0503]/60 border border-[#d4af37]/20 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/20 focus:border-[#d4af37]/50"
                                    >
                                        <option value="worker" className="bg-[#2b170e]">一般作業者</option>
                                        <option value="admin" className="bg-[#2b170e]">管理者</option>
                                    </select>
                                    <p className="text-[11px] text-[#fcf5e3]/60 mt-1.5 leading-relaxed">
                                        ※管理者はすべてのシミュレーションデータの閲覧、およびアカウント管理（発行・編集・削除）が可能です。
                                    </p>
                                </div>
                            </div>

                            {/* モーダルフッター */}
                            <div className="p-6 bg-[#0a0503]/30 border-t border-[#d4af37]/15 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-sm font-bold text-[#fcf5e3]/80 hover:text-white transition-colors"
                                >
                                    キャンセル
                                </button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-gradient-to-r from-[#aa7c11] to-[#8a5d3b] hover:from-[#bfa153] hover:to-[#a47b52] text-[#fdfaf5] rounded-xl shadow-md px-5 py-2.5 h-auto text-sm font-bold border-none flex items-center gap-1.5"
                                >
                                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin text-[#fdfaf5]" />}
                                    {modalMode === 'create' ? '発行する' : '保存する'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
