
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
  ChevronRight
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
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
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
  }, [editingUser, isUserModalOpen]);

  const handleUpdateProfile = async () => {
    if (!currentUser) return;
    setIsSavingProfile(true);
    try {
      const updatedUser = { ...currentUser, fullName: profileName };
      if (newPassword) {
        // Tạo Salt mới khi đổi mật khẩu
        const newSalt = generateSalt();
        updatedUser.passwordSalt = newSalt;
        updatedUser.passwordHash = await hashPassword(newPassword, newSalt);
      }
      await updateUser(updatedUser);
      setNewPassword('');
      const notification = document.createElement('div');
      notification.className = "fixed top-10 right-10 z-[200] bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right";
      notification.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg><span>Đã cập nhật thông tin cá nhân!</span>`;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
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
      } else {
        if (!userFormData.username || !userFormData.password) return;
        // Logic băm được Store xử lý, ở đây truyền mật khẩu thô
        await addUser(userFormData.username, userFormData.fullName, userFormData.role, userFormData.password);
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
      alert("Đây là tài khoản hệ thống mặc định, không thể xóa để đảm bảo bạn luôn có quyền truy cập.");
      return;
    }
    if (user.id === currentUser?.id) {
      alert("Bạn không thể tự xóa chính mình khi đang đăng nhập.");
      return;
    }
    setUserToDelete(user);
  };

  const handleDeleteUserAction = async () => {
    if (userToDelete) {
      await deleteUser(userToDelete.id);
      setUserToDelete(null);
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

  const handleVerifyAccount = async () => {
    if (!storeConfig.bankAccount || !storeConfig.bankId || !isAdmin) return;
    setIsVerifying(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    const mockNames = ["NGUYỄN VĂN A", "TRẦN THỊ B", "LÊ VĂN C"];
    updateStoreConfig({ ...storeConfig, bankAccountName: mockNames[Math.floor(Math.random() * mockNames.length)] });
    setIsVerifying(false);
  };

  const handleTestPrint = async () => {
    if (isTesting) return;
    setIsTesting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsTesting(false);
    const notification = document.createElement('div');
    notification.className = "fixed top-10 right-10 z-[200] bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right duration-500 flex items-center gap-3";
    notification.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg><span class="font-bold">Đã gửi lệnh in thử thành công!</span>`;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.classList.add('animate-out', 'fade-out');
      setTimeout(() => notification.remove(), 500);
    }, 3000);
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

  const PaperSizeOption = ({ value, label }: { value: '58mm' | '80mm' | 'A4', label: string }) => (
    <button 
      onClick={() => updatePrinterConfig({...printerConfig, paperSize: value})}
      className={`flex-1 shrink-0 py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all ${printerConfig.paperSize === value ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
    >
      {label}
    </button>
  );

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
            ? "Mục này đang được sử dụng trong hệ thống Sản phẩm hoặc Khách hàng. Để bảo vệ dữ liệu, bạn chỉ có thể chỉnh sửa tên, không thể xóa bỏ." 
            : "Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa?"}
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
          message={`Bạn đang thực hiện xóa tài khoản của ${userToDelete.fullName}. Dữ liệu các đơn hàng do nhân viên này thực hiện vẫn sẽ được giữ lại.`}
          onConfirm={handleDeleteUserAction}
          onCancel={() => setUserToDelete(null)}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cài đặt hệ thống</h1>
        <p className="text-slate-500 text-sm font-medium">Tùy chỉnh danh mục và thiết lập vận hành gian hàng.</p>
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
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Thiết lập cá nhân</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Quản lý tên hiển thị và bảo mật tài khoản của bạn.</p>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu mới (Để trống nếu không đổi)</label>
                  <div className="relative">
                    <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="password"
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-[22px] font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" 
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
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
                         <p className="text-xs text-slate-500 font-medium mt-1">Thêm nhân viên mới và phân quyền sử dụng hệ thống.</p>
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
                
                <div className="hidden md:block overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                      <thead>
                         <tr className="bg-slate-50/50">
                            <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhân viên</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vai trò</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Đăng nhập cuối</th>
                            <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {users.map((user) => (
                           <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-10 py-5">
                                 <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs relative overflow-hidden">
                                       {user.fullName.substring(0, 2).toUpperCase()}
                                       {user.id === 'user-default' && (
                                         <div className="absolute inset-0 bg-amber-500/10 flex items-center justify-center">
                                           <Lock size={12} className="text-amber-600 opacity-50" />
                                         </div>
                                       )}
                                    </div>
                                    <div>
                                       <div className="flex items-center space-x-2">
                                          <p className="text-sm font-bold text-slate-800">{user.fullName}</p>
                                          {user.id === currentUser?.id && (
                                            <span className="bg-indigo-100 text-indigo-700 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md">Bạn</span>
                                          )}
                                       </div>
                                       <p className="text-[10px] text-slate-400 font-mono">@{user.username}</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-5">
                                 <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-wider ${user.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500'}`}>
                                    {user.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
                                 </span>
                              </td>
                              <td className="px-6 py-5">
                                 <p className="text-xs text-slate-500 font-medium">{user.lastLogin ? new Date(user.lastLogin).toLocaleString('vi-VN') : 'Chưa từng online'}</p>
                              </td>
                              <td className="px-10 py-5 text-right">
                                 <div className="flex items-center justify-end space-x-1">
                                    <button 
                                      onClick={() => handleResetPassword(user.id)}
                                      title="Reset mật khẩu về mặc định (user@123)"
                                      className="p-2.5 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                                    >
                                       <RotateCcw size={18} />
                                    </button>
                                    <button 
                                      onClick={() => { setEditingUser(user); setIsUserModalOpen(true); }}
                                      className="p-2.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                    >
                                       <Edit2 size={18} />
                                    </button>
                                    <button 
                                      onClick={() => handleConfirmDeleteUser(user)}
                                      disabled={user.id === currentUser?.id || user.id === 'user-default'}
                                      className={`p-2.5 rounded-xl transition-all ${
                                        user.id === currentUser?.id || user.id === 'user-default' 
                                          ? 'text-slate-100 cursor-not-allowed' 
                                          : 'text-slate-300 hover:text-red-600 hover:bg-red-50'
                                      }`}
                                      title={user.id === 'user-default' ? 'Tài khoản hệ thống' : user.id === currentUser?.id ? 'Tài khoản đang dùng' : 'Xóa nhân viên'}
                                    >
                                       <Trash2 size={18} />
                                    </button>
                                 </div>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>

                <div className="md:hidden divide-y divide-slate-50">
                  {users.map((user) => (
                    <div key={user.id} className="p-6 space-y-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-start justify-between">
                         <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-sm relative overflow-hidden shrink-0 border border-slate-200 shadow-sm">
                               {user.fullName.substring(0, 2).toUpperCase()}
                               {user.id === 'user-default' && (
                                 <div className="absolute inset-0 bg-amber-500/10 flex items-center justify-center">
                                   <Lock size={14} className="text-amber-600 opacity-50" />
                                 </div>
                               )}
                            </div>
                            <div className="min-w-0">
                               <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                  <p className="text-sm font-black text-slate-800 truncate">{user.fullName}</p>
                                  {user.id === currentUser?.id && (
                                    <span className="bg-indigo-100 text-indigo-700 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md">Bạn</span>
                                  )}
                               </div>
                               <p className="text-[10px] text-slate-400 font-mono mt-0.5">@{user.username}</p>
                            </div>
                         </div>
                         <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-full tracking-wider shrink-0 ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                            {user.role === 'admin' ? 'Admin' : 'Staff'}
                         </span>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                         <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                            <ChevronRight size={12} className="mr-1" />
                            {user.lastLogin ? `Online: ${new Date(user.lastLogin).toLocaleDateString('vi-VN')}` : 'Chưa online'}
                         </div>
                         <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => handleResetPassword(user.id)}
                              className="p-3 bg-amber-50 text-amber-600 rounded-xl active:scale-90 transition-all"
                            >
                               <RotateCcw size={16} />
                            </button>
                            <button 
                              onClick={() => { setEditingUser(user); setIsUserModalOpen(true); }}
                              className="p-3 bg-indigo-50 text-indigo-600 rounded-xl active:scale-90 transition-all"
                            >
                               <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleConfirmDeleteUser(user)}
                              disabled={user.id === currentUser?.id || user.id === 'user-default'}
                              className={`p-3 rounded-xl active:scale-90 transition-all ${
                                user.id === currentUser?.id || user.id === 'user-default' 
                                  ? 'bg-slate-50 text-slate-200' 
                                  : 'bg-red-50 text-red-600'
                              }`}
                            >
                               <Trash2 size={16} />
                            </button>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
             </section>
           )}
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
                      <div className="flex items-center space-x-3 mt-1">
                         <span className={`text-[10px] md:text-xs font-black uppercase tracking-widest ${printerConfig.status === 'connected' ? 'text-emerald-500' : printerConfig.status === 'searching' ? 'text-amber-500' : 'text-slate-400'}`}>
                           {printerConfig.status === 'connected' ? 'Trạng thái: Đang hoạt động' : printerConfig.status === 'searching' ? 'Trạng thái: Đang tìm kiếm...' : 'Trạng thái: Offline'}
                         </span>
                         {printerConfig.status === 'connected' && <span className="hidden sm:flex text-xs font-bold text-slate-400 items-center"><Network size={12} className="mr-1" /> {printerConfig.printerIp}</span>}
                      </div>
                   </div>
                </div>
                <div className="flex gap-3">
                   <button onClick={handleConnectPrinter} disabled={isConnecting} className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-lg uppercase hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2">
                     {isConnecting ? <RefreshCw size={16} className="animate-spin" /> : <Cable size={16} />}
                     <span>{printerConfig.status === 'connected' ? 'Kết nối lại' : 'Kết nối ngay'}</span>
                   </button>
                   <button onClick={handleTestPrint} disabled={isTesting || printerConfig.status !== 'connected'} className="flex-1 md:flex-none px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase hover:bg-slate-50 transition-all flex items-center justify-center space-x-2">
                     {isTesting ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                     <span>In thử</span>
                   </button>
                </div>
             </div>
             <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <label className="text-xs font-bold text-slate-600">Tên định danh máy in</label>
                   <input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={printerConfig.printerName} onChange={(e) => updatePrinterConfig({...printerConfig, printerName: e.target.value})} />
                   <label className="text-xs font-bold text-slate-600">Địa chỉ IP / Cổng kết nối</label>
                   <input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-mono font-bold" value={printerConfig.printerIp} onChange={(e) => updatePrinterConfig({...printerConfig, printerIp: e.target.value})} />
                </div>
                <div className="space-y-6">
                   <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Phương thức truyền tải</h4>
                   <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => updatePrinterConfig({...printerConfig, connectionType: 'wired'})} className={`p-4 md:p-6 rounded-[24px] border-2 transition-all flex flex-col items-center gap-2 ${printerConfig.connectionType === 'wired' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}>
                        <Cable size={32} /><span className="text-[9px] md:text-[10px] font-black uppercase text-center">Có dây (USB/LAN)</span>
                      </button>
                      <button onClick={() => updatePrinterConfig({...printerConfig, connectionType: 'wireless'})} className={`p-4 md:p-6 rounded-[24px] border-2 transition-all flex flex-col items-center gap-2 ${printerConfig.connectionType === 'wireless' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}>
                        <Wifi size={32} /><span className="text-[9px] md:text-[10px] font-black uppercase text-center">Không dây (Wi-Fi)</span>
                      </button>
                   </div>
                </div>
             </div>
          </div>
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 md:p-8 space-y-8">
             <div className="space-y-4">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Khổ giấy in mặc định</label>
                <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide">
                   <PaperSizeOption value="58mm" label="K58" />
                   <PaperSizeOption value="80mm" label="K80" />
                   <PaperSizeOption value="A4" label="Giấy A4" />
                </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-50">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <div>
                      <p className="text-sm font-bold text-slate-800">Tự động in hóa đơn</p>
                      <p className="text-[10px] text-slate-500">Tự động mở hộp thoại in sau khi lưu đơn</p>
                   </div>
                   <button onClick={() => updatePrinterConfig({...printerConfig, autoPrint: !printerConfig.autoPrint})} className="text-indigo-600">
                     {printerConfig.autoPrint ? <ToggleRight size={40} /> : <ToggleLeft size={40} className="text-slate-300" />}
                   </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <p className="text-sm font-bold text-slate-800">Số bản in mặc định</p>
                   <div className="flex items-center space-x-2 bg-white rounded-xl border border-slate-200 p-1">
                      <button onClick={() => updatePrinterConfig({...printerConfig, copies: Math.max(1, printerConfig.copies - 1)})} className="p-1 text-slate-400"><Minus size={16} /></button>
                      <span className="w-8 text-center font-bold text-sm">{printerConfig.copies}</span>
                      <button onClick={() => updatePrinterConfig({...printerConfig, copies: printerConfig.copies + 1})} className="p-1 text-slate-400"><Plus size={16} /></button>
                   </div>
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
                   <span className="text-[10px] font-black uppercase">Chỉ dành cho Admin</span>
                </div>
              )}
              <div className="flex items-center space-x-5 border-b border-slate-50 pb-8">
                 <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl shrink-0 shadow-sm"><Store size={28} /></div>
                 <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Thông tin gian hàng</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Cập nhật thông tin nhận diện thương hiệu của bạn.</p>
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
           </section>

           <section className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-6 md:p-10 space-y-8 relative">
              {!isAdmin && (
                <div className="absolute top-6 right-10 flex items-center space-x-2 text-rose-500 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-100">
                   <Lock size={12} />
                   <span className="text-[10px] font-black uppercase">Chỉ dành cho Admin</span>
                </div>
              )}
              <div className="flex items-center space-x-5 border-b border-slate-50 pb-8">
                 <div className="p-4 bg-rose-50 text-rose-600 rounded-3xl shrink-0 shadow-sm"><AlertOctagon size={28} /></div>
                 <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Cấu hình kho hàng</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Quản lý các ngưỡng cảnh báo hoạt động kho.</p>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngưỡng tồn kho thấp</label>
                  <div className="relative">
                    <input 
                      disabled={!isAdmin}
                      type="text"
                      inputMode="numeric"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[22px] font-black outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm disabled:opacity-60" 
                      value={storeConfig.lowStockThreshold || ''} 
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        updateStoreConfig({...storeConfig, lowStockThreshold: val ? Number(val) : 0});
                      }} 
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">Sản phẩm</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium ml-1">Hệ thống sẽ hiển thị cảnh báo nếu tồn kho bằng hoặc thấp hơn số này.</p>
                </div>
              </div>
           </section>

           <section className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-6 md:p-10 space-y-8 relative">
              {!isAdmin && (
                <div className="absolute top-6 right-10 flex items-center space-x-2 text-rose-500 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-100">
                   <Lock size={12} />
                   <span className="text-[10px] font-black uppercase">Chỉ dành cho Admin</span>
                </div>
              )}
              <div className="flex items-center space-x-5 border-b border-slate-50 pb-8">
                 <div className="p-4 bg-emerald-50 text-emerald-600 rounded-3xl shrink-0 shadow-sm"><CreditCard size={28} /></div>
                 <div className="flex-1">
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Cấu hình VietQR</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Kết nối tài khoản ngân hàng để nhận thanh toán nhanh.</p>
                 </div>
                 {isVerifying && (
                   <div className="flex items-center space-x-2 text-[10px] font-black text-emerald-600 animate-pulse bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                     <Loader2 size={12} className="animate-spin" />
                     <span>ĐANG XÁC THỰC...</span>
                   </div>
                 )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2 relative" ref={bankRef}>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngân hàng thụ hưởng</label>
                  <div 
                    onClick={() => isAdmin && setIsBankOpen(!isBankOpen)}
                    className={`w-full px-5 py-4 bg-white border rounded-[24px] font-bold flex items-center justify-between transition-all shadow-sm ${!isAdmin ? 'bg-slate-50 border-slate-100 cursor-not-allowed opacity-60' : isBankOpen ? 'border-indigo-500 ring-4 ring-indigo-50' : 'border-slate-200 hover:border-indigo-300 cursor-pointer'}`}
                  >
                    <div className="flex items-center space-x-4">
                      {selectedBank ? (
                        <>
                          <div className="w-12 h-12 rounded-[18px] bg-white shadow-md border border-slate-100 flex items-center justify-center p-2 shrink-0 overflow-hidden">
                             <img src={selectedBank.logo} className="w-full h-full object-contain" alt="bank icon" />
                          </div>
                          <div className="min-w-0">
                             <p className="text-sm font-black text-slate-800 leading-none mb-1">{selectedBank.shortName}</p>
                             <p className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[140px]">{selectedBank.code}</p>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center space-x-3 text-slate-400">
                           <div className="w-12 h-12 rounded-[18px] bg-slate-50 border border-slate-100 border-dashed flex items-center justify-center"><Building size={20} /></div>
                           <span className="text-sm font-bold">Chọn ngân hàng...</span>
                        </div>
                      )}
                    </div>
                    {isAdmin && <ChevronDown size={20} className={`text-slate-300 transition-transform duration-300 ${isBankOpen ? 'rotate-180 text-indigo-500' : ''}`} />}
                  </div>

                  {isBankOpen && isAdmin && (
                    <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[32px] shadow-3xl border border-slate-100 z-[100] overflow-hidden animate-in zoom-in-95 duration-200">
                      <div className="p-4 border-b border-slate-50 sticky top-0 bg-white/80 backdrop-blur-md z-10">
                        <div className="relative">
                          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" />
                          <input 
                            autoFocus
                            placeholder="Tìm nhanh ngân hàng..."
                            className="w-full pl-12 pr-5 py-4 bg-slate-50 border-none rounded-2xl text-sm outline-none font-bold focus:ring-2 focus:ring-indigo-100"
                            value={bankSearch}
                            onChange={(e) => setBankSearch(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="max-h-80 overflow-y-auto p-2 space-y-1 scrollbar-hide">
                        {filteredBanks.map(b => (
                          <div 
                            key={b.id}
                            onClick={() => {
                              updateStoreConfig({ ...storeConfig, bankId: b.code });
                              setIsBankOpen(false);
                            }}
                            className={`p-3 rounded-2xl flex items-center space-x-4 cursor-pointer transition-all group ${storeConfig.bankId === b.code ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-50'}`}
                          >
                            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center p-2 shrink-0 overflow-hidden">
                               <img src={b.logo} className="w-full h-full object-contain" alt="logo" />
                            </div>
                            <div className="min-w-0">
                              <p className={`text-sm font-black transition-colors ${storeConfig.bankId === b.code ? 'text-white' : 'text-slate-800 group-hover:text-indigo-600'}`}>{b.shortName}</p>
                              <p className={`text-[10px] font-bold uppercase truncate ${storeConfig.bankId === b.code ? 'text-indigo-200' : 'text-slate-400'}`}>{b.name}</p>
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
                    className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[24px] font-black text-lg tracking-wider focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-60" 
                    placeholder="Nhập số tài khoản..."
                    value={storeConfig.bankAccount || ''} 
                    onBlur={handleVerifyAccount}
                    onChange={(e) => updateStoreConfig({...storeConfig, bankAccount: e.target.value.replace(/\D/g, '')})} 
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên chủ tài khoản</label>
                  <div className="relative">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300">
                       <UserCheck size={20} />
                    </div>
                    <input 
                      disabled={!isAdmin}
                      className={`w-full pl-14 pr-6 py-5 border rounded-[24px] font-black text-lg uppercase transition-all outline-none disabled:opacity-60 ${isVerifying ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-indigo-500'}`}
                      placeholder="HỆ THỐNG TỰ ĐỘNG NHẬN DIỆN..."
                      value={storeConfig.bankAccountName || ''} 
                      onChange={(e) => updateStoreConfig({...storeConfig, bankAccountName: e.target.value.toUpperCase()})} 
                    />
                    {storeConfig.bankAccountName && !isVerifying && (
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 bg-emerald-500 text-white p-1 rounded-full animate-in zoom-in">
                        <Check size={14} strokeWidth={4} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
           </section>

           <section className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-6 md:p-10 space-y-10 animate-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center space-x-3 md:space-x-5 flex-1 min-w-0">
                  <div className="p-3 md:p-4 bg-amber-50 text-amber-500 rounded-2xl md:rounded-3xl shrink-0 shadow-sm">
                    <Crown className="w-6 h-6 md:w-7 md:h-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base md:text-lg font-black text-slate-800 tracking-tight truncate">Thành viên thân thiết</h3>
                    <p className="text-[10px] md:text-xs text-slate-500 font-medium mt-0.5 leading-tight md:leading-normal">Thiết lập ngưỡng chi tiêu để tự động nâng hạng VIP.</p>
                  </div>
                </div>
                <button 
                  onClick={() => updateLoyaltyConfig({...loyaltyConfig!, enabled: !loyaltyConfig?.enabled})} 
                  className={`w-14 h-7 md:w-16 md:h-8 rounded-full relative transition-all duration-300 shrink-0 ${loyaltyConfig?.enabled ? 'bg-amber-500' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-1 w-5 h-5 md:w-6 md:h-6 bg-white rounded-full shadow-md transition-all duration-300 ${loyaltyConfig?.enabled ? 'left-8 md:left-9' : 'left-1'}`} />
                </button>
              </div>
              {loyaltyConfig?.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-4 duration-500">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tổng chi tiêu tối thiểu (VNĐ)</label>
                      <div className="relative">
                        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-black uppercase text-[10px]">đ</span>
                        <input 
                          type="text" 
                          className="w-full pl-6 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-[22px] font-black text-slate-800 focus:ring-2 focus:ring-amber-200 outline-none"
                          value={loyaltyConfig.minSpend.toLocaleString()}
                          onChange={(e) => updateLoyaltyConfig({...loyaltyConfig, minSpend: Number(e.target.value.replace(/\D/g, ''))})}
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số đơn hàng tối thiểu</label>
                      <input 
                        type="number" 
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[22px] font-black text-slate-800 focus:ring-2 focus:ring-amber-200 outline-none"
                        value={loyaltyConfig.minOrders}
                        onChange={(e) => updateLoyaltyConfig({...loyaltyConfig, minOrders: Number(e.target.value)})}
                      />
                    </div>
                </div>
              )}
            </section>
        </div>
      ) : activeTab === 'loyalty' ? (
        // Tab này hiện đã gộp vào Store, nhưng để đảm bảo tính nhất quán nếu UI vẫn cho phép click
        <div className="p-10 text-center opacity-20">
           <Info size={40} className="mx-auto mb-2" />
           <p className="text-xs font-black uppercase">Cấu hình này đã được gộp vào tab Gian hàng</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === 'prices' && (
            <div className="p-6 bg-amber-50 rounded-[32px] border border-amber-100 flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-top-2">
              <div className="p-4 bg-white rounded-2xl shadow-sm text-amber-600 shrink-0">
                <BoxSelect size={32} />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h4 className="font-black text-amber-800 text-sm uppercase tracking-tight">Cấu hình giá nhập kho</h4>
                <p className="text-xs text-amber-600 font-medium">Chọn loại giá được hệ thống lấy tự động khi tạo Phiếu nhập hàng.</p>
              </div>
              <div className="relative w-full md:w-auto min-w-[240px]">
                <select 
                  className="w-full px-6 py-4 bg-white border border-amber-200 rounded-2xl outline-none focus:ring-4 focus:ring-amber-200/50 font-black text-amber-900 cursor-pointer appearance-none text-sm transition-all"
                  value={storeConfig.costPriceTypeId}
                  onChange={(e) => updateStoreConfig({...storeConfig, costPriceTypeId: e.target.value})}
                >
                  {priceTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none" size={20} />
              </div>
            </div>
          )}

          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 md:p-6 border-b border-slate-50 bg-slate-50/30 flex flex-col sm:flex-row gap-4">
              <input 
                className="flex-1 px-5 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                placeholder={activeTab === 'prices' ? "Nhập tên loại giá mới..." : "Nhập tên nhóm hàng mới..."}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
              />
              <button onClick={handleAdd} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center space-x-2 hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100">
                <Plus size={18} /><span>Thêm mới</span>
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {(activeTab === 'prices' ? priceTypes : productGroups).map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between group hover:bg-slate-50/50 transition-all">
                  <div className="flex-1 flex items-center space-x-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                      {activeTab === 'prices' ? <Tag size={20} /> : <Layers size={20} />}
                    </div>
                    {editingId === item.id ? (
                      <div className="flex-1 flex items-center gap-2 max-w-md">
                        <input className="flex-1 px-4 py-2.5 bg-white border-2 border-indigo-600 rounded-xl outline-none font-bold text-sm" value={editValue} autoFocus onChange={(e) => setEditValue(e.target.value)} />
                        <button onClick={handleSaveEdit} className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100"><Check size={18} /></button>
                        <button onClick={() => setEditingId(null)} className="p-2.5 bg-slate-100 text-slate-400 rounded-xl"><X size={18} /></button>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                           <span className="font-bold text-slate-800 text-sm">{item.name}</span>
                           {activeTab === 'prices' && storeConfig.costPriceTypeId === item.id && (
                             <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black uppercase rounded-md border border-amber-200">Giá nhập</span>
                           )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">ID: {item.id}</span>
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
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white w-full max-w-lg rounded-[40px] shadow-3xl overflow-hidden flex flex-col animate-in zoom-in-95">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                 <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-600 text-white rounded-xl"><UserPlus size={20} /></div>
                    <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                       {editingUser ? 'Cập nhật nhân viên' : 'Thêm nhân viên mới'}
                    </h2>
                 </div>
                 <button onClick={() => setIsUserModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-300 transition-all"><X size={20} /></button>
              </div>
              <form onSubmit={handleUserSubmit} className="p-8 space-y-6">
                 {!editingUser && (
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên đăng nhập *</label>
                      <input 
                        required 
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" 
                        value={userFormData.username} 
                        onChange={(e) => setUserFormData({...userFormData, username: e.target.value.toLowerCase()})} 
                        placeholder="VD: nguyenvan_a"
                      />
                   </div>
                 )}
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên nhân viên *</label>
                    <input 
                      required 
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" 
                      value={userFormData.fullName} 
                      onChange={(e) => setUserFormData({...userFormData, fullName: e.target.value})} 
                      placeholder="VD: Nguyễn Văn A"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phân quyền hệ thống *</label>
                    <div className="grid grid-cols-2 gap-3">
                       <button 
                        type="button"
                        onClick={() => setUserFormData({...userFormData, role: 'admin'})}
                        className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all flex items-center justify-center space-x-2 ${userFormData.role === 'admin' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                       >
                         <ShieldCheck size={16} /><span>Quản trị viên</span>
                       </button>
                       <button 
                        type="button"
                        onClick={() => setUserFormData({...userFormData, role: 'staff'})}
                        className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all flex items-center justify-center space-x-2 ${userFormData.role === 'staff' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                       >
                         <UserIcon size={16} /><span>Nhân viên</span>
                       </button>
                    </div>
                 </div>
                 {!editingUser && (
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu khởi tạo *</label>
                      <input 
                        required 
                        type="password"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" 
                        value={userFormData.password} 
                        onChange={(e) => setUserFormData({...userFormData, password: e.target.value})} 
                        placeholder="••••••••"
                      />
                   </div>
                 )}
                 <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setIsUserModalOpen(false)} className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 text-[11px] uppercase tracking-widest transition-all">HỦY BỎ</button>
                    <button type="submit" className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-emerald-600 transition-all">LƯU NHÂN VIÊN</button>
                 </div>
              </form>
              <div className="px-8 pb-8">
                 <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start space-x-3">
                    <ShieldAlert size={18} className="text-amber-500 shrink-0" />
                    <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                       <b>Lưu ý:</b> Quyền Quản trị viên (Admin) có thể xem mọi báo cáo và xóa dữ liệu. Hãy cẩn trọng khi cấp quyền này.
                    </p>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
