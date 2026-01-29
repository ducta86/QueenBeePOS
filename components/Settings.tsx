
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { db, hashPassword, generateSalt } from '../db';
import { useSync } from '../hooks/useSync';
import { 
  Plus, 
  Trash2, 
  Tag, 
  Layers, 
  X, 
  AlertTriangle, 
  Crown, 
  Store, 
  MapPin, 
  Phone, 
  BoxSelect, 
  Printer, 
  Wifi, 
  CheckCircle2, 
  RefreshCw,
  Unplug,
  Cable,
  Play,
  Network,
  ToggleRight,
  ToggleLeft,
  Minus,
  Target,
  Edit2,
  Check,
  Info,
  ChevronDown,
  User as UserIcon,
  ShieldCheck,
  Key,
  Users as UsersIcon,
  UserPlus,
  RotateCcw,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ChevronRight,
  DollarSign,
  ShoppingBag,
  CreditCard,
  Building,
  Search,
  FileText,
  Cloud,
  CloudLightning,
  Copy,
  Zap,
  Server,
  Globe,
  Link as LinkIcon,
  CloudOff,
  AlertCircle,
  Package
} from 'lucide-react';
import { User, UserRole, Bank } from '../types';

const POPULAR_BANKS: Bank[] = [
  { id: 'VCB', name: 'Vietcombank', logo: 'https://api.vietqr.io/img/VCB.png', shortName: 'Vietcombank', code: 'VCB' },
  { id: 'ICB', name: 'VietinBank', logo: 'https://api.vietqr.io/img/ICB.png', shortName: 'VietinBank', code: 'ICB' },
  { id: 'BIDV', name: 'BIDV', logo: 'https://api.vietqr.io/img/BIDV.png', shortName: 'BIDV', code: 'BIDV' },
  { id: 'VBA', name: 'Agribank', logo: 'https://api.vietqr.io/img/VBA.png', shortName: 'VBA', code: 'VBA' },
  { id: 'MB', name: 'MBBank', logo: 'https://api.vietqr.io/img/MB.png', shortName: 'MBBank', code: 'MB' },
  { id: 'TCB', name: 'Techcombank', logo: 'https://api.vietqr.io/img/TCB.png', shortName: 'TCB', code: 'TCB' },
];

const ConfirmDialog = ({ title, message, onConfirm, onCancel, type = 'danger', showConfirm = true }: any) => (
  <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 text-center border border-slate-100">
      <div className={`w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center ${type === 'danger' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
        {type === 'danger' ? <AlertTriangle size={32} /> : <Info size={32} />}
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2 uppercase tracking-tight">{title}</h3>
      <p className="text-slate-500 mb-8 text-sm leading-relaxed">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all text-[11px] uppercase tracking-widest">
          {showConfirm ? 'Hủy' : 'Đã hiểu'}
        </button>
        {showConfirm && (
          <button onClick={onConfirm} className={`flex-1 py-4 font-bold text-white rounded-2xl shadow-xl transition-all text-[11px] uppercase tracking-widest ${type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-100'}`}>
            Xác nhận
          </button>
        )}
      </div>
    </div>
  </div>
);

const AdminOnlyBadge = () => (
  <div className="flex items-center space-x-2 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 shadow-sm animate-in fade-in">
    <Lock size={12} className="shrink-0" />
    <span className="text-[10px] font-black uppercase tracking-widest">Chỉ dành cho Admin</span>
  </div>
);

