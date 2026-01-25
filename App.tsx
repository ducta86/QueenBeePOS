
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
  CloudOff,
  CloudDownload,
  AlertCircle
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
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
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
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (syncMenuRef.current && !syncMenuRef.current.contains(event.target as Node)) {
        setIsSyncMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
        <div className="h-full flex flex-col p-4">
          <div className="flex items-center space-x-2 px-4 py-6 shrink-0">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-indigo-200 shadow-lg shrink-0">
              <CreditCard size={24} />
            </div>
            <div className="flex-1 min-w-0">{renderBrandName()}</div>
          </div>

          <nav className="flex-1 space-y-1 mt-4 overflow-y-auto scrollbar-hide">
            <SidebarItem icon={LayoutDashboard} label="Bảng điều khiển" path="/" active={location.pathname === '/'} onClick={handleItemClick} />
            <SidebarItem icon={ShoppingCart} label="Bán hàng (POS)" path="/pos" active={location.pathname === '/pos'} onClick={handleItemClick} />
            <SidebarItem icon={PackagePlus} label="Nhập hàng" path="/purchase" active={location.pathname === '/purchase'} onClick={handleItemClick} />
            <SidebarItem icon={FileText} label="Đơn hàng" path="/orders" active={location.pathname === '/orders'} onClick={handleItemClick} />
            <SidebarItem icon={Package} label="Sản phẩm" path="/products" active={location.pathname === '/products'} onClick={handleItemClick} />
            <SidebarItem icon={Users} label="Khách hàng" path="/customers" active={location.pathname === '/customers'} onClick={handleItemClick} />
            <SidebarItem icon={BarChart3} label="Báo cáo" path="/reports" active={location.pathname === '/reports'} onClick={handleItemClick} />
            <SidebarItem icon={SettingsIcon} label="Cài đặt" path="/settings" active={location.pathname === '/settings'} onClick={handleItemClick} />
          </nav>

          <div className="mt-auto p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black uppercase text-xs shadow-sm">
                {getInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-900 truncate">{currentUser?.fullName}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase">{currentUser?.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}</p>
              </div>
              <LogOut size={18} className="text-slate-300 hover:text-red-500 cursor-pointer transition-colors" onClick={logout} />
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 shrink-0">
          <div className="flex items-center space-x-3">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
              <Menu size={24} />
            </button>
            
            {/* Online Status (Visible on all screens) */}
            <div className={`flex items-center px-2 sm:px-3 py-1.5 rounded-full border transition-colors ${isOnline ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
              <div className={`w-1.5 h-1.5 rounded-full mr-1.5 sm:mr-2 animate-pulse ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
              <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isOnline ? 'System Online' : 'System Offline'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Sync Notifications Hub */}
            <div className="relative" ref={syncMenuRef}>
              <button 
                onClick={() => setIsSyncMenuOpen(!isSyncMenuOpen)}
                className={`p-2 rounded-full relative transition-all ${isSyncMenuOpen ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-100'}`}
              >
                <Bell size={20} />
                {totalUnsynced > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                    {totalUnsynced > 9 ? '9+' : totalUnsynced}
                  </span>
                )}
              </button>

              {isSyncMenuOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-3xl border border-slate-100 p-2 z-[100] animate-in zoom-in-95 duration-200 origin-top-right overflow-hidden">
                   <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50 -mx-2 -mt-2 mb-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái dữ liệu</h4>
                      <p className="text-[11px] font-bold text-slate-700 mt-1">
                        {totalUnsynced === 0 ? 'Dữ liệu đã được bảo vệ trên mây' : `Có ${totalUnsynced} thay đổi chưa lưu`}
                      </p>
                   </div>
                   
                   <div className="space-y-1">
                      {[
                        { label: 'Sản phẩm', count: unsyncedCount.products, icon: Package },
                        { label: 'Đơn hàng', count: unsyncedCount.orders, icon: FileText },
                        { label: 'Khách hàng', count: unsyncedCount.customers, icon: Users }
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition-colors">
                           <div className="flex items-center space-x-3">
                              <div className={`p-1.5 rounded-lg ${item.count > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-300'}`}>
                                 <item.icon size={14} />
                              </div>
                              <span className="text-[11px] font-bold text-slate-600">{item.label}</span>
                           </div>
                           <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg ${item.count > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-500'}`}>
                              {item.count > 0 ? `+${item.count}` : 'Ok'}
                           </span>
                        </div>
                      ))}
                   </div>

                   {totalUnsynced > 0 && (
                      <div className="p-2 border-t border-slate-50 mt-2">
                        <button 
                          onClick={() => { syncData(); setIsSyncMenuOpen(false); }}
                          disabled={!isOnline || isSyncing}
                          className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all"
                        >
                           {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <CloudDownload size={14} />}
                           <span>Đồng bộ ngay</span>
                        </button>
                      </div>
                   )}
                </div>
              )}
            </div>
            
            {/* Main Sync Button */}
            <button 
              onClick={syncData}
              disabled={isSyncing || !isOnline}
              className={`flex items-center space-x-2 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all border ${
                totalUnsynced > 0 
                  ? 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse' 
                  : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'
              } disabled:opacity-50`}
            >
              <RefreshCw size={16} className={`${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">{isSyncing ? 'Đang gửi...' : 'Đồng bộ'}</span>
            </button>

            {/* User Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`flex items-center space-x-2 p-1 rounded-2xl transition-all border border-transparent ${isUserMenuOpen ? 'bg-white shadow-lg border-slate-100' : 'hover:bg-slate-50'}`}
              >
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-[10px] shrink-0">
                  {getInitials()}
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-3 w-48 bg-white rounded-3xl shadow-3xl border border-slate-100 p-2 z-[100] animate-in zoom-in-95 duration-200 origin-top-right">
                  <div className="px-4 py-3 border-b border-slate-50 mb-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cá nhân</p>
                    <p className="text-xs font-bold text-slate-700 truncate">{currentUser?.fullName}</p>
                  </div>
                  <Link to="/settings" onClick={() => setIsUserMenuOpen(false)} className="flex items-center space-x-3 px-4 py-2.5 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all group">
                    <UserIcon size={16} className="text-slate-400 group-hover:text-indigo-600" />
                    <span className="font-bold text-xs">Hồ sơ của tôi</span>
                  </Link>
                  <button onClick={logout} className="w-full flex items-center space-x-3 px-4 py-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-all group">
                    <LogOut size={16} className="text-rose-400 group-hover:text-rose-600" />
                    <span className="font-bold text-xs">Đăng xuất</span>
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
