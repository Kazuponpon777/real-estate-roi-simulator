import React, { useState } from 'react';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { Button } from './Button';
import { Lock, Mail, ArrowRight } from 'lucide-react';

interface LoginScreenProps {
    onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
    const { login, isAuthenticating, authError } = useSimulationStore();
    const [emailInput, setEmailInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        if (!emailInput.trim()) {
            setLocalError('メールアドレスまたはログインIDを入力してください。');
            return;
        }
        if (!passwordInput) {
            setLocalError('パスワードを入力してください。');
            return;
        }

        const success = await login(emailInput.trim(), passwordInput);
        if (success) {
            if (onLoginSuccess) {
                onLoginSuccess();
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#fdfaf5] font-sans relative overflow-hidden select-none bg-[radial-gradient(#a87c2808_1px,transparent_1px)] [background-size:24px_24px]">
            {/* 上品なブロンズ・ゴールドグロー効果 */}
            <div className="absolute top-[-20%] left-[-20%] w-[800px] h-[800px] rounded-full bg-[#d4af37]/2 blur-[150px] pointer-events-none animate-pulse duration-10000" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[800px] h-[800px] rounded-full bg-[#aa7c11]/2.5 blur-[150px] pointer-events-none animate-pulse duration-8000" />

            <div className="w-full max-w-md p-6 z-10 animate-in fade-in zoom-in-95 duration-500">
                {/* ロゴ・ヘッダー */}
                <div className="text-center mb-9">
                    {/* ゴールドメタル調エンブレム */}
                    <div className="w-16 h-16 bg-gradient-to-tr from-[#aa7c11] via-[#d4af37] to-[#f3e7c4] rounded-2xl flex items-center justify-center text-[#1c120c] font-serif font-black text-3.5xl mx-auto shadow-[0_10px_30px_rgba(212,175,55,0.15)] mb-5 border border-[#f3e7c4]/30 transform hover:scale-105 transition-transform duration-300">
                        Y
                    </div>
                    {/* セリフ体を使用した高級感のある文字表現 (背景に埋没しないハッキリした色合い) */}
                    <h2 className="text-3.5xl font-serif font-bold text-[#23150d] tracking-wide">
                        Yashima <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8c6114] to-[#a87c28]">ROI Simulator</span>
                    </h2>
                    <p className="text-[10px] text-[#8c6114] mt-2 font-bold tracking-[0.25em] uppercase font-sans">
                        不動産収支シミュレーション管理システム
                    </p>
                </div>

                {/* プレミアム・クリーム調のカード（内側にステッチ加工のダッシュ線を配置） */}
                <div className="relative bg-[#fdfaf5]/95 border border-[#e8dcc4] rounded-3xl shadow-[0_25px_60px_-12px_rgba(43,23,14,0.15)] p-9 hover:border-[#d4af37]/45 transition-all duration-500 overflow-hidden">
                    {/* 上品な縫い目（ステッチ）を模したダッシュボーダー */}
                    <div className="absolute inset-1.5 border border-dashed border-[#d4af37]/30 rounded-[20px] pointer-events-none" />

                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        {/* メールアドレス入力 */}
                        <div>
                            <label className="block text-[10px] font-bold text-[#8c6114] uppercase tracking-widest mb-2.5 font-sans">
                                メールアドレス / ログインID
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-4.5 w-4.5 text-[#8c6114]/60" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={emailInput}
                                    onChange={(e) => setEmailInput(e.target.value)}
                                    placeholder="example@yashimaltd.com"
                                    className="block w-full pl-12 pr-4 py-3.5 bg-white border border-[#e8dcc4] rounded-xl text-[#23150d] text-sm placeholder-[#a88a76] focus:outline-none focus:ring-2 focus:ring-[#d4af37]/25 focus:border-[#d4af37]/50 focus:shadow-[0_0_15px_rgba(212,175,55,0.08)] transition-all font-medium"
                                />
                            </div>
                        </div>

                        {/* パスワード入力 */}
                        <div>
                            <label className="block text-[10px] font-bold text-[#8c6114] uppercase tracking-widest mb-2.5 font-sans">
                                パスワード
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-4.5 w-4.5 text-[#8c6114]/60" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={passwordInput}
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                    placeholder="パスワードを入力してください"
                                    className="block w-full pl-12 pr-4 py-3.5 bg-white border border-[#e8dcc4] rounded-xl text-[#23150d] text-sm placeholder-[#a88a76] focus:outline-none focus:ring-2 focus:ring-[#d4af37]/25 focus:border-[#d4af37]/50 focus:shadow-[0_0_15px_rgba(212,175,55,0.08)] transition-all font-medium"
                                />
                            </div>
                        </div>

                        {/* エラーメッセージ */}
                        {(authError || localError) && (
                            <div className="p-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl font-medium animate-shake leading-relaxed">
                                ⚠️ {localError || authError}
                            </div>
                        )}

                        {/* ログインボタン（ゴールドメタルプレート調） */}
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={isAuthenticating}
                            className="w-full py-3.5 bg-gradient-to-r from-[#aa7c11] via-[#d4af37] to-[#f3e7c4] hover:from-[#bfa153] hover:via-[#e7cd82] hover:to-[#fff9e6] text-[#120b06] font-bold rounded-xl text-sm shadow-xl shadow-black/40 hover:shadow-[#d4af37]/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-none font-serif tracking-widest"
                        >
                            <span>ログイン</span>
                            {!isAuthenticating && <ArrowRight className="w-4 h-4 text-[#120b06]" />}
                        </Button>
                    </form>
                </div>

                {/* フッター */}
                <div className="text-center mt-10">
                    <p className="text-[9px] text-[#8c6114]/50 tracking-[0.2em] font-sans">
                        &copy; 2026 Yashima Group. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
};