const Settings = () => {
  const { 
    priceTypes, addPriceType, updatePriceType, deletePriceType,
    productGroups, addProductGroup, updateProductGroup, deleteProductGroup,
    loyaltyConfig, updateLoyaltyConfig,
    storeConfig, updateStoreConfig,
    currentUser, users, addUser, updateUser, deleteUser, resetUserPassword, error, setError
  } = useStore();

  const { syncData, isSyncing, isServerOnline, totalUnsynced, lastSync } = useSync();

  const [activeTab, setActiveTab] = useState<'prices' | 'groups' | 'loyalty' | 'store' | 'printer' | 'account' | 'sync'>('prices');
  const [newValue, setNewValue] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const [bankList, setBankList] = useState<Bank[]>(POPULAR_BANKS);
  const [isBankOpen, setIsBankOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const bankRef = useRef<HTMLDivElement>(null);

  const [profileName, setProfileName] = useState(currentUser?.fullName || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({
    username: '', fullName: '', role: 'staff' as UserRole, password: ''
  });

  const [isTesting, setIsTesting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<'online' | 'offline' | 'checking' | 'connected' | 'searching'>('connected');

  const isAdmin = currentUser?.role === 'admin';

  // Chuyển hướng tab nếu chưa thiết lập giá vốn (Logic an toàn nhưng cho phép xem 'sync')
  useEffect(() => {
    if (!storeConfig.costPriceTypeId && activeTab !== 'prices' && activeTab !== 'sync') {
      setActiveTab('prices');
    }
  }, [storeConfig.costPriceTypeId, activeTab]);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const response = await fetch('https://api.vietqr.io/v2/banks');
        const data = await response.json();
        if (data.code === '00') {
          setBankList(data.data.map((b: any) => ({
            id: b.bin,
            shortName: b.shortName,
            name: b.name,
            logo: b.logo,
            code: b.code
          })));
        }
      } catch (e) { console.warn('Bank fetch failed'); }
    };
    fetchBanks();
    
    // Logic click outside cho bank selector
    const handleClickOutside = (event: MouseEvent) => {
      if (bankRef.current && !bankRef.current.contains(event.target as Node)) {
        setIsBankOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (editingUser) {
      setUserFormData({
        username: editingUser.username,
        fullName: editingUser.fullName,
        role: editingUser.role,
        password: ''
      });
    } else {
      setUserFormData({ username: '', fullName: '', role: 'staff', password: '' });
    }
  }, [editingUser, isUserModalOpen]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const notification = document.createElement('div');
    notification.className = `fixed top-10 right-10 z-[300] ${type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300`;
    notification.innerHTML = `<span class="font-bold text-sm">${message}</span>`;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.classList.add('animate-out', 'fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  };

  const handleUpdateProfile = async () => {
    if (!currentUser) return;
    if (newPassword && newPassword !== confirmPassword) {
      showToast("Mật khẩu xác nhận không khớp.", "error");
      return;
    }
    setIsSavingProfile(true);
    try {
      const updatedUser = { ...currentUser, fullName: profileName };
      if (newPassword) {
        const newSalt = generateSalt();
        updatedUser.passwordSalt = newSalt;
        updatedUser.passwordHash = await hashPassword(newPassword, newSalt);
        updatedUser.synced = 0;
      }
      await updateUser(updatedUser);
      setNewPassword('');
      setConfirmPassword('');
      showToast("Cập nhật hồ sơ thành công!");
    } catch (e) {
      showToast("Lỗi hệ thống.", "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await updateUser({ ...editingUser, fullName: userFormData.fullName, role: userFormData.role, synced: 0 });
        showToast("Đã cập nhật nhân viên.");
      } else {
        const normalizedUsername = userFormData.username.toLowerCase().trim();
        const existing = await db.users.where('username').equals(normalizedUsername).first();
        if (existing) {
          showToast(`Tên đăng nhập "@${normalizedUsername}" đã tồn tại.`, "error");
          return;
        }
        await addUser(normalizedUsername, userFormData.fullName, userFormData.role, userFormData.password);
        showToast("Thêm nhân viên thành công!", "success");
      }
      setIsUserModalOpen(false);
    } catch (e) {
      showToast("Lỗi khi lưu.", "error");
    }
  };

  const handleAdd = () => {
    if (!newValue.trim()) return;
    if (activeTab === 'prices') addPriceType(newValue);
    else if (activeTab === 'groups') addProductGroup(newValue);
    setNewValue('');
  };

  const handleStartEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditValue(name);
  };

  const handleSaveEdit = async () => {
    if (!editValue.trim() || !editingId) return;
    if (activeTab === 'prices') await updatePriceType(editingId, editValue);
    else if (activeTab === 'groups') await updateProductGroup(editingId, editValue);
    setEditingId(null);
  };

  const handleTestPrint = async () => {
    if (isTesting) return;
    setIsTesting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsTesting(false);
    showToast("Đã gửi lệnh in thử thành công!");
  };

  const handleConnectPrinter = async () => {
    setIsConnecting(true);
    setPrinterStatus('searching');
    await new Promise(resolve => setTimeout(resolve, 2000));
    setPrinterStatus('connected');
    setIsConnecting(false);
  };

  const selectedBank = bankList.find(b => b.code === storeConfig.bankId);
  const filteredBanks = bankList.filter(b => 
    b.name.toLowerCase().includes(bankSearch.toLowerCase()) || 
    b.shortName.toLowerCase().includes(bankSearch.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24 font-sans">
      {(error) && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[250] w-full max-w-md px-4 animate-in slide-in-from-top-4">
          <div className="bg-rose-50 border border-rose-200 p-5 rounded-3xl shadow-2xl flex items-center space-x-3 text-rose-700">
            <AlertCircle size={24} className="shrink-0" />
            <p className="text-sm font-bold">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-rose-100 rounded-full">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {deleteId && (
        <ConfirmDialog 
          title="Xác nhận xóa?"
          message="Hành động này không thể hoàn tác. Các liên kết dữ liệu cũ có thể bị ảnh hưởng."
          onConfirm={async () => {
            try {
              if (activeTab === 'prices') await deletePriceType(deleteId);
              else if (activeTab === 'groups') await deleteProductGroup(deleteId);
              setDeleteId(null);
            } catch(e) {}
          }}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {userToDelete && (
        <ConfirmDialog 
          title="Xóa nhân viên?"
          message={`Xác nhận xóa tài khoản ${userToDelete.fullName}.`}
          onConfirm={async () => {
            await deleteUser(userToDelete.id);
            setUserToDelete(null);
            showToast("Xóa tài khoản nhân viên thành công.");
          }}
          onCancel={() => setUserToDelete(null)}
        />
      )}

      <div>
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Cài đặt hệ thống</h1>
        <p className="text-slate-500 text-sm font-medium">Cấu hình vận hành và kết nối LAN Cloud.</p>
      </div>

      <div className="flex flex-wrap bg-white p-2 rounded-[24px] border border-slate-100 shadow-sm w-full gap-2 sticky top-16 z-20 overflow-visible">
        {(['prices', 'groups', 'loyalty', 'store', 'printer', 'account', 'sync'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center justify-center space-x-2 px-5 py-3 rounded-2xl font-bold transition-all whitespace-nowrap flex-grow sm:flex-grow-0 ${
              activeTab === tab ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-50'
            } ${!storeConfig.costPriceTypeId && tab !== 'prices' && tab !== 'sync' ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
          >
            {tab === 'prices' && <Tag size={18} />}
            {tab === 'groups' && <Layers size={18} />}
            {tab === 'loyalty' && <Crown size={18} />}
            {tab === 'store' && <Store size={18} />}
            {tab === 'printer' && <Printer size={18} />}
            {tab === 'account' && <UserIcon size={18} />}
            {tab === 'sync' && <Cloud size={18} />}
            <span className="text-sm">
              {tab === 'prices' ? 'Loại giá' : tab === 'groups' ? 'Nhóm hàng' : tab === 'loyalty' ? 'Thân thiết' : tab === 'store' ? 'Gian hàng' : tab === 'printer' ? 'Máy in' : tab === 'account' ? 'Tài khoản' : 'Kết nối'}
            </span>
          </button>
        ))}
      </div>

      {activeTab === 'sync' ? (
        <div className="space-y-8 animate-in slide-in-from-bottom-2">
           <section className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-6 md:p-10 space-y-10 overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-50 pb-8">
                 <div className="flex items-center space-x-5">
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl shrink-0 shadow-sm border border-indigo-100"><Cloud size={28} /></div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">PocketBase LAN Sync</h3>
                        <p className="text-xs text-slate-500 font-medium mt-1">Đồng bộ tự động khi kết nối mạng LAN cửa hàng.</p>
                    </div>
                 </div>
                 <div className={`px-4 py-2 rounded-2xl border flex items-center space-x-2 ${isServerOnline ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                    <div className={`w-2 h-2 rounded-full ${isServerOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                    <span className="text-[10px] font-black uppercase tracking-widest">
                       {isServerOnline ? 'Server Online' : 'Server Offline'}
                    </span>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                   <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 space-y-4">
                      <div className="flex items-center space-x-3 text-indigo-600">
                         <Globe size={18} />
                         <span className="text-[10px] font-black uppercase tracking-widest">Cơ chế Hybrid Sync</span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed">
                         Ứng dụng ưu tiên lưu trữ cục bộ (Local-first). Khi kết nối vào mạng LAN tại quầy, dữ liệu sẽ tự động đồng bộ với máy chủ trung tâm.
                      </p>
                   </div>
                </div>

                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">IP Máy chủ PocketBase</label>
                      <div className="relative group">
                        <Server className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input 
                          className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-[24px] font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-50 transition-all" 
                          value={storeConfig.backendUrl || ''} 
                          onChange={(e) => updateStoreConfig({...storeConfig, backendUrl: e.target.value})}
                          placeholder="http://192.168.1.50:8090" 
                        />
                      </div>
                      <p className="text-[9px] text-slate-400 font-medium italic">* Vui lòng nhập địa chỉ IP tĩnh của máy chủ tại quầy.</p>
                   </div>

                   <button 
                     onClick={syncData}
                     disabled={isSyncing || !storeConfig.backendUrl}
                     className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 flex items-center justify-center space-x-3 hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50"
                   >
                     {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <Zap size={18} />}
                     <span>ĐỒNG BỘ THỦ CÔNG</span>
                   </button>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-50">
                 <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                       <div className="p-3 bg-white rounded-2xl shadow-sm text-slate-400"><RefreshCw size={20} /></div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái dữ liệu</p>
                          <p className="text-xs font-bold text-slate-700 mt-0.5">
                             {totalUnsynced > 0 ? `Còn ${totalUnsynced} thay đổi chưa đồng bộ` : `Dữ liệu đã đồng nhất (Lần cuối: ${lastSync ? new Date(lastSync).toLocaleTimeString() : 'Chưa đồng bộ'})`}
                          </p>
                       </div>
                    </div>
                    {isSyncing && <Loader2 className="animate-spin text-indigo-600" size={20} />}
                 </div>
              </div>
           </section>
        </div>
      ) : activeTab === 'account' ? (
        <div className="space-y-8 animate-in slide-in-from-bottom-2">
           <section className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-6 md:p-10 space-y-8">
              <div className="flex items-center space-x-5 border-b border-slate-50 pb-8">
                 <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl shrink-0 shadow-sm border border-indigo-100"><ShieldCheck size={28} /></div>
                 <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Hồ sơ cá nhân</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Cập nhật thông tin đăng nhập và hiển thị của bạn.</p>
                 </div>
              </div>
              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên</label>
                  <div className="relative">
                    <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-[22px] font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu mới</label>
                    <div className="relative group">
                      <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input type={showNewPassword ? "text" : "password"} className="w-full pl-14 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-[22px] font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Để trống nếu không đổi" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300">
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Xác nhận mật khẩu</label>
                    <input type="password" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[22px] font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Nhập lại mật khẩu" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button onClick={handleUpdateProfile} disabled={isSavingProfile} className="w-full md:w-auto px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl">
                  {isSavingProfile ? <Loader2 size={16} className="animate-spin" /> : 'LƯU HỒ SƠ'}
                </button>
              </div>
           </section>

           {isAdmin && (
             <section className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 md:p-10 border-b border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                   <div className="flex items-center space-x-5 self-start">
                      <div className="p-4 bg-emerald-50 text-emerald-600 rounded-3xl shrink-0 shadow-sm border border-emerald-100"><UsersIcon size={28} /></div>
                      <div>
                         <h3 className="text-lg font-black text-slate-800 tracking-tight">Quản lý nhân sự</h3>
                         <p className="text-xs text-slate-500 font-medium mt-1 leading-tight">Danh sách nhân viên vận hành hệ thống.</p>
                      </div>
                   </div>
                   <button onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }} className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center space-x-2">
                     <UserPlus size={18} /> <span>Thêm nhân viên</span>
                   </button>
                </div>
                
                <div className="hidden md:block overflow-x-auto scrollbar-hide">
                   <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                         <tr className="bg-slate-50/50">
                            <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhân viên</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Quyền hạn</th>
                            <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {users.map(user => (
                           <tr key={user.id} className="hover:bg-slate-50/50 group transition-all">
                              <td className="px-10 py-5">
                                 <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs border border-slate-200 shrink-0">
                                       {user.fullName.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                       <div className="flex items-center space-x-2">
                                         <p className="font-bold text-slate-800 truncate">{user.fullName}</p>
                                         {user.synced === 0 && (
                                           <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded border border-amber-100 flex items-center space-x-1 shrink-0">
                                              <CloudOff size={8} />
                                              <span className="text-[7px] font-black uppercase">Chưa đồng bộ</span>
                                           </span>
                                         )}
                                       </div>
                                       <p className="text-[10px] text-slate-400 font-mono tracking-tighter">@{user.username}</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-5 text-center">
                                 <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${user.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500'}`}>
                                    {user.role === 'admin' ? 'Quản trị' : 'Nhân viên'}
                                 </span>
                              </td>
                              <td className="px-10 py-5 text-right whitespace-nowrap">
                                 <div className="flex items-center justify-end space-x-1">
                                    <button onClick={async () => {
                                      await resetUserPassword(user.id, 'user@123');
                                      showToast(`Đặt lại mật khẩu cho ${user.fullName} thành công: user@123`);
                                    }} className="p-2.5 text-slate-300 hover:text-amber-600 hover:bg-white rounded-xl shadow-sm transition-all" title="Reset mật khẩu"><RotateCcw size={18} /></button>
                                    <button onClick={() => { setEditingUser(user); setIsUserModalOpen(true); }} className="p-2.5 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-xl shadow-sm transition-all" title="Sửa"><Edit2 size={18} /></button>
                                    <button onClick={() => setUserToDelete(user)} disabled={user.id === currentUser?.id} className="p-2.5 text-slate-300 hover:text-red-600 hover:bg-white rounded-xl shadow-sm transition-all disabled:opacity-30" title="Xóa"><Trash2 size={18} /></button>
                                 </div>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>

                <div className="md:hidden p-4 space-y-3">
                   {users.map(user => (
                     <div key={user.id} className="bg-slate-50 p-5 rounded-[24px] border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 font-black text-xs border border-slate-200">
                                 {user.fullName.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                 <div className="flex items-center space-x-2">
                                   <p className="font-bold text-slate-800 text-sm leading-tight">{user.fullName}</p>
                                   {user.synced === 0 && <CloudOff size={10} className="text-amber-500" />}
                                 </div>
                                 <p className="text-[10px] text-slate-400 font-mono">@{user.username}</p>
                              </div>
                           </div>
                           <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase rounded-full ${user.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-white text-slate-400'}`}>
                              {user.role === 'admin' ? 'Admin' : 'Staff'}
                           </span>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-slate-200/50">
                           <button onClick={async () => {
                             await resetUserPassword(user.id, 'user@123');
                             showToast("Reset mật khẩu thành công.");
                           }} className="flex-1 py-2.5 bg-white border border-slate-200 rounded-xl text-amber-600 font-black text-[9px] uppercase">Reset Pass</button>
                           <button onClick={() => { setEditingUser(user); setIsUserModalOpen(true); }} className="flex-1 py-2.5 bg-white border border-slate-200 rounded-xl text-indigo-600 font-black text-[9px] uppercase">Sửa</button>
                           <button onClick={() => setUserToDelete(user)} disabled={user.id === currentUser?.id} className="flex-1 py-2.5 bg-white border border-slate-200 rounded-xl text-red-500 font-black text-[9px] uppercase disabled:opacity-30">Xóa</button>
                        </div>
                     </div>
                   ))}
                </div>
             </section>
           )}

           {isUserModalOpen && (
             <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                <div className="bg-white w-full max-w-lg rounded-[40px] shadow-3xl overflow-hidden animate-in zoom-in-95 h-full md:h-auto overflow-y-auto">
                   <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                      <h2 className="text-[11px] font-black uppercase tracking-widest">{editingUser ? 'Cập nhật nhân viên' : 'Thêm nhân viên mới'}</h2>
                      <button onClick={() => setIsUserModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-300"><X size={20} /></button>
                   </div>
                   <form onSubmit={handleUserSubmit} className="p-8 space-y-6">
                      {!editingUser && (
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên đăng nhập *</label>
                           <input required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-50 font-bold text-sm" value={userFormData.username} onChange={(e) => setUserFormData({...userFormData, username: e.target.value.toLowerCase()})} placeholder="VD: nhanvien01" />
                        </div>
                      )}
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên *</label>
                         <input required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-50 font-bold text-sm" value={userFormData.fullName} onChange={(e) => setUserFormData({...userFormData, fullName: e.target.value})} placeholder="Nguyễn Văn A" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quyền hạn *</label>
                         <div className="grid grid-cols-2 gap-3">
                            <button type="button" onClick={() => setUserFormData({...userFormData, role: 'admin'})} className={`py-4 rounded-2xl font-black text-[10px] uppercase border transition-all ${userFormData.role === 'admin' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>Quản trị</button>
                            <button type="button" onClick={() => setUserFormData({...userFormData, role: 'staff'})} className={`py-4 rounded-2xl font-black text-[10px] uppercase border transition-all ${userFormData.role === 'staff' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>Nhân viên</button>
                         </div>
                      </div>
                      {!editingUser && (
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu ban đầu *</label>
                           <input required type="password" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-50 font-bold text-sm" value={userFormData.password} onChange={(e) => setUserFormData({...userFormData, password: e.target.value})} placeholder="••••••••" />
                        </div>
                      )}
                      <div className="pt-4 flex gap-3">
                         <button type="button" onClick={() => setIsUserModalOpen(false)} className="flex-1 py-4 font-black text-slate-400 text-[11px] uppercase tracking-widest">Hủy</button>
                         <button type="submit" className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase shadow-xl hover:bg-emerald-600 tracking-widest">Lưu</button>
                      </div>
                   </form>
                </div>
             </div>
           )}
        </div>
      ) : activeTab === 'store' ? (
        <div className="space-y-8 animate-in slide-in-from-bottom-2">
           <section className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-6 md:p-10 overflow-hidden relative">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-10">
                 <div className="flex items-center space-x-6">
                    <div className="p-5 bg-indigo-50 text-indigo-600 rounded-[28px] shrink-0 shadow-sm border border-indigo-100/50">
                       <Store size={32} />
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-2">Thông tin gian hàng</h3>
                       <p className="text-sm text-slate-400 font-medium">Hồ sơ thương hiệu.</p>
                    </div>
                 </div>
                 
                 {!isAdmin && <AdminOnlyBadge />}
              </div>

              <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${!isAdmin ? 'opacity-70 pointer-events-none' : ''}`}>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên gian hàng</label>
                  <input 
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[22px] font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" 
                    value={storeConfig.name} 
                    onChange={(e) => updateStoreConfig({...storeConfig, name: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số điện thoại</label>
                  <div className="relative">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-[22px] font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" 
                      value={storeConfig.phone} 
                      onChange={(e) => updateStoreConfig({...storeConfig, phone: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Địa chỉ gian hàng</label>
                  <div className="relative">
                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-[22px] font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" 
                      value={storeConfig.address} 
                      onChange={(e) => updateStoreConfig({...storeConfig, address: e.target.value})} 
                    />
                  </div>
                </div>
              </div>
           </section>

           {/* KHỐI CẢNH BÁO TỒN KHO - TÁCH RIÊNG */}
           <section className="bg-white rounded-[40px] border border-amber-100 shadow-sm p-6 md:p-10 overflow-hidden relative bg-amber-50/20">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                 <div className="flex items-center space-x-6">
                    <div className="p-5 bg-amber-100 text-amber-600 rounded-[28px] shrink-0 shadow-sm border border-amber-200">
                       <Package size={32} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-2">Cảnh báo tồn kho</h3>
                        <p className="text-sm text-slate-400 font-medium">Ngưỡng tự động đánh dấu hàng hóa sắp hết.</p>
                    </div>
                 </div>
                 {!isAdmin && <AdminOnlyBadge />}
              </div>

              <div className={`mt-8 max-w-sm ${!isAdmin ? 'opacity-70 pointer-events-none' : ''}`}>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số lượng ngưỡng cảnh báo</label>
                    <div className="relative">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300">
                        <AlertTriangle size={18} />
                      </div>
                      <input 
                        type="number"
                        className="w-full pl-14 pr-6 py-4 bg-white border border-amber-200 rounded-[22px] font-black text-slate-800 outline-none focus:ring-4 focus:ring-amber-100 transition-all text-sm shadow-inner" 
                        value={storeConfig.lowStockThreshold || 0} 
                        onChange={(e) => updateStoreConfig({...storeConfig, lowStockThreshold: Number(e.target.value)})} 
                        placeholder="VD: 10"
                      />
                    </div>
                    <p className="text-[9px] text-amber-600 font-bold italic leading-relaxed">
                      * Các sản phẩm có số lượng tồn kho nhỏ hơn hoặc bằng mức này sẽ hiển thị cảnh báo đỏ trên toàn hệ thống.
                    </p>
                 </div>
              </div>
           </section>

           <section className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-6 md:p-10 overflow-hidden relative" ref={bankRef}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-10">
                 <div className="flex items-center space-x-6">
                    <div className="p-5 bg-emerald-50 text-emerald-600 rounded-[28px] shrink-0 shadow-sm border border-emerald-100/50">
                       <CreditCard size={32} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-2">Thanh toán VietQR</h3>
                        <p className="text-sm text-slate-400 font-medium">Cấu hình tài khoản nhận tiền.</p>
                    </div>
                 </div>

                 {!isAdmin && <AdminOnlyBadge />}
              </div>

              <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 ${!isAdmin ? 'opacity-70 pointer-events-none' : ''}`}>
                 <div className="space-y-2 relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngân hàng thụ hưởng</label>
                    <div 
                      onClick={() => isAdmin && setIsBankOpen(!isBankOpen)}
                      className={`w-full px-5 py-4 bg-white border rounded-[24px] font-black flex items-center justify-between transition-all ${isAdmin ? 'cursor-pointer border-slate-200 hover:border-indigo-300 shadow-sm' : 'bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed'} ${isBankOpen ? 'border-indigo-500 ring-4 ring-indigo-50' : ''}`}
                    >
                      <span className="text-sm truncate">{selectedBank?.shortName || 'Chọn ngân hàng...'}</span>
                      {isAdmin && <ChevronDown size={20} className={`text-slate-300 transition-transform ${isBankOpen ? 'rotate-180' : ''}`} />}
                    </div>

                    {isAdmin && isBankOpen && (
                      <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[32px] shadow-3xl border border-slate-100 z-[100] overflow-hidden">
                        <div className="p-4 border-b border-slate-50">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                            <input placeholder="Tìm ngân hàng..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none font-bold" value={bankSearch} onChange={(e) => setBankSearch(e.target.value)} />
                          </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto p-2 scrollbar-hide">
                          {filteredBanks.map(b => (
                            <div key={b.id} onClick={() => { updateStoreConfig({ ...storeConfig, bankId: b.code }); setIsBankOpen(false); }} className={`p-3 rounded-2xl flex items-center space-x-3 cursor-pointer hover:bg-slate-50 transition-all ${storeConfig.bankId === b.code ? 'bg-indigo-50 text-indigo-600' : ''}`}>
                              <img src={b.logo} className="w-8 h-8 object-contain rounded-lg" alt="" />
                              <div className="flex flex-col">
                                 <span className="text-xs font-black">{b.shortName}</span>
                                 <span className="text-[10px] text-slate-400 leading-none">{b.code}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số tài khoản</label>
                    <input 
                      disabled={!isAdmin}
                      className={`w-full px-6 py-4 border rounded-[22px] font-black text-sm outline-none transition-all ${isAdmin ? 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-indigo-500' : 'bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed'}`} 
                      value={storeConfig.bankAccount || ''} 
                      onChange={(e) => updateStoreConfig({...storeConfig, bankAccount: e.target.value})} 
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chủ tài khoản (Không dấu)</label>
                    <input 
                      disabled={!isAdmin}
                      className={`w-full px-6 py-4 border rounded-[22px] font-black text-sm outline-none uppercase transition-all ${isAdmin ? 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-indigo-500' : 'bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed'}`} 
                      value={storeConfig.bankAccountName || ''} 
                      onChange={(e) => updateStoreConfig({...storeConfig, bankAccountName: e.target.value.toUpperCase()})} 
                    />
                 </div>
              </div>
           </section>
        </div>
      ) : activeTab === 'printer' ? (
        <div className="space-y-8 animate-in slide-in-from-bottom-2">
           <section className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-6 md:p-10 space-y-10 overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-50 pb-8 bg-slate-50/30 -mx-10 px-10">
                <div className="flex items-center space-x-5">
                   <div className={`p-4 rounded-2xl shadow-sm transition-colors shrink-0 ${printerStatus === 'connected' ? 'bg-emerald-500 text-white' : printerStatus === 'searching' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {printerStatus === 'connected' ? <Printer size={32} /> : printerStatus === 'searching' ? <RefreshCw size={32} className="animate-spin" /> : <Unplug size={32} />}
                   </div>
                   <div className="min-w-0">
                      <h3 className="text-lg font-black text-slate-800 tracking-tight truncate">{printerStatus === 'connected' ? storeConfig.printerName || 'Máy in hóa đơn' : 'Chưa thiết lập máy in'}</h3>
                      <div className="flex items-center space-x-3 mt-1">
                         <span className={`text-[10px] font-black uppercase tracking-widest ${printerStatus === 'connected' ? 'text-emerald-500' : printerStatus === 'searching' ? 'text-amber-500' : 'text-slate-400'}`}>
                           {printerStatus === 'connected' ? 'Online' : printerStatus === 'searching' ? 'Đang quét...' : 'Offline'}
                         </span>
                         {printerStatus === 'connected' && <span className="hidden sm:flex text-xs font-bold text-slate-400 items-center"><Network size={12} className="mr-1" /> {storeConfig.printerIp}</span>}
                      </div>
                   </div>
                </div>
                <div className="flex gap-3">
                   <button onClick={handleConnectPrinter} disabled={isConnecting} className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-lg uppercase hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2">
                     {isConnecting ? <RefreshCw size={16} className="animate-spin" /> : <Cable size={16} />}
                     <span>Kết nối</span>
                   </button>
                   <button onClick={handleTestPrint} disabled={isTesting || printerStatus !== 'connected'} className="flex-1 md:flex-none px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase hover:bg-slate-50 transition-all flex items-center justify-center space-x-2 shadow-sm">
                     {isTesting ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                     <span>In thử</span>
                   </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên định danh máy in</label>
                  <input className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none text-sm" value={storeConfig.printerName} onChange={(e) => updateStoreConfig({...storeConfig, printerName: e.target.value})} />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">IP Address / Port</label>
                  <input className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono font-bold outline-none text-sm" value={storeConfig.printerIp} onChange={(e) => updateStoreConfig({...storeConfig, printerIp: e.target.value})} placeholder="192.168.1.100" />
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Giao thức kết nối</h4>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => updateStoreConfig({...storeConfig, printerType: 'wired'})} className={`p-6 rounded-[32px] border-2 transition-all flex flex-col items-center gap-3 ${storeConfig.printerType === 'wired' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}>
                      <Cable size={32} /><span className="text-[10px] font-black uppercase leading-tight">Có dây (USB/LAN)</span>
                    </button>
                    <button onClick={() => updateStoreConfig({...storeConfig, printerType: 'wireless'})} className={`p-6 rounded-[32px] border-2 transition-all flex flex-col items-center gap-3 ${storeConfig.printerType === 'wireless' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}>
                      <Wifi size={32} /><span className="text-[10px] font-black uppercase leading-tight">Không dây (Wi-Fi)</span>
                    </button>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-50 space-y-6">
                <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Khổ giấy in mặc định</h4>
                <div className="grid grid-cols-3 gap-3">
                    {(['58mm', '80mm', 'A4'] as const).map(size => (
                      <button 
                        key={size}
                        onClick={() => updateStoreConfig({...storeConfig, printerPaperSize: size})}
                        className={`p-5 rounded-[24px] border-2 transition-all flex flex-col items-center gap-2 ${storeConfig.printerPaperSize === size ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}
                      >
                         <FileText size={24} />
                         <span className="text-[10px] font-black uppercase tracking-tight">{size}</span>
                      </button>
                    ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                 <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                    <div>
                       <p className="text-sm font-bold text-slate-800">Tự động in sau khi bán</p>
                       <p className="text-[10px] text-slate-500 font-medium">Mở hộp thoại in ngay khi lưu đơn.</p>
                    </div>
                    <button onClick={() => updateStoreConfig({...storeConfig, printerAutoPrint: !storeConfig.printerAutoPrint})} className="text-indigo-600">
                       {storeConfig.printerAutoPrint ? <ToggleRight size={44} /> : <ToggleLeft size={44} className="text-slate-300" />}
                    </button>
                 </div>
                 <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                    <p className="text-sm font-bold text-slate-800">Số lượng bản in</p>
                    <div className="flex items-center space-x-3 bg-white rounded-2xl border border-slate-200 p-1.5 shadow-sm">
                       <button onClick={() => updateStoreConfig({...storeConfig, printerCopies: Math.max(1, (storeConfig.printerCopies || 1) - 1)})} className="p-1.5 text-slate-400 hover:text-indigo-600"><Minus size={12} /></button>
                       <span className="w-8 text-center font-black text-base">{storeConfig.printerCopies || 1}</span>
                       <button onClick={() => updateStoreConfig({...storeConfig, printerCopies: (storeConfig.printerCopies || 1) + 1})} className="p-1.5 text-slate-400 hover:text-indigo-600"><Plus size={12} /></button>
                    </div>
                 </div>
              </div>
           </section>
        </div>
      ) : activeTab === 'loyalty' ? (
        <div className="space-y-8 animate-in slide-in-from-bottom-2">
           <section className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-6 md:p-10 space-y-10 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-50 pb-8">
                 <div className="flex items-center space-x-5">
                    <div className={`p-4 rounded-3xl shrink-0 shadow-sm transition-colors duration-500 ${loyaltyConfig?.enabled ? 'bg-amber-50 text-amber-500 border border-amber-100' : 'bg-slate-50 text-slate-300'}`}>
                       <Crown size={28} />
                    </div>
                    <div className="min-w-0">
                       <h3 className="text-lg font-black text-slate-800 tracking-tight">Xếp hạng khách hàng VIP</h3>
                       <p className="text-xs text-slate-500 font-medium mt-1 leading-tight">Cấu hình ngưỡng tự động nâng hạng khách hàng.</p>
                    </div>
                 </div>
                 <button onClick={() => isAdmin && updateLoyaltyConfig({...loyaltyConfig!, enabled: !loyaltyConfig?.enabled})} className={`w-16 h-8 rounded-full relative transition-all duration-300 shadow-inner shrink-0 ${loyaltyConfig?.enabled ? 'bg-indigo-600' : 'bg-slate-200'} ${!isAdmin ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${loyaltyConfig?.enabled ? 'left-9' : 'left-1'}`} />
                 </button>
              </div>
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-10 transition-opacity ${(!loyaltyConfig?.enabled || !isAdmin) ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chi tiêu tích lũy tối thiểu</label>
                    <div className="relative group">
                       <DollarSign size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                       <input type="text" className="w-full pl-14 pr-12 py-5 bg-slate-50 border border-slate-200 rounded-[24px] font-black text-xl text-slate-800 focus:ring-4 focus:ring-amber-50 outline-none transition-all" value={loyaltyConfig?.minSpend.toLocaleString() || '0'} onChange={(e) => updateLoyaltyConfig({...loyaltyConfig!, minSpend: Number(e.target.value.replace(/\D/g, ''))})} />
                    </div>
                 </div>
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tổng đơn hàng tối thiểu</label>
                    <div className="relative group">
                       <ShoppingBag size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                       <input type="number" className="w-full pl-14 pr-12 py-5 bg-slate-50 border border-slate-200 rounded-[24px] font-black text-xl text-slate-800 focus:ring-4 focus:ring-indigo-50 outline-none transition-all" value={loyaltyConfig?.minOrders || 0} onChange={(e) => updateLoyaltyConfig({...loyaltyConfig!, minOrders: Number(e.target.value)})} />
                    </div>
                 </div>
              </div>
           </section>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === 'prices' && (
            <div className={`p-6 rounded-[32px] border flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-top-2 shadow-sm transition-all duration-300 ${!storeConfig.costPriceTypeId ? 'bg-rose-50 border-rose-400 ring-4 ring-rose-200/50 animate-pulse' : 'bg-amber-50 border-amber-100'}`}>
              <div className={`p-4 rounded-2xl shadow-sm shrink-0 border ${!storeConfig.costPriceTypeId ? 'bg-rose-600 text-white border-rose-500' : 'bg-white text-amber-600 border-amber-100'}`}>
                {!storeConfig.costPriceTypeId ? <AlertCircle size={32} /> : <BoxSelect size={32} />}
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start space-x-2 mb-1">
                  <h4 className={`font-black uppercase tracking-widest text-[10px] ${!storeConfig.costPriceTypeId ? 'text-rose-700' : 'text-amber-800'}`}>Thiết lập giá nhập kho (Giá vốn)</h4>
                  {!storeConfig.costPriceTypeId && (
                    <span className="px-2 py-0.5 bg-rose-600 text-white text-[8px] font-black rounded-md animate-bounce uppercase tracking-tighter">BẮT BUỘC</span>
                  )}
                </div>
                <p className={`text-xs font-medium leading-relaxed italic ${!storeConfig.costPriceTypeId ? 'text-rose-600' : 'text-amber-600'}`}>Chọn một loại giá để làm căn cứ tính toán lợi nhuận khi bán hàng.</p>
              </div>
              <div className="relative w-full md:w-auto">
                <select disabled={!isAdmin} className={`w-full md:w-auto pl-6 pr-12 py-4 bg-white border rounded-2xl outline-none font-black text-sm appearance-none shadow-sm ${isAdmin ? (!storeConfig.costPriceTypeId ? 'border-rose-400 focus:ring-2 focus:ring-rose-500 text-rose-900' : 'border-amber-200 focus:ring-2 focus:ring-amber-500 text-amber-900') : 'border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed'} min-w-[220px] cursor-pointer`} value={storeConfig.costPriceTypeId} onChange={(e) => updateStoreConfig({...storeConfig, costPriceTypeId: e.target.value})}>
                  <option value="" disabled>--- Chọn loại giá vốn ---</option>
                  {priceTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {isAdmin && <ChevronDown size={18} className={`absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none ${!storeConfig.costPriceTypeId ? 'text-rose-400' : 'text-amber-400'}`} />}
              </div>
            </div>
          )}

          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            {isAdmin && (
              <div className="p-4 md:p-6 border-b border-slate-50 bg-slate-50/30 flex flex-col sm:flex-row gap-4">
                <input 
                  className="flex-1 px-5 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" 
                  placeholder={activeTab === 'prices' ? "VD: Giá sỉ, Giá dự án..." : "VD: Điện gia dụng, Thời trang..."} 
                  value={newValue} 
                  onChange={(e) => setNewValue(e.target.value)} 
                />
                <button onClick={handleAdd} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg hover:bg-indigo-700 transition-all active:scale-95">
                  <Plus size={18} /> <span>Thêm mới</span>
                </button>
              </div>
            )}
            <div className="divide-y divide-slate-50">
              {(activeTab === 'prices' ? priceTypes : productGroups).map((item) => {
                const isCostPrice = activeTab === 'prices' && storeConfig.costPriceTypeId === item.id;
                return (
                  <div key={item.id} className="p-5 md:p-6 flex items-center justify-between group hover:bg-slate-50/50 transition-all gap-4">
                    <div className="flex items-center space-x-4 min-w-0 flex-1">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:bg-white group-hover:shadow-sm transition-all shrink-0 border border-slate-200/30">
                        {activeTab === 'prices' ? <Tag size={20} /> : <Layers size={20} />}
                      </div>
                      
                      {editingId === item.id ? (
                        <div className="flex flex-1 items-center gap-2 max-w-md">
                          <input className="flex-1 px-4 py-2 border-2 border-indigo-600 rounded-xl font-bold outline-none text-sm" autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()} />
                          <button onClick={handleSaveEdit} className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg active:scale-90 transition-all"><Check size={18} /></button>
                          <button onClick={() => setEditingId(null)} className="p-2.5 bg-slate-100 text-slate-400 rounded-xl active:scale-90 transition-all"><X size={18} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 min-w-0 flex-1 flex-wrap md:flex-nowrap">
                          <div className="flex flex-col min-w-0 justify-center">
                            <div className="flex items-center space-x-2">
                               <span className="font-black text-slate-800 text-sm md:text-base leading-none truncate">{item.name}</span>
                               {item.synced === 0 && (
                                 <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded border border-amber-100 flex items-center space-x-1 shrink-0">
                                    <CloudOff size={8} />
                                    <span className="text-[7px] font-black uppercase">Chưa đồng bộ</span>
                                 </span>
                               )}
                            </div>
                            <p className="text-[9px] text-slate-400 font-mono uppercase tracking-tighter mt-1 whitespace-nowrap overflow-hidden">ID: {item.id}</p>
                          </div>
                          
                          {isCostPrice && (
                             <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FFF9E6] border border-[#FFE7A3] rounded-full shadow-sm scale-90 origin-left shrink-0">
                                <div className="w-4 h-4 bg-[#D97706] rounded-full flex items-center justify-center shrink-0">
                                   <Target size={10} className="text-white" />
                                </div>
                                <span className="text-[9px] font-black text-[#92400E] uppercase tracking-wider whitespace-nowrap">GIÁ NHẬP</span>
                             </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {isAdmin && (
                      <div className="flex items-center space-x-1 md:space-x-2 shrink-0">
                        {editingId !== item.id && (
                          <>
                            <button onClick={() => handleStartEdit(item.id, item.name)} className="p-2.5 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-xl shadow-sm transition-all" title="Chỉnh sửa"><Edit2 size={16} /></button>
                            <button onClick={() => setDeleteId(item.id)} className="p-2.5 text-slate-300 hover:text-red-600 hover:bg-white rounded-xl shadow-sm transition-all" title="Xóa"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {(activeTab === 'prices' ? priceTypes : productGroups).length === 0 && (
                 <div className="py-24 text-center opacity-20 italic">
                    <BoxSelect size={60} strokeWidth={1} className="mx-auto mb-4" />
                    <p className="text-xs font-black uppercase tracking-[0.4em]">Danh sách trống</p>
                 </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
