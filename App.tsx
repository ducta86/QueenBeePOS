
import React, { useEffect, useState, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  Settings as SettingsIcon, 
  RefreshCw,
  LogOut,
  Bell,
  Menu,
  CreditCard,
  FileText,
  PackagePlus,
  BarChart3,
  ChevronDown,
  User as UserIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CloudOff,
  CloudDownload,
  ArrowRight
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import ProductManager from './components/ProductManager';
import CustomerManager from './components/CustomerManager';
import POS from './components/POS';
import Settings from './components/Settings';
import OrderHistory from './components/OrderHistory';
import PurchaseManager from './components/PurchaseManager';
import Reports from './components/Reports';
import Login from './components/Login';
import { useStore } from './store';
import { useSync } from './hooks/useSync';

const SidebarItem = ({ icon: Icon, label, path, active, onClick }: { icon: any, label: string, path: string, active: boolean, onClick: () => void }) => (
  <Link 
    to={path} 
    onClick={onClick}
    className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
      active 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
        : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
    }`}
  >
    <Icon size={20} className={`${active ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
    <span className="font-bold text-sm">{label}</span>
  </Link>
);

const AppContent = () => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSyncMenuOpen, setIsSyncMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const syncMenuRef = useRef<HTMLDivElement>(null);
  
  const { fetchInitialData, storeConfig, currentUser, logout } = useStore();
  const { syncData, isSyncing, lastSync, unsyncedCount, totalUnsynced } = useSync();

  useEffect(() => {
    if (currentUser) {
      fetchInitialData();
    }
  }, [currentUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (syncMenuRef.current && !syncMenuRef.current.contains(event.target as Node)) {
        setIsSyncMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentUser) {
    return <Login />;
  }

  const handleItemClick = () => {
    setIsSidebarOpen(false);
  };

  const getInitials = () => {
    const name = currentUser?.fullName || 'User';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const renderBrandName = () => {
    const fullName = storeConfig?.name || 'Elite POS';
    const words = fullName.trim().split(/\s+/);
    if (words.length <= 1) return <span className="text-xl font-bold tracking-tight text-slate-800 truncate block">{fullName}</span>;
    const lastWord = words.pop();
    const firstPart = words.join(' ');
    return (
      <span className="text-xl font-bold tracking-tight text-slate-800 truncate block">
        {firstPart} <span className="text-indigo-600">{lastWord}</span>
      </span>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden animate-in fade-in" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-100 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-4 overflow-hidden">
          <div className="flex items-center space-x-2 px-4 py-6 overflow-hidden shrink-0">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-indigo-200 shadow-lg shrink-0">
              <CreditCard size={24} />
            </div>
            <div className="flex-1 min-w-0">{renderBrandName()}</div>
          </div>

          <nav className="flex-1 space-y-1 mt-4 overflow-y-auto scrollbar-hide pr-1">
            <SidebarItem icon={LayoutDashboard} label="Bảng điều khiển" path="/" active={location.pathname === '/'} onClick={handleItemClick} />
            <SidebarItem icon={ShoppingCart} label="Bán hàng (POS)" path="/pos" active={location.pathname === '/pos'} onClick={handleItemClick} />
            <SidebarItem icon={PackagePlus} label="Nhập hàng" path="/purchase" active={location.pathname === '/purchase'} onClick={handleItemClick} />
            <SidebarItem icon={FileText} label="Đơn hàng" path="/orders" active={location.pathname === '/orders'} onClick={handleItemClick} />
            <SidebarItem icon={Package} label="Sản phẩm" path="/products" active={location.pathname === '/products'} onClick={handleItemClick} />
            <SidebarItem icon={Users} label="Khách hàng" path="/customers" active={location.pathname === '/customers'} onClick={handleItemClick} />
            <SidebarItem icon={BarChart3} label="Báo cáo" path="/reports" active={location.pathname === '/reports'} onClick={handleItemClick} />
            <SidebarItem icon={SettingsIcon} label="Cài đặt" path="/settings" active={location.pathname === '/settings'} onClick={handleItemClick} />
          </nav>

          <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100/50 shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black uppercase text-[10px] shadow-sm shrink-0">
                {getInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-black text-slate-900 leading-tight break-words">{currentUser?.fullName}</p>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{currentUser?.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 shrink-0">
          <div className="flex items-center space-x-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
              <Menu size={24} />
            </button>
            
            {/* Status Indicator (Visible on mobile and desktop) */}
            <div className="flex items-center bg-slate-50 px-2 sm:px-3 py-1.5 rounded-full border border-slate-100">
              <div className={`w-2 h-2 rounded-full animate-pulse mr-1.5 sm:mr-2 ${navigator.onLine ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {navigator.onLine ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Sync Notifications Hub (The Bell) */}
            <div className="relative" ref={syncMenuRef}>
              <button 
                onClick={() => setIsSyncMenuOpen(!isSyncMenuOpen)}
                className={`p-2 rounded-full relative transition-all ${isSyncMenuOpen ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-100'}`}
              >
                <Bell size={20} />
                {totalUnsynced > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                    {totalUnsynced > 9 ? '9+' : totalUnsynced}
                  </span>
                )}
              </button>

              {isSyncMenuOpen && (
                <div className="absolute right-0 mt-3 w-72 bg-white rounded-3xl shadow-3xl border border-slate-100 p-2 z-[100] animate-in zoom-in-95 duration-200 origin-top-right overflow-hidden">
                   <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50 -mx-2 -mt-2 mb-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái đồng bộ</h4>
                      <p className="text-[11px] font-bold text-slate-600 mt-1">
                        {totalUnsynced === 0 ? 'Mọi thứ đã an toàn trên Cloud' : `Có ${totalUnsynced} mục chưa được tải lên`}
                      </p>
                   </div>
                   
                   <div className="space-y-1 px-2 pb-2">
                      {[
                        { label: 'Sản phẩm mới/sửa', count: unsyncedCount.products, icon: Package },
                        { label: 'Đơn hàng mới', count: unsyncedCount.orders, icon: FileText },
                        { label: 'Thông tin khách hàng', count: unsyncedCount.customers, icon: Users }
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors group">
                           <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-xl ${item.count > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                                 <item.icon size={16} />
                              </div>
                              <span className="text-xs font-bold text-slate-600">{item.label}</span>
                           </div>
                           <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${item.count > 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                              {item.count > 0 ? `+${item.count}` : 'Đã xong'}
                           </span>
                        </div>
                      ))}
                   </div>

                   {totalUnsynced > 0 && (
                      <div className="p-2 border-t border-slate-50 mt-2">
                        <button 
                          onClick={() => { syncData(); setIsSyncMenuOpen(false); }}
                          disabled={!navigator.onLine}
                          className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 disabled:grayscale transition-all"
                        >
                           {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <CloudDownload size={14} />}
                           <span>Đồng bộ thủ công ngay</span>
                        </button>
                        {!navigator.onLine && (
                           <p className="text-[9px] text-red-500 text-center font-bold mt-2 flex items-center justify-center">
                              <CloudOff size={10} className="mr-1" /> Không có kết nối internet
                           </p>
                        )}
                      </div>
                   )}
                   {lastSync && (
                      <div className="px-4 py-2 text-center">
                         <span className="text-[8px] font-black text-slate-300 uppercase italic">Lần cuối: {new Date(lastSync).toLocaleTimeString()}</span>
                      </div>
                   )}
                </div>
              )}
            </div>
            
            {/* Sync Button */}
            <button 
              onClick={syncData}
              disabled={isSyncing || !navigator.onLine}
              className={`flex items-center space-x-2 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all active:scale-95 shadow-sm border ${
                totalUnsynced > 0 
                  ? 'bg-amber-50 text-amber-600 border-amber-100' 
                  : 'bg-indigo-50 text-indigo-600 border-indigo-100'
              } disabled:opacity-50`}
              title={!navigator.onLine ? "Ngoại tuyến" : "Nhấn để đồng bộ dữ liệu"}
            >
              <RefreshCw size={16} className={`${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">{isSyncing ? 'Đang gửi...' : 'Đồng bộ'}</span>
            </button>

            {/* User Dropdown Menu */}
            <div className="relative" ref={userMenuRef}>
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`flex items-center space-x-2 sm:space-x-3 p-1 rounded-2xl transition-all border border-transparent ${isUserMenuOpen ? 'bg-white shadow-lg border-slate-100 ring-4 ring-indigo-50' : 'hover:bg-slate-50'}`}
              >
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-[10px] shadow-sm shrink-0">
                  {getInitials()}
                </div>
                <div className="hidden sm:block text-left max-w-[120px]">
                  <p className="text-[12px] font-black text-slate-900 leading-tight truncate">{currentUser?.fullName}</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">
                    {currentUser?.role === 'admin' ? 'Admin' : 'Nhân viên'}
                  </p>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-3xl shadow-3xl border border-slate-100 p-2 z-[100] animate-in zoom-in-95 duration-200 origin-top-right">
                  <div className="px-4 py-3 border-b border-slate-50 mb-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Phiên làm việc</p>
                    <p className="text-xs font-bold text-slate-600 truncate">{currentUser?.username}</p>
                  </div>
                  <Link to="/settings" onClick={() => setIsUserMenuOpen(false)} className="flex items-center space-x-3 px-4 py-3 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl transition-all group">
                    <UserIcon size={18} className="text-slate-400 group-hover:text-indigo-600" />
                    <span className="font-bold text-sm">Hồ sơ cá nhân</span>
                  </Link>
                  <button onClick={() => { logout(); setIsUserMenuOpen(false); }} className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-2xl transition-all group">
                    <LogOut size={18} className="text-red-400 group-hover:text-red-600" />
                    <span className="font-bold text-sm">Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 scrollbar-hide">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<ProductManager />} />
            <Route path="/customers" element={<CustomerManager />} />
            <Route path="/orders" element={<OrderHistory />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/purchase" element={<PurchaseManager />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const App = () => (
  <Router>
    <AppContent />
  </Router>
);

export default App;
