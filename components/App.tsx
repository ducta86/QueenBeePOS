
import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
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
  BarChart3
} from 'lucide-react';
import Dashboard from './Dashboard';
import ProductManager from './ProductManager';
import CustomerManager from './CustomerManager';
import POS from './POS';
import Settings from './Settings';
import OrderHistory from './OrderHistory';
import PurchaseManager from './PurchaseManager';
import Reports from './Reports';
import { useStore } from '../store';

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
  const { fetchInitialData, storeConfig } = useStore();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleItemClick = () => {
    setIsSidebarOpen(false);
  };

  // Logic hiển thị tên gian hàng động ở logo
  const renderBrandName = () => {
    const fullName = storeConfig?.name || 'QueenBee POS';
    const words = fullName.trim().split(/\s+/);
    
    if (words.length <= 1) {
      return (
        <span className="text-xl font-bold tracking-tight text-slate-800 truncate block text-indigo-600">
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

  // Lấy ký tự đại diện (Avatar) từ tên gian hàng
  const getInitials = () => {
    const name = storeConfig?.name || 'QueenBee POS';
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

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-100 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-4">
          <div className="flex items-center space-x-2 px-4 py-6 overflow-hidden">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-indigo-200 shadow-lg shrink-0">
              <CreditCard size={24} />
            </div>
            <div className="flex-1 min-w-0">
              {renderBrandName()}
            </div>
          </div>

          <nav className="flex-1 space-y-1 mt-4">
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
                <p className="text-sm font-black text-slate-900 truncate">
                  {storeConfig?.name || 'QueenBee POS'}
                </p>
                <p className="text-[10px] text-slate-500 truncate font-bold uppercase tracking-widest">Hệ thống QueenBee</p>
              </div>
              <LogOut size={18} className="text-slate-300 hover:text-red-500 cursor-pointer transition-colors" />
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
            <Menu size={24} />
          </button>
          
          <div className="hidden md:flex items-center bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
            <span className="text-xs font-bold text-slate-600">QueenBee Cloud Ready</span>
          </div>

          <div className="flex items-center space-x-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button className="flex items-center space-x-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors">
              <RefreshCw size={16} />
              <span>Đồng bộ</span>
            </button>
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
