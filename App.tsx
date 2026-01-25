
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
  User as UserIcon
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
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { fetchInitialData, storeConfig, currentUser, logout } = useStore();

  useEffect(() => {
    if (currentUser) {
      fetchInitialData();
    }
  }, [currentUser]);

  // Handle click outside for user menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Kiểm tra phiên đăng nhập
  if (!currentUser) {
    return <Login />;
  }

  const handleItemClick = () => {
    setIsSidebarOpen(false);
  };

  const renderBrandName = () => {
    const fullName = storeConfig?.name || 'Elite POS';
    const words = fullName.trim().split(/\s+/);
    
    if (words.length <= 1) {
      return (
        <span className="text-xl font-bold tracking-tight text-slate-800 truncate block">
          {fullName}
        </span>
      );
    }

    const lastWord = words.pop();
    const firstPart = words.join(' ');

    return (
      <span className="text-xl font-bold tracking-tight text-slate-800 truncate block">
        {firstPart} <span className="text-indigo-600">{lastWord}</span>
      </span>
    );
  };

  const getInitials = () => {
    const name = currentUser?.fullName || 'User';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden animate-in fade-in" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-100 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-4 overflow-hidden">
          <div className="flex items-center space-x-2 px-4 py-6 overflow-hidden shrink-0">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-indigo-200 shadow-lg shrink-0">
              <CreditCard size={24} />
            </div>
            <div className="flex-1 min-w-0">
              {renderBrandName()}
            </div>
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
                <p className="text-[13px] font-black text-slate-900 leading-tight break-words">
                  {currentUser?.fullName}
                </p>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider leading-tight mt-0.5">
                  {currentUser?.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 shrink-0">
          <div className="flex items-center space-x-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
              <Menu size={24} />
            </button>
            
            <div className="hidden md:flex items-center bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Online</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            <button className="hidden sm:flex p-2 text-slate-400 hover:bg-slate-100 rounded-full relative transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            
            <button className="flex items-center space-x-2 bg-indigo-50 text-indigo-600 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold hover:bg-indigo-100 transition-all active:scale-95 shadow-sm border border-indigo-100/50">
              <RefreshCw size={16} />
              <span className="hidden xs:inline">Đồng bộ</span>
            </button>

            {/* User Dropdown Menu */}
            <div className="relative" ref={userMenuRef}>
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`flex items-center space-x-3 p-1.5 rounded-2xl transition-all border border-transparent ${isUserMenuOpen ? 'bg-white shadow-lg border-slate-100 ring-4 ring-indigo-50' : 'hover:bg-slate-50'}`}
              >
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-[10px] shadow-sm shrink-0">
                  {getInitials()}
                </div>
                <div className="hidden sm:block text-left max-w-[120px]">
                  <p className="text-[12px] font-black text-slate-900 leading-tight truncate">
                    {currentUser?.fullName}
                  </p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">
                    {currentUser?.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
                  </p>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Content */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-3xl shadow-3xl border border-slate-100 p-2 z-[100] animate-in zoom-in-95 duration-200 origin-top-right">
                  <div className="px-4 py-3 border-b border-slate-50 mb-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Phiên làm việc</p>
                    <p className="text-xs font-bold text-slate-600 truncate">{currentUser?.username}</p>
                  </div>
                  <Link 
                    to="/settings" 
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center space-x-3 px-4 py-3 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl transition-all group"
                  >
                    <UserIcon size={18} className="text-slate-400 group-hover:text-indigo-600" />
                    <span className="font-bold text-sm">Hồ sơ cá nhân</span>
                  </Link>
                  <button 
                    onClick={() => { logout(); setIsUserMenuOpen(false); }}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-2xl transition-all group"
                  >
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
