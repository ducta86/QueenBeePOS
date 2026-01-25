
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { db, hashPassword, generateSalt } from '../db';
import { 
  Plus, 
  Trash2, 
  Tag, 
  Layers, 
  X, 
  AlertTriangle, 
  Crown, 
  Store, 
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
  Edit2,
  Check,
  Info,
  CreditCard,
  Building,
  Search,
  ChevronDown,
  Loader2,
  UserCheck,
  AlertOctagon,
  User as UserIcon,
  ShieldCheck,
  Key,
  Users as UsersIcon,
  UserPlus,
  RotateCcw,
  ShieldAlert,
  BoxSelect,
  Lock,
  ChevronRight,
  Eye,
  EyeOff,
  AlertCircle,
  DollarSign,
  ShoppingBag
} from 'lucide-react';
import { User, UserRole } from '../types';

interface Bank {
  id: string;
  name: string;
  logo: string;
  shortName: string;
  code: string;
}

const POPULAR_BANKS: Bank[] = [
  { id: 'VCB', name: 'Vietcombank', logo: 'https://api.vietqr.io/img/VCB.png', shortName: 'Vietcombank', code: 'VCB' },
  { id: 'ICB', name: 'VietinBank', logo: 'https://api.vietqr.io/img/ICB.png', shortName: 'VietinBank', code: 'ICB' },
  { id: 'BIDV', name: 'BIDV', logo: 'https://api.vietqr.io/img/BIDV.png', shortName: 'BIDV', code: 'BIDV' },
  { id: 'VBA', name: 'Agribank', logo: 'https://api.vietqr.io/img/VBA.png', shortName: 'VBA', code: 'VBA' },
  { id: 'MB', name: 'MBBank', logo: 'https://api.vietqr.io/img/MB.png', shortName: 'MBBank', code: 'MB' },
  { id: 'TCB', name: 'Techcombank', logo: 'https://api.vietqr.io/img/TCB.png', shortName: 'Techcombank', code: 'TCB' },
  { id: 'ACB', name: 'ACB', logo: 'https://api.vietqr.io/img/ACB.png', shortName: 'ACB', code: 'ACB' },
  { id: 'TPB', name: 'TPBank', logo: 'https://api.vietqr.io/img/TPB.png', shortName: 'TPBank', code: 'TPB' },
];

