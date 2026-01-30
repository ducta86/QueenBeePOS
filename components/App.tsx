
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, Package, Users, ShoppingCart, Settings as SettingsIcon, RefreshCw,
  LogOut, Bell, Menu, CreditCard, FileText, PackagePlus, BarChart3, ChevronDown,
  User as UserIcon, Loader2, CloudDownload, Users2, DollarSign, Layers, Tags, CheckCircle, ChevronRight, Check
} from 'lucide-react';
import Dashboard from './Dashboard';
import ProductManager from './ProductManager';
import CustomerManager from './CustomerManager';
import POS from './POS';
import Settings from './Settings';
import OrderHistory from './OrderHistory';
import PurchaseManager from './PurchaseManager';
import Reports from './Reports';
import Login from './Login';
import { useStore } from '../store';
import { useSync } from '../hooks/useSync';

const SidebarItem = React.memo(({ icon: Icon, label, path, active, onClick }: { icon: any, label: string, path: string, active: boolean, onClick: () => void }) => (
  <Link 
    to={path} 
    onClick={onClick}
    className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
      active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
    }`}
  >
    <Icon size={20} className={`${active ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
    <span className="font-bold text-sm">{label}</span>
  </Link>
));

const SyncPortalDropdown = ({ triggerRef, onClose, totalUnsynced, unsyncedCount, syncData, isSyncing, isOnline }: any) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, right: 0, isMobile: false });

  useEffect(() => {
    const updatePosition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const mobile = window.innerWidth < 640;
        setCoords({ 
          top: rect.bottom + 12, 
          right: window.innerWidth - rect.right,
          isMobile: mobile
        });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    const handleOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) && 
        triggerRef.current && 
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutside);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [triggerRef, onClose]);

  const syncCategories = [
    { label: 'Sản phẩm', count: Number(unsyncedCount.products || 0), icon: Package, path: '/products' },
    { label: 'Đơn hàng', count: Number(unsyncedCount.orders || 0), icon: FileText, path: '/orders' },
    { label: 'Khách hàng', count: Number(unsyncedCount.customers || 0), icon: Users, path: '/customers' },
    { label: 'Phiếu nhập', count: Number(unsyncedCount.purchayses || 0), icon: PackagePlus, path: '/purchase' },
    { label: 'Bảng giá', count: Number(unsyncedCount.productPrices || 0), icon: DollarSign, path: '/settings' },
    { label: 'Nhóm hàng', count: Number(unsyncedCount.productGroups || 0), icon: Layers, path: '/settings' },
    { label: 'Loại giá', count: Number(unsyncedCount.priceTypes || 0), icon: Tags, path: '/settings' },
    { label: 'Nhân viên', count: Number(unsyncedCount.users || 0), icon: Users2, path: '/settings' }
  ];

  const style: React.CSSProperties = coords.isMobile 
    ? { top: `${coords.top}px`, left: '12px', right: '12px', width: 'auto', maxWidth: 'calc(100vw - 24px)' }
    : { top: `${coords.top}px`, right: `${coords.right}px`, width: '320px' };

  return createPortal(
    <div 
      ref={dropdownRef} 
      style={style} 
      className="fixed bg-white rounded-[32px] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.2)] border border-slate-100 p-2 z-[999] animate-in zoom-in-95 duration-200 origin-top-right overflow-hidden"
    >
       <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50 -mx-2 -mt-2 mb-2">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Trung tâm đồng bộ</h4>
          <p className="text-[11px] font-bold text-slate-700">{totalUnsynced > 0 ? `Có ${totalUnsynced} mục chưa lưu` : 'Dữ liệu đã an toàn'}</p>
       </div>
       <div className="max-h-[60vh] sm:max-h-[400px] overflow-y-auto scrollbar-hide px-1">
          <div className="grid grid-cols-1 gap-1">
            {syncCategories.map((item, idx) => (
              <Link key={idx} to={item.path} onClick={onClose} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100 group">
                 <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-xl bg-white shadow-sm transition-transform group-hover:scale-110 ${item.count > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                       <item.icon size={16} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-600">{item.label}</span>
                 </div>
                 <div className="flex items-center space-x-2">
                    {item.count > 0 ? <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 animate-pulse">+{item.count}</span> : <div className="p-1 rounded-full bg-emerald-50 text-emerald-600"><Check size={12} strokeWidth={3} /></div>}
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400" />
                 </div>
              </Link>
            ))}
          </div>
       </div>
       <div className="p-2 border-t border-slate-50 mt-2">
         <button onClick={() => { syncData(); onClose(); }} disabled={!isOnline || isSyncing} className="w-full py-4 bg-indigo-600 text-white rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center space-x-2 shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95">
            {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <CloudDownload size={16} />}
            <span>{isSyncing ? 'Đang gửi...' : 'Đồng bộ toàn bộ'}</span>
         </button>
       </div>
    </div>, document.body
  );
};

const Header = React.memo(({ onOpenSidebar }: { onOpenSidebar: () => void }) => {
  const syncBtnRef = useRef<HTMLButtonElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [isSyncMenuOpen, setIsSyncMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const currentUser = useStore(state => state.currentUser);
  const logout = useStore(state => state.logout);
  const { syncData, isSyncing, unsyncedCount, totalUnsynced, isServerOnline, checkUnsynced } = useSync();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const handleOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('mousedown', handleOutside);
    };
  }, []);

  const getInitials = useCallback(() => {
    const name = currentUser?.fullName || 'User';
    const words = name.trim().split(/\s+/);
    return words.length >= 2 ? (words[0][0] + words[words.length - 1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  }, [currentUser]);

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-3 lg:px-8 sticky top-0 z-30 shrink-0">
      <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
        <button onClick={onOpenSidebar} className="p-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors lg:hidden shrink-0">
          <Menu size={24} />
        </button>
        
        <div className={`flex items-center px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full border transition-all shrink-0 shadow-sm ${isOnline && isServerOnline ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
          <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mr-2 sm:mr-2.5 ${isOnline && isServerOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
          <span className={`text-[10px] sm:text-[12px] font-black uppercase tracking-widest whitespace-nowrap ${isOnline && isServerOnline ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isOnline && isServerOnline ? 'Cloud Active' : 'System Offline'}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4 ml-auto shrink-0">
        <div className="relative">
          <button ref={syncBtnRef} onClick={() => { if (!isSyncMenuOpen) checkUnsynced(); setIsSyncMenuOpen(!isSyncMenuOpen); }} className={`p-1.5 sm:p-2 rounded-full relative transition-all ${isSyncMenuOpen ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-100'}`}>
            <Bell size={20} className={isSyncing ? 'animate-bounce text-indigo-600' : ''} />
            {totalUnsynced > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white">{totalUnsynced > 9 ? '9+' : totalUnsynced}</span>}
          </button>
          {isSyncMenuOpen && <SyncPortalDropdown triggerRef={syncBtnRef} onClose={() => setIsSyncMenuOpen(false)} totalUnsynced={totalUnsynced} unsyncedCount={unsyncedCount} syncData={syncData} isSyncing={isSyncing} isOnline={isOnline} />}
        </div>
        
        <button onClick={syncData} disabled={isSyncing || !isOnline} className={`flex items-center space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border ${totalUnsynced > 0 ? 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse' : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'} disabled:opacity-50`}>
          <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
          <span className="hidden xs:inline whitespace-nowrap uppercase tracking-widest text-[9px] sm:text-[11px]">{isSyncing ? 'Lưu...' : 'Đồng bộ'}</span>
        </button>

        <div className="relative" ref={userMenuRef}>
          <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className={`flex items-center space-x-1 sm:space-x-2 p-1 rounded-xl transition-all border border-transparent ${isUserMenuOpen ? 'bg-white shadow-lg border-slate-100' : 'hover:bg-slate-50'}`}>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-[9px] sm:text-[10px] shrink-0 shadow-md">{getInitials()}</div>
            <ChevronDown size={12} className={`text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-3 w-56 bg-white rounded-[24px] shadow-3xl border border-slate-100 p-1.5 z-[100] animate-in zoom-in-95 duration-200 origin-top-right overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-50 mb-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Cá nhân</p>
                <p className="text-[13px] font-bold text-slate-700 truncate">{currentUser?.fullName}</p>
              </div>
              <Link to="/settings" onClick={() => setIsUserMenuOpen(false)} className="flex items-center space-x-3 px-3.5 py-2.5 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all group">
                <UserIcon size={16} className="text-slate-400 group-hover:text-indigo-600" />
                <span className="font-bold text-[11px]">Hồ sơ của tôi</span>
              </Link>
              <button onClick={logout} className="w-full flex items-center space-x-3 px-3.5 py-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-all group">
                <LogOut size={16} className="text-rose-400 group-hover:text-rose-600" />
                <span className="font-bold text-[11px]">Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
});

const AppContent = () => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const currentUser = useStore(state => state.currentUser);
  const storeName = useStore(state => state.storeConfig.name);
  const fetchInitialData = useStore(state => state.fetchInitialData);

  useEffect(() => {
    if (currentUser) fetchInitialData();
  }, [currentUser, fetchInitialData]);

  if (!currentUser) return <Login />;

  const renderBrandName = () => {
    const fullName = storeName || 'QueenBee POS';
    const words = fullName.trim().split(/\s+/);
    if (words.length <= 1) return <span className="text-xl font-bold tracking-tight text-slate-800 truncate block">{fullName}</span>;
    const lastWord = words.pop();
    return <span className="text-xl font-bold tracking-tight text-slate-800 truncate block">{words.join(' ')} <span className="text-indigo-600">{lastWord}</span></span>;
  };

  return (
    <div className="flex min-h-screen bg-slate-50 overflow-hidden">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-100 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col p-4">
          <div className="flex items-center space-x-2 px-4 py-6 shrink-0">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0"><CreditCard size={24} /></div>
            <div className="flex-1 min-w-0">{renderBrandName()}</div>
          </div>
          <nav className="flex-1 space-y-1 mt-4 overflow-y-auto scrollbar-hide">
            <SidebarItem icon={LayoutDashboard} label="Bảng điều khiển" path="/" active={location.pathname === '/'} onClick={() => setIsSidebarOpen(false)} />
            <SidebarItem icon={ShoppingCart} label="Bán hàng (POS)" path="/pos" active={location.pathname === '/pos'} onClick={() => setIsSidebarOpen(false)} />
            <SidebarItem icon={PackagePlus} label="Nhập hàng" path="/purchase" active={location.pathname === '/purchase'} onClick={() => setIsSidebarOpen(false)} />
            <SidebarItem icon={FileText} label="Đơn hàng" path="/orders" active={location.pathname === '/orders'} onClick={() => setIsSidebarOpen(false)} />
            <SidebarItem icon={Package} label="Sản phẩm" path="/products" active={location.pathname === '/products'} onClick={() => setIsSidebarOpen(false)} />
            <SidebarItem icon={Users} label="Khách hàng" path="/customers" active={location.pathname === '/customers'} onClick={() => setIsSidebarOpen(false)} />
            <SidebarItem icon={BarChart3} label="Báo cáo" path="/reports" active={location.pathname === '/reports'} onClick={() => setIsSidebarOpen(false)} />
            <SidebarItem icon={SettingsIcon} label="Cài đặt" path="/settings" active={location.pathname === '/settings'} onClick={() => setIsSidebarOpen(false)} />
          </nav>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onOpenSidebar={() => setIsSidebarOpen(true)} />
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

const App = () => (<Router><AppContent /></Router>);
export default App;
