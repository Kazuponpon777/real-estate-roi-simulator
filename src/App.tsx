import { useEffect } from 'react';
import { useSimulationStore } from './stores/useSimulationStore';
import { Screen1_Property } from './screens/Screen1_Property';
import { Screen2_Budget } from './screens/Screen2_Budget';
import { Screen3_Funding } from './screens/Screen3_Funding';
import { Screen4_RentRoll } from './screens/Screen4_RentRoll';
import { Screen5_Analysis } from './screens/Screen5_Analysis';
import { ScreenMenu_Home } from './screens/ScreenMenu_Home'; // 日本語コメント: メニュー画面をインポート
import { ScreenMenu_Admin } from './screens/ScreenMenu_Admin'; // 日本語コメント: 管理画面をインポート
import { Stepper } from './components/layout/Stepper';
import { SaveLoadManager } from './components/ui/SaveLoadManager';
import { LoginScreen } from './components/ui/LoginScreen';
import { LogOut, Loader2, Home } from 'lucide-react'; // 日本語コメント: Homeアイコンを追加

function App() {
    const {
        activeStep,
        isAuthenticated,
        checkAuthStatus,
        logout,
        viewMode,
        setViewMode // 日本語コメント: 画面切り替え状態とアクションを取得
    } = useSimulationStore();

    // マウント時にサーバー側の認証状態を確認
    useEffect(() => {
        checkAuthStatus();
    }, []);

    const renderScreen = () => {
        switch (activeStep) {
            // 日本語コメント: 最小ステップは1に固定。0は廃止されました。
            case 1: return <Screen1_Property />;
            case 2: return <Screen2_Budget />;
            case 3: return <Screen3_Funding />;
            case 4: return <Screen4_RentRoll />;
            case 5: return <Screen5_Analysis />;
            default: return <Screen1_Property />;
        }
    };

    // 認証確認中はローディングスピナーを表示
    if (isAuthenticated === null) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#fdfaf5] text-[#8c6114] font-sans bg-[radial-gradient(#a87c2808_1px,transparent_1px)] [background-size:24px_24px]">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-[#a87c28] animate-spin mx-auto mb-4" />
                    <p className="text-sm font-bold animate-pulse">認証状態を確認中...</p>
                </div>
            </div>
        );
    }

    // 未ログイン時はログイン画面を表示
    if (!isAuthenticated) {
        return <LoginScreen />;
    }

    return (
        <div className="min-h-screen font-sans bg-[#fdfaf5] text-[#23150d] selection:bg-[#d4af37]/25 bg-[radial-gradient(#a87c2808_1px,transparent_1px)] [background-size:24px_24px]">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-[100] h-16 flex items-center justify-between px-6 no-print bg-[#fdfaf5]/95 bg-[radial-gradient(#a87c2808_1px,transparent_1px)] [background-size:24px_24px] border-b border-[#e8dcc4] text-[#23150d] shadow-sm">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setViewMode('menu')}
                        className="flex items-center gap-2 text-left hover:opacity-90 transition-opacity"
                    >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-serif font-black text-lg bg-gradient-to-tr from-[#aa7c11] to-[#d4af37] text-[#1c120c] shadow-[0_2px_10px_rgba(212,175,55,0.15)] border border-[#d4af37]/25">
                            Y
                        </div>
                        <span className="font-bold text-lg tracking-tight hidden sm:block font-serif text-transparent bg-clip-text bg-gradient-to-r from-[#8c6114] via-[#a87c28] to-[#aa7c11] tracking-wide">
                            Yashima ROI Simulator
                        </span>
                    </button>
                    
                    {/* 日本語コメント: メニュー画面以外（シミュレータ中、管理画面中）は「メニューに戻る」ボタンを表示 */}
                    {viewMode !== 'menu' && (
                        <button
                            onClick={() => setViewMode('menu')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all text-[#8c6114] hover:text-[#23150d] bg-[#f5ebd9] hover:bg-[#ebd9c5] border border-[#e8dcc4]"
                        >
                            <Home className="w-3.5 h-3.5" />
                            メニューに戻る
                        </button>
                    )}
                </div>

                <div className="hidden md:block w-full max-w-2xl">
                    {/* Stepper is now a full width component, maybe placed outside? */}
                </div>

                <div className="flex items-center gap-4">
                    {/* 日本語コメント: 管理画面以外（シミュレータ動作中およびメニュー画面）で保存・読込マネージャを表示 */}
                    {viewMode !== 'admin' && <SaveLoadManager />}
                    <button
                        onClick={logout}
                        title="ログアウト"
                        className="flex items-center justify-center p-2 rounded-lg transition-colors text-[#8c6114] hover:text-rose-600 hover:bg-rose-50"
                    >
                        <LogOut className="w-4.5 h-4.5" />
                    </button>
                    <div className="text-sm font-medium hidden lg:block border-l pl-4 transition-colors text-[#8c6114]/50 border-[#e8dcc4]">
                        v1.4 (Menu UI)
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-20 pb-12 min-h-screen">
                {/* 日本語コメント: シミュレータ動作中は常に進捗インジケータを表示します */}
                {viewMode === 'simulator' && <Stepper />}
                <div className="container mx-auto px-4 md:px-6 py-8">
                    {/* 日本語コメント: 画面モードに応じたコンポーネントレンダリング */}
                    {viewMode === 'menu' ? (
                        <ScreenMenu_Home />
                    ) : viewMode === 'admin' ? (
                        <ScreenMenu_Admin />
                    ) : (
                        renderScreen()
                    )}
                </div>
            </main>
        </div>
    );
}

export default App;