const ConfirmDialog = ({ title, message, onConfirm, onCancel, type = 'danger', showConfirm = true }: any) => (
  <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
    <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8 text-center border border-slate-100">
      <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center ${type === 'danger' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
        {type === 'danger' ? <AlertTriangle size={32} /> : <Info size={32} />}
      </div>
      <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">{title}</h3>
      <p className="text-slate-500 mb-8 text-sm font-medium leading-relaxed">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-4 font-black text-slate-400 hover:bg-slate-50 rounded-2xl transition-all text-[11px] uppercase tracking-widest">
          {showConfirm ? 'Hủy bỏ' : 'Đã hiểu'}
        </button>
        {showConfirm && (
          <button onClick={onConfirm} className={`flex-1 py-4 font-black text-white rounded-2xl shadow-xl transition-all text-[11px] uppercase tracking-widest ${type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-100'}`}>
            Xác nhận
          </button>
        )}
      </div>
    </div>
  </div>
);

const Settings = () => {
  const { 
    priceTypes, addPriceType, updatePriceType, deletePriceType,
    productGroups, addProductGroup, updateProductGroup, deleteProductGroup,
    loyaltyConfig, updateLoyaltyConfig,
    storeConfig, updateStoreConfig,
    currentUser, users, addUser, updateUser, deleteUser, resetUserPassword,
    setError
  } = useStore();

  const [activeTab, setActiveTab] = useState<'prices' | 'groups' | 'loyalty' | 'store' | 'printer' | 'account'>('prices');
  const [newValue, setNewValue] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isBlockedDelete, setIsBlockedDelete] = useState(false);

  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const [profileName, setProfileName] = useState(currentUser?.fullName || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({
    username: '',
    fullName: '',
    role: 'staff' as UserRole,
    password: ''
  });

  const [bankList, setBankList] = useState<Bank[]>(POPULAR_BANKS);
  const [isBankOpen, setIsBankOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const bankRef = useRef<HTMLDivElement>(null);

  const [isTesting, setIsTesting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<'online' | 'offline' | 'checking' | 'connected' | 'searching'>('connected');

  const isAdmin = currentUser?.role === 'admin';

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
    setShowModalPassword(false);
  }, [editingUser, isUserModalOpen]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const notification = document.createElement('div');
    notification.className = `fixed top-10 right-10 z-[300] ${type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300`;
    notification.innerHTML = type === 'success' 
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg><span>${message}</span>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg><span>${message}</span>`;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.classList.add('animate-out', 'fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  };

  const handleUpdateProfile = async () => {
    if (!currentUser) return;
    
    if (newPassword && newPassword !== confirmPassword) {
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }

    setIsSavingProfile(true);
    try {
      const updatedUser = { ...currentUser, fullName: profileName };
      if (newPassword) {
        const newSalt = generateSalt();
        updatedUser.passwordSalt = newSalt;
        updatedUser.passwordHash = await hashPassword(newPassword, newSalt);
      }
      await updateUser(updatedUser);
      setNewPassword('');
      setConfirmPassword('');
      showToast("Cập nhật thông tin cá nhân thành công!");
    } catch (e) {
      setError("Không thể cập nhật thông tin.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await updateUser({ ...editingUser, fullName: userFormData.fullName, role: userFormData.role });
        showToast("Đã cập nhật thông tin nhân viên.");
      } else {
        if (!userFormData.username || !userFormData.password) return;
        
        // KIỂM TRA TRÙNG USERNAME TRƯỚC KHI LƯU
        const normalizedUsername = userFormData.username.toLowerCase().trim();
        const existing = await db.users.where('username').equals(normalizedUsername).first();
        
        if (existing) {
          setError(`Tên đăng nhập "@${normalizedUsername}" đã tồn tại trên hệ thống.`);
          // Không tắt modal, cho phép sửa lại username
          return; 
        }

        await addUser(normalizedUsername, userFormData.fullName, userFormData.role, userFormData.password);
        showToast("Thêm nhân viên mới thành công!");
      }
      setIsUserModalOpen(false);
      setEditingUser(null);
    } catch (e) {
      setError("Lỗi khi lưu thông tin nhân viên.");
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      await resetUserPassword(userId, 'user@123');
      alert("Mật khẩu đã được đặt lại thành: user@123");
    } catch (e) {
      setError("Không thể đặt lại mật khẩu.");
    }
  };

  const handleConfirmDeleteUser = (user: User) => {
    if (user.id === 'user-default') {
      alert("Tài khoản hệ thống không thể xóa.");
      return;
    }
    if (user.id === currentUser?.id) {
      alert("Bạn không thể tự xóa tài khoản đang đăng nhập.");
      return;
    }
    setUserToDelete(user);
  };

  const handleDeleteUserAction = async () => {
    if (userToDelete) {
      await deleteUser(userToDelete.id);
      setUserToDelete(null);
      showToast(`Đã xóa nhân viên ${userToDelete.fullName}`);
    }
  };

  const handleAdd = () => {
    if (!newValue.trim()) return;
    if (activeTab === 'prices') addPriceType(newValue);
    else if (activeTab === 'groups') addProductGroup(newValue);
    setNewValue('');
  };

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditValue(currentName);
  };

  const handleSaveEdit = async () => {
    if (!editValue.trim() || !editingId) return;
    if (activeTab === 'prices') await updatePriceType(editingId, editValue);
    else if (activeTab === 'groups') await updateProductGroup(editingId, editValue);
    setEditingId(null);
    setEditValue('');
  };

  const checkDeleteConstraint = async (id: string) => {
    if (activeTab === 'prices') {
      const inUseProduct = await db.productPrices.where('priceTypeId').equals(id).filter(p => p.price > 0).count();
      const inUseCustomer = await db.customers.where('typeId').equals(id).count();
      setIsBlockedDelete(inUseProduct > 0 || inUseCustomer > 0);
    } else {
      const count = await db.products.where('groupId').equals(id).count();
      setIsBlockedDelete(count > 0);
    }
    setDeleteConfirmId(id);
  };

  const handleTestPrint = async () => {
    if (isTesting) return;
    setIsTesting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsTesting(false);
    showToast("Lệnh in thử đã được gửi!");
  };

  const handleConnectPrinter = async () => {
    setIsConnecting(true);
    setPrinterStatus('searching');
    await new Promise(resolve => setTimeout(resolve, 2000));
    setPrinterStatus('connected');
    setIsConnecting(false);
  };

  const printerConfig = {
    status: printerStatus,
    printerName: storeConfig.printerName || '',
    printerIp: storeConfig.printerIp || '',
    connectionType: storeConfig.printerType || 'wireless',
    autoPrint: storeConfig.printerAutoPrint || false,
    copies: storeConfig.printerCopies || 1,
    paperSize: storeConfig.printerPaperSize || '80mm'
  };

  const updatePrinterConfig = (newCfg: any) => {
    updateStoreConfig({
      ...storeConfig,
      printerName: newCfg.printerName,
      printerIp: newCfg.printerIp,
      printerType: newCfg.connectionType,
      printerAutoPrint: newCfg.autoPrint,
      printerCopies: newCfg.copies,
      printerPaperSize: newCfg.paperSize
    });
  };

  const selectedBank = bankList.find(b => b.code === storeConfig.bankId || b.id === storeConfig.bankId);
  const filteredBanks = bankList.filter(b => 
    b.name.toLowerCase().includes(bankSearch.toLowerCase()) || 
    b.shortName.toLowerCase().includes(bankSearch.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      {deleteConfirmId && (
        <ConfirmDialog 
          title={isBlockedDelete ? "Không thể xóa" : "Xác nhận xóa?"}
          message={isBlockedDelete 
            ? "Mục này đang được sử dụng trong hệ thống. Bạn chỉ có thể chỉnh sửa." 
            : "Bạn có chắc chắn muốn xóa?"}
          type={isBlockedDelete ? 'info' : 'danger'}
          showConfirm={!isBlockedDelete}
          onConfirm={async () => {
            if (activeTab === 'prices') await deletePriceType(deleteConfirmId);
            else if (activeTab === 'groups') await deleteProductGroup(deleteConfirmId);
            setDeleteConfirmId(null);
          }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}

      {userToDelete && (
        <ConfirmDialog 
          title="Xóa nhân viên?"
          message={`Xác nhận xóa tài khoản ${userToDelete.fullName}. Hành động này không thể hoàn tác.`}
          onConfirm={handleDeleteUserAction}
          onCancel={() => setUserToDelete(null)}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cài đặt</h1>
        <p className="text-slate-500 text-sm font-medium">Thiết lập tham số vận hành và cấu hình tài khoản.</p>
      </div>

      <div className="flex flex-wrap bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm w-full gap-1.5 overflow-x-auto scrollbar-hide">
        {(['prices', 'groups', 'loyalty', 'store', 'printer', 'account'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            {tab === 'prices' && <Tag size={18} />}
            {tab === 'groups' && <Layers size={18} />}
            {tab === 'loyalty' && <Crown size={18} />}
            {tab === 'store' && <Store size={18} />}
            {tab === 'printer' && <Printer size={18} />}
            {tab === 'account' && <UserIcon size={18} />}
            <span className="text-sm">
              {tab === 'prices' ? 'Loại giá' : tab === 'groups' ? 'Nhóm hàng' : tab === 'loyalty' ? 'Thân thiết' : tab === 'store' ? 'Gian hàng' : tab === 'printer' ? 'Máy in' : 'Tài khoản'}
            </span>
          </button>
        ))}
      </div>

      {activeTab === 'account' ? (
        <div className="space-y-8 animate-in slide-in-from-bottom-2">
           <section className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-6 md:p-10 space-y-8">
              <div className="flex items-center space-x-5 border-b border-slate-50 pb-8">
                 <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl shrink-0 shadow-sm"><ShieldCheck size={28} /></div>
                 <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Hồ sơ cá nhân</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Cập nhật thông tin hiển thị và mật khẩu của bạn.</p>
                 </div>
              </div>
              
              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên hiển thị</label>
                  <div className="relative">
                    <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-[22px] font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" 
                      value={profileName} 
                      onChange={(e) => setProfileName(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu mới</label>
                    <div className="relative group">
                      <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={18} />
                      <input 
                        type={showNewPassword ? "text" : "password"}
                        className="w-full pl-14 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-[22px] font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" 
                        placeholder="Để trống nếu không đổi"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors focus:outline-none"
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nhập lại mật khẩu mới</label>
                    </div>
                    <div className="relative group">
                      <ShieldCheck className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${newPassword && confirmPassword ? (newPassword === confirmPassword ? 'text-emerald-500' : 'text-rose-500') : 'text-slate-300'}`} size={18} />
                      <input 
                        type={showConfirmPassword ? "text" : "password"}
                        className={`w-full pl-14 pr-12 py-4 bg-slate-50 border rounded-[22px] font-bold outline-none transition-all text-sm ${newPassword && confirmPassword && newPassword !== confirmPassword ? 'border-rose-200 focus:ring-rose-100 ring-2 ring-rose-50' : 'border-slate-200 focus:ring-indigo-100'}`} 
                        placeholder="Nhập lại mật khẩu mới"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors focus:outline-none"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  onClick={handleUpdateProfile}
                  disabled={isSavingProfile}
                  className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 flex items-center space-x-2"
                >
                  {isSavingProfile ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  <span>LƯU THAY ĐỔI</span>
                </button>
              </div>
           </section>

           {currentUser?.role === 'admin' && (
             <section className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 md:p-10 border-b border-slate-50 flex items-center justify-between gap-4">
                   <div className="flex items-center space-x-5">
                      <div className="p-4 bg-emerald-50 text-emerald-600 rounded-3xl shrink-0 shadow-sm"><UsersIcon size={28} /></div>
                      <div>
                         <h3 className="text-lg font-black text-slate-800 tracking-tight">Quản lý nhân sự</h3>
                         <p className="text-xs text-slate-500 font-medium mt-1">Danh sách tài khoản và phân quyền hệ thống.</p>
                      </div>
                   </div>
                   <button 
                    onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }}
                    className="px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center space-x-2 shrink-0"
                   >
                     <UserPlus size={18} />
                     <span className="hidden sm:inline">Thêm nhân viên</span>
                   </button>
                </div>
                
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                      <thead>
                         <tr className="bg-slate-50/50">
                            <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhân viên</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vai trò</th>
                            <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {users.map((user) => (
                           <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-10 py-5">
                                 <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs">
                                       {user.fullName.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                       <p className="text-sm font-bold text-slate-800">{user.fullName}</p>
                                       <p className="text-[10px] text-slate-400 font-mono">@{user.username}</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-5">
                                 <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-wider ${user.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500'}`}>
                                    {user.role === 'admin' ? 'Quản trị' : 'Nhân viên'}
                                 </span>
                              </td>
                              <td className="px-10 py-5 text-right">
                                 <div className="flex items-center justify-end space-x-1">
                                    <button onClick={() => handleResetPassword(user.id)} className="p-2.5 text-slate-300 hover:text-amber-600 rounded-xl transition-all" title="Reset mật khẩu">
                                       <RotateCcw size={18} />
                                    </button>
                                    <button onClick={() => { setEditingUser(user); setIsUserModalOpen(true); }} className="p-2.5 text-slate-300 hover:text-indigo-600 rounded-xl transition-all">
                                       <Edit2 size={18} />
                                    </button>
                                    <button onClick={() => handleConfirmDeleteUser(user)} className="p-2.5 text-slate-300 hover:text-red-600 rounded-xl transition-all">
                                       <Trash2 size={18} />
                                    </button>
                                 </div>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>

                {/* Mobile View Cards - Đảm bảo hiện danh sách tài khoản trên Mobile */}
                <div className="md:hidden divide-y divide-slate-50">
                   {users.length > 0 ? users.map((user) => (
                     <div key={user.id} className="p-5 space-y-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between">
                           <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-sm border border-indigo-100 shadow-sm">
                                 {user.fullName.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                 <div className="flex items-center space-x-2">
                                    <p className="text-sm font-black text-slate-800 truncate">{user.fullName}</p>
                                    {user.id === currentUser?.id && <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase">Bạn</span>}
                                 </div>
                                 <p className="text-[10px] text-slate-400 font-mono">@{user.username}</p>
                              </div>
                           </div>
                           <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-full tracking-wider ${user.role === 'admin' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
                              {user.role === 'admin' ? 'Admin' : 'Staff'}
                           </span>
                        </div>
                        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-50">
                           <button onClick={() => handleResetPassword(user.id)} className="p-3 bg-amber-50 text-amber-600 rounded-xl active:scale-90 transition-all"><RotateCcw size={16} /></button>
                           <button onClick={() => { setEditingUser(user); setIsUserModalOpen(true); }} className="p-3 bg-indigo-50 text-indigo-600 rounded-xl active:scale-90 transition-all"><Edit2 size={16} /></button>
                           <button onClick={() => handleConfirmDeleteUser(user)} disabled={user.id === currentUser?.id} className={`p-3 rounded-xl active:scale-90 transition-all ${user.id === currentUser?.id ? 'bg-slate-50 text-slate-200' : 'bg-red-50 text-red-600'}`}><Trash2 size={16} /></button>
                        </div>
                     </div>
                   )) : (
                     <div className="p-20 text-center opacity-20 italic">
                        <UsersIcon size={40} className="mx-auto mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Không có nhân sự</p>
                     </div>
                   )}
                </div>
             </section>
           )}
        </div>
      ) : activeTab === 'loyalty' ? (
        <div className="space-y-8 animate-in slide-in-from-bottom-2">
           <section className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-6 md:p-10 space-y-10">
              <div className="flex items-center justify-between gap-6 border-b border-slate-50 pb-8">
                 <div className="flex items-center space-x-5 flex-1 min-w-0">
                    <div className={`p-4 rounded-3xl shrink-0 shadow-sm transition-colors duration-500 ${loyaltyConfig?.enabled ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-300'}`}>
                       <Crown size={28} />
                    </div>
                    <div className="min-w-0">
                       <h3 className="text-lg font-black text-slate-800 tracking-tight">Thành viên thân thiết</h3>
                       <p className="text-xs text-slate-500 font-medium mt-1 leading-tight">Tự động nâng hạng khách hàng.</p>
                    </div>
                 </div>
                 
                 <button 
                  onClick={() => updateLoyaltyConfig({...loyaltyConfig!, enabled: !loyaltyConfig?.enabled})} 
                  className={`w-16 h-8 rounded-full relative transition-all duration-300 shadow-inner shrink-0 ${loyaltyConfig?.enabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
                 >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${loyaltyConfig?.enabled ? 'left-9' : 'left-1'}`} />
                 </button>
              </div>

              {loyaltyConfig?.enabled ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in slide-in-from-top-4 duration-500">
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chi tiêu tối thiểu</label>
                      <div className="relative group">
                         <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors">
                            <DollarSign size={20} />
                         </div>
                         <input 
                            type="text" 
                            className="w-full pl-14 pr-12 py-5 bg-slate-50 border border-slate-200 rounded-[24px] font-black text-xl text-slate-800 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                            value={loyaltyConfig.minSpend.toLocaleString()}
                            onChange={(e) => updateLoyaltyConfig({...loyaltyConfig, minSpend: Number(e.target.value.replace(/\D/g, ''))})}
                         />
                         <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">VNĐ</span>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Đơn hàng tối thiểu</label>
                      <div className="relative group">
                         <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                            <ShoppingBag size={20} />
                         </div>
                         <input 
                            type="number" 
                            className="w-full pl-14 pr-12 py-5 bg-slate-50 border border-slate-200 rounded-[24px] font-black text-xl text-slate-800 focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
                            value={loyaltyConfig.minOrders}
                            onChange={(e) => updateLoyaltyConfig({...loyaltyConfig, minOrders: Number(e.target.value)})}
                         />
                         <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">ĐƠN</span>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="py-10 text-center space-y-4 opacity-50 grayscale transition-all duration-700">
                   <div className="w-20 h-20 bg-slate-100 rounded-full mx-auto flex items-center justify-center text-slate-400 border border-slate-200 shadow-inner">
                      <Lock size={32} />
                   </div>
                   <div>
                      <p className="text-sm font-black text-slate-800 uppercase tracking-widest">Tính năng đang tắt</p>
                   </div>
                </div>
              )}
           </section>
        </div>
      ) : activeTab === 'printer' ? (
        <div className="space-y-6 animate-in slide-in-from-bottom-2">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
             <div className="p-6 md:p-8 border-b border-slate-50 bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center space-x-5">
                   <div className={`p-4 rounded-2xl shadow-sm transition-colors shrink-0 ${printerConfig.status === 'connected' ? 'bg-emerald-500 text-white' : printerConfig.status === 'searching' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {printerConfig.status === 'connected' ? <Printer size={32} /> : printerConfig.status === 'searching' ? <RefreshCw size={32} className="animate-spin" /> : <Unplug size={32} />}
                   </div>
                   <div className="min-w-0">
                      <h3 className="text-lg md:text-xl font-black text-slate-800 tracking-tight truncate">{printerConfig.status === 'connected' ? printerConfig.printerName || 'Máy in mặc định' : 'Chưa kết nối máy in'}</h3>
                   </div>
                </div>
                <div className="flex gap-3">
                   <button onClick={handleConnectPrinter} disabled={isConnecting} className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-lg uppercase hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2">
                     {isConnecting ? <RefreshCw size={16} className="animate-spin" /> : <Cable size={16} />}
                     <span>Kết nối</span>
                   </button>
                   <button onClick={handleTestPrint} disabled={isTesting || printerConfig.status !== 'connected'} className="flex-1 md:flex-none px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase hover:bg-slate-50 transition-all flex items-center justify-center space-x-2">
                     {isTesting ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                     <span>In thử</span>
                   </button>
                </div>
             </div>
          </div>
        </div>
      ) : activeTab === 'store' ? (
        <div className="space-y-8 animate-in slide-in-from-bottom-2">
           <section className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-6 md:p-10 space-y-8 relative">
              {!isAdmin && (
                <div className="absolute top-6 right-10 flex items-center space-x-2 text-rose-500 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-100">
                   <Lock size={12} />
                   <span className="text-[10px] font-black uppercase">Admin Only</span>
                </div>
              )}
              <div className="flex items-center space-x-5 border-b border-slate-50 pb-8">
                 <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl shrink-0 shadow-sm"><Store size={28} /></div>
                 <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Thông tin gian hàng</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Hồ sơ thương hiệu.</p>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên gian hàng</label>
                  <input disabled={!isAdmin} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[22px] font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm disabled:opacity-60" value={storeConfig.name} onChange={(e) => updateStoreConfig({...storeConfig, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số điện thoại</label>
                  <input disabled={!isAdmin} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[22px] font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm disabled:opacity-60" value={storeConfig.phone} onChange={(e) => updateStoreConfig({...storeConfig, phone: e.target.value})} />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Địa chỉ</label>
                  <input disabled={!isAdmin} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[22px] font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm disabled:opacity-60" value={storeConfig.address} onChange={(e) => updateStoreConfig({...storeConfig, address: e.target.value})} />
                </div>
              </div>

              <div className="pt-8 border-t border-slate-50">
                <div className="flex items-center space-x-5 mb-8">
                  <div className="p-4 bg-emerald-50 text-emerald-600 rounded-3xl shrink-0 shadow-sm"><CreditCard size={28} /></div>
                  <div className="flex-1">
                      <h3 className="text-lg font-black text-slate-800 tracking-tight">Thanh toán VietQR</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">Cấu hình nhận tiền chuyển khoản POS.</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-2 relative" ref={bankRef}>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngân hàng</label>
                      <div 
                        onClick={() => isAdmin && setIsBankOpen(!isBankOpen)}
                        className={`w-full px-5 py-4 bg-white border rounded-[24px] font-bold flex items-center justify-between transition-all ${!isAdmin ? 'bg-slate-50 border-slate-100 cursor-not-allowed opacity-60' : isBankOpen ? 'border-indigo-500 ring-4 ring-indigo-50' : 'border-slate-200 hover:border-indigo-300 cursor-pointer'}`}
                      >
                        <span className="text-sm">{selectedBank?.shortName || 'Chọn ngân hàng...'}</span>
                        {isAdmin && <ChevronDown size={20} className={`text-slate-300 transition-transform ${isBankOpen ? 'rotate-180 text-indigo-500' : ''}`} />}
                      </div>

                      {isBankOpen && isAdmin && (
                        <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[32px] shadow-3xl border border-slate-100 z-[100] overflow-hidden">
                          <div className="p-4 border-b border-slate-50">
                            <input 
                              placeholder="Tìm nhanh..."
                              className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm outline-none font-bold"
                              value={bankSearch}
                              onChange={(e) => setBankSearch(e.target.value)}
                            />
                          </div>
                          <div className="max-h-60 overflow-y-auto p-2 scrollbar-hide">
                            {filteredBanks.map(b => (
                              <div key={b.id} onClick={() => { updateStoreConfig({ ...storeConfig, bankId: b.code }); setIsBankOpen(false); }} className={`p-3 rounded-2xl flex items-center space-x-3 cursor-pointer hover:bg-slate-50 transition-all ${storeConfig.bankId === b.code ? 'bg-indigo-50 text-indigo-600' : ''}`}>
                                <img src={b.logo} className="w-8 h-8 object-contain" alt="bank logo" />
                                <span className="text-xs font-black">{b.shortName}</span>
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
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[22px] font-black text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-60" 
                        value={storeConfig.bankAccount || ''} 
                        onChange={(e) => updateStoreConfig({...storeConfig, bankAccount: e.target.value.replace(/\D/g, '')})} 
                      />
                   </div>
                </div>
              </div>
           </section>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-bottom-2">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 md:p-6 border-b border-slate-50 bg-slate-50/30 flex flex-col sm:flex-row gap-4">
              <input 
                className="flex-1 px-5 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                placeholder={activeTab === 'prices' ? "Loại giá mới..." : "Nhóm hàng mới..."}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
              />
              <button onClick={handleAdd} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center space-x-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                <Plus size={18} /><span>Thêm</span>
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {(activeTab === 'prices' ? priceTypes : productGroups).map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between group hover:bg-slate-50/50 transition-all">
                  <div className="flex-1 flex items-center space-x-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 shrink-0">
                      {activeTab === 'prices' ? <Tag size={20} /> : <Layers size={20} />}
                    </div>
                    {editingId === item.id ? (
                      <div className="flex-1 flex items-center gap-2 max-w-md">
                        <input className="flex-1 px-4 py-2 bg-white border-2 border-indigo-600 rounded-xl outline-none font-bold text-sm" value={editValue} autoFocus onChange={(e) => setEditValue(e.target.value)} />
                        <button onClick={handleSaveEdit} className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100"><Check size={18} /></button>
                        <button onClick={() => setEditingId(null)} className="p-2.5 bg-slate-100 text-slate-400 rounded-xl"><X size={18} /></button>
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                      </div>
                    )}
                  </div>
                  {editingId !== item.id && (
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleStartEdit(item.id, item.name)} className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-xl shadow-sm transition-all"><Edit2 size={18} /></button>
                      <button onClick={() => checkDeleteConstraint(item.id)} className="p-3 text-slate-300 hover:text-red-600 hover:bg-white rounded-xl shadow-sm transition-all"><Trash2 size={18} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isUserModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white w-full max-w-lg rounded-none md:rounded-[40px] shadow-3xl overflow-hidden flex flex-col h-full md:h-auto animate-in zoom-in-95">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
                 <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-xl text-white ${editingUser ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                       {editingUser ? <Edit2 size={20} /> : <UserPlus size={20} />}
                    </div>
                    <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                       {editingUser ? 'Cập nhật nhân viên' : 'Thêm nhân viên mới'}
                    </h2>
                 </div>
                 <button onClick={() => setIsUserModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-300 transition-all"><X size={20} /></button>
              </div>
              
              <form onSubmit={handleUserSubmit} className="p-8 space-y-6 flex-1 overflow-y-auto scrollbar-hide">
                 {!editingUser && (
                   <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên đăng nhập *</label>
                      </div>
                      <div className="relative group">
                         <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors font-mono">@</div>
                         <input 
                           required 
                           autoFocus
                           className="w-full pl-10 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" 
                           value={userFormData.username} 
                           onChange={(e) => setUserFormData({...userFormData, username: e.target.value.toLowerCase().replace(/\s/g, '')})} 
                           placeholder="VD: nhanvien_01"
                         />
                      </div>
                   </div>
                 )}
                 
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên *</label>
                    <input 
                      required 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" 
                      value={userFormData.fullName} 
                      onChange={(e) => setUserFormData({...userFormData, fullName: e.target.value})} 
                      placeholder="VD: Nguyễn Văn A"
                    />
                 </div>
                 
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phân quyền *</label>
                    <div className="grid grid-cols-2 gap-3">
                       <button 
                        type="button"
                        onClick={() => setUserFormData({...userFormData, role: 'admin'})}
                        className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all flex items-center justify-center space-x-2 ${userFormData.role === 'admin' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                       >
                         <ShieldCheck size={16} /><span>Quản trị</span>
                       </button>
                       <button 
                        type="button"
                        onClick={() => setUserFormData({...userFormData, role: 'staff'})}
                        className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all flex items-center justify-center space-x-2 ${userFormData.role === 'staff' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                       >
                         <UserIcon size={16} /><span>Nhân viên</span>
                       </button>
                    </div>
                 </div>

                 {!editingUser && (
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu ban đầu *</label>
                      <div className="relative group">
                         <input 
                           required 
                           type={showModalPassword ? "text" : "password"}
                           className="w-full pl-6 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" 
                           value={userFormData.password} 
                           onChange={(e) => setUserFormData({...userFormData, password: e.target.value})} 
                           placeholder="••••••••"
                         />
                         <button 
                           type="button"
                           onClick={() => setShowModalPassword(!showModalPassword)}
                           className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors focus:outline-none"
                         >
                           {showModalPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                         </button>
                      </div>
                   </div>
                 )}
                 
                 <div className="pt-4 flex gap-3 pb-10 md:pb-0">
                    <button type="button" onClick={() => setIsUserModalOpen(false)} className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 text-[11px] uppercase tracking-widest transition-all">HỦY BỎ</button>
                    <button type="submit" className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-emerald-600 transition-all">
                       {editingUser ? 'LƯU THAY ĐỔI' : 'TẠO TÀI KHOẢN'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
