import React from 'react';
import { ShieldCheck, Settings, LogOut, LogIn } from 'lucide-react';
import { User, ActiveTab } from '../types';

interface NavbarProps {
  currentUser: User | null;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenProfile: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenProfile,
  onOpenLogin,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 bg-white border-b border-slate-200 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 lg:gap-3 shrink-0">
          <div className="p-1.5 lg:p-2 bg-blue-600 rounded-xl text-white shadow-md">
            <ShieldCheck size={20} className="lg:size-6" />
          </div>
          <div>
            <h1 className="text-sm lg:text-base xl:text-lg font-black text-slate-800 tracking-tight leading-tight">VẬT CHẤT XE</h1>
            <p className="text-[8px] text-red-500 font-medium tracking-tight">Bản dùng thử có thể có sai sót</p>
          </div>
        </div>

        {/* Right aligned group: Desktop navigation & profile */}
        <div className="hidden lg:flex items-center gap-3 xl:gap-4 ml-auto">
          <nav className="flex items-center gap-1 xl:gap-2 whitespace-nowrap">
            {currentUser && currentUser.role !== 'user' && (
              <>
                <button 
                  onClick={() => setActiveTab('logs')}
                  className={`px-2.5 py-1.5 xl:px-3.5 xl:py-2 rounded-xl text-xs xl:text-sm font-bold transition-all ${activeTab === 'logs' ? 'bg-blue-600 text-white shadow-md shadow-blue-100 hover:bg-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  Lịch sử
                </button>
                <button 
                  onClick={() => setActiveTab('users')}
                  className={`px-2.5 py-1.5 xl:px-3.5 xl:py-2 rounded-xl text-xs xl:text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-md shadow-blue-100 hover:bg-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  Tài khoản
                </button>
              </>
            )}

            {currentUser && (
              <button 
                onClick={() => setActiveTab('commissions')}
                className={`px-2.5 py-1.5 xl:px-3.5 xl:py-2 rounded-xl text-xs xl:text-sm font-bold transition-all ${activeTab === 'commissions' ? 'bg-blue-600 text-white shadow-md shadow-blue-100 hover:bg-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Hoa hồng
              </button>
            )}

            {currentUser && currentUser.role === 'master' && (
              <button 
                onClick={() => setActiveTab('rates')}
                className={`px-2.5 py-1.5 xl:px-3.5 xl:py-2 rounded-xl text-xs xl:text-sm font-bold transition-all ${activeTab === 'rates' ? 'bg-blue-600 text-white shadow-md shadow-blue-100 hover:bg-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Hãng & Biểu phí
              </button>
            )}

            <button 
              onClick={() => setActiveTab('calc')}
              className={`px-3 py-1.5 xl:px-4 xl:py-2 rounded-xl text-xs xl:text-sm font-bold transition-all ${activeTab === 'calc' ? 'bg-blue-600 text-white shadow-md shadow-blue-100 hover:bg-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Báo giá
            </button>
          </nav>

          {/* User profile / Login trigger */}
          <div className="flex items-center gap-2 lg:gap-3 shrink-0 border-l border-slate-200 pl-3">
            {currentUser ? (
              <>
                <div className="text-right hidden md:block max-w-[130px] lg:max-w-[180px] xl:max-w-[220px]">
                  <div className="font-bold text-slate-800 text-xs lg:text-sm truncate" title={currentUser.name}>{currentUser.name}</div>
                  <div className="text-[9px] lg:text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none">
                    {currentUser.role === 'master' ? 'Master' : currentUser.role === 'admin' ? 'Quản lý' : currentUser.role === 'client' ? 'Đại lý' : 'CTV'}
                  </div>
                </div>
                <button 
                  onClick={onOpenProfile}
                  className="p-1.5 lg:p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  title="Hồ sơ cá nhân"
                >
                  <Settings size={16} className="lg:size-5" />
                </button>
                <button 
                  onClick={onLogout}
                  className="p-1.5 lg:p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  title="Đăng xuất"
                >
                  <LogOut size={16} className="lg:size-5" />
                </button>
              </>
            ) : (
              <button 
                onClick={onOpenLogin}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-200"
              >
                <LogIn size={16} />
                Đăng nhập
              </button>
            )}
          </div>
        </div>

        {/* Mobile Profile / Login trigger */}
        <div className="flex lg:hidden items-center gap-2">
          {currentUser ? (
            <>
              <button 
                onClick={onOpenProfile}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                title="Hồ sơ cá nhân"
              >
                <Settings size={18} />
              </button>
              <button 
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                title="Đăng xuất"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button 
              onClick={onOpenLogin}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-md shadow-blue-200"
            >
              <LogIn size={14} />
              Đăng nhập
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation bar */}
      {currentUser && (
        <div className="lg:hidden flex border-t border-slate-200 overflow-x-auto bg-white px-2 py-1 items-center gap-1.5 scrollbar-none">
          {currentUser.role !== 'user' && (
            <>
              <button 
                onClick={() => setActiveTab('logs')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all ${activeTab === 'logs' ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                Lịch sử
              </button>
              <button 
                onClick={() => setActiveTab('users')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                Tài khoản
              </button>
            </>
          )}
          <button 
            onClick={() => setActiveTab('commissions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all ${activeTab === 'commissions' ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            Hoa hồng
          </button>
          {currentUser.role === 'master' && (
            <button 
              onClick={() => setActiveTab('rates')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all ${activeTab === 'rates' ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Hãng & Biểu phí
            </button>
          )}
          <button 
            onClick={() => setActiveTab('calc')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all ${activeTab === 'calc' ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            Báo giá
          </button>
        </div>
      )}
    </header>
  );
};
