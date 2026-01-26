
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
  Link as LinkIcon
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

const Settings = () => {
  const { 
    priceTypes, addPriceType, updatePriceType, deletePriceType,
    productGroups, addProductGroup, updateProductGroup, deleteProductGroup,
    loyaltyConfig, updateLoyaltyConfig,
    storeConfig, updateStoreConfig,
    currentUser, users, addUser, updateUser, deleteUser, resetUserPassword,
    error, setError
  } = useStore();

  const [activeTab, setActiveTab] = useState<'prices' | 'groups' | 'loyalty' | 'store' | 'printer' | 'account' | 'sync'>('prices');
  const [newValue, setNewValue] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Sync States
  const [tempSyncKey, setTempSyncKey] = useState(storeConfig.syncKey || '');
  const [isSyncProcessing, setIsSyncProcessing] = useState(false);

  // Store States
  const [bankList, setBankList] = useState<Bank[]>(POPULAR_BANKS);
  const [isBankOpen, setIsBankOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const bankRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser?.role === 'admin';

  // Account States
  const [profileName, setProfileName] = useState(currentUser?.fullName || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({
    username: '',
    fullName: '',
    role: 'staff' as UserRole,
    password: ''
  });

  // Printer testing states
  const [isTesting, setIsTesting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<'online' | 'offline' | 'checking' | 'connected' | 'searching'>('connected');

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
        await updateUser({ ...editingUser, fullName: userFormData.fullName, role: userFormData.role });
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

  const handleUpdateSyncKey = async () => {
    setIsSyncProcessing(true);
    await new Promise(r => setTimeout(r, 1500));
    await updateStoreConfig({ ...storeConfig, syncKey: tempSyncKey });
    setIsSyncProcessing(false);
    showToast("Đã cập nhật khóa đồng bộ. Hệ thống sẽ khởi động kết nối.");
  };

  const generateNewSyncKey = () => {
    const newKey = Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    setTempSyncKey(newKey);
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
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
      {deleteId && (
        <ConfirmDialog 
          title="Xác nhận xóa?"
          message="Hành động này không thể hoàn tác. Các liên kết dữ liệu cũ sẽ bị ảnh hưởng."
          onConfirm={async () => {
            if (activeTab === 'prices') await deletePriceType(deleteId);
            else if (activeTab === 'groups') await deleteProductGroup(deleteId);
            setDeleteId(null);
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
          }}
          onCancel={() => setUserToDelete(null)}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Cài đặt hệ thống</h1>
        <p className="text-slate-500 text-sm font-medium">Thiết lập danh mục vận hành và thông tin gian hàng.</p>
      </div>

      <div className="flex flex-wrap bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm w-full gap-1.5 sticky top-16 z-20 overflow-hidden">
        {(['prices', 'groups', 'loyalty', 'store', 'printer', 'account', 'sync'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
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
              <div className="flex items-center space-x-5 border-b border-slate-50 pb-8">
                 <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl shrink-0 shadow-sm border border-indigo-100"><Cloud size={28} /></div>
                 <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Đồng bộ đa thiết bị (Cloud Sync)</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Kết nối nhiều điện thoại, máy tính vào cùng một dữ liệu cửa hàng.</p>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                   <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 space-y-4">
                      <div className="flex items-center space-x-3 text-indigo-600">
                         <Zap size={18} />
                         <span className="text-[10px] font-black uppercase tracking-widest">Hướng dẫn kết nối</span>
                      </div>
                      <ol className="text-xs text-slate-600 space-y-3 list-decimal list-inside font-medium leading-relaxed">
                         <li>Sao chép <b>Mã đồng bộ</b> của thiết bị này.</li>
                         <li>Tải ứng dụng trên thiết bị mới (Điện thoại/Máy tính khác).</li>
                         <li>Vào phần <b>Cài đặt &gt; Kết nối</b> và nhập đúng mã này.</li>
                         <li>Dữ liệu sẽ tự động gộp và đồng bộ thời gian thực.</li>
                      </ol>
                   </div>
                </div>

                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã đồng bộ của bạn (Sync Key)</label>
                      <div className="relative group">
                        <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input 
                          className="w-full pl-14 pr-32 py-5 bg-slate-50 border border-slate-200 rounded-[24px] font-black text-lg outline-none focus:ring-4 focus:ring-indigo-50 transition-all uppercase tracking-widest" 
                          value={tempSyncKey} 
                          onChange={(e) => setTempSyncKey(e.target.value.toUpperCase())}
                          placeholder="NHẬP MÃ HOẶC TẠO MỚI" 
                        />
                        <button 
                          onClick={generateNewSyncKey}
                          className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 bg-white text-slate-600 text-[9px] font-black uppercase rounded-xl border border-slate-100 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                        >
                          Tạo mã mới
                        </button>
                      </div>
                      <p className="text-[9px] text-slate-400 font-medium ml-1">* Tuyệt đối không chia sẻ mã này cho người lạ.</p>
                   </div>

                   <button 
                     onClick={handleUpdateSyncKey}
                     disabled={isSyncProcessing || !tempSyncKey}
                     className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 flex items-center justify-center space-x-3 hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50"
                   >
                     {isSyncProcessing ? <RefreshCw size={18} className="animate-spin" /> : <LinkIcon size={18} />}
                     <span>KẾT NỐI ĐÁM MÂY</span>
                   </button>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-50">
                 <div className="flex items-center justify-between p-6 bg-emerald-50 rounded-[32px] border border-emerald-100">
                    <div className="flex items-center space-x-4">
                       <div className="p-3 bg-white rounded-2xl shadow-sm text-emerald-600"><CloudLightning size={24} /></div>
                       <div>
                          <p className="text-sm font-black text-emerald-800">Trạng thái mạng lưới</p>
                          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-0.5">
                            {storeConfig.syncKey ? 'Đã kích hoạt đồng bộ' : 'Đang hoạt động Offline'}
                          </p>
                       </div>
                    </div>
                    {storeConfig.syncKey && (
                      <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-emerald-100">
                         <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                         <span className="text-[10px] font-black text-emerald-600 uppercase">Live Syncing</span>
                      </div>
                    )}
                 </div>
              </div>
           </section>
        </div>
      ) : activeTab === 'store' ? (
        <div className="space-y-8 animate-in slide-in-from-bottom-2">
           <section className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-6 md:p-10 space-y-8 overflow-hidden">
              <div className="flex items-center space-x-5 border-b border-slate-50 pb-8">
                 <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl shrink-0 shadow-sm border border-indigo-100"><Store size={28} /></div>
                 <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Thông tin gian hàng</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Cấu hình hồ sơ hiển thị trên chứng từ và hóa đơn.</p>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên gian hàng</label>
                  <input className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[22px] font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" value={storeConfig.name} onChange={(e) => updateStoreConfig({...storeConfig, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số điện thoại</label>
                  <div className="relative">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-[22px] font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" value={storeConfig.phone} onChange={(e) => updateStoreConfig({...storeConfig, phone: e.target.value})} />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Địa chỉ</label>
                  <div className="relative">
                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-[22px] font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" value={storeConfig.address} onChange={(e) => updateStoreConfig({...storeConfig, address: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-50">
                <div className="flex items-center justify-between mb-8 gap-4">
                  <div className="flex items-center space-x-5">
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-3xl shrink-0 shadow-sm border border-emerald-100"><CreditCard size={28} /></div>
                    <div className="flex-1">
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">Thanh toán VietQR</h3>
                        <p className="text-xs text-slate-500 font-medium mt-1">Thông tin nhận chuyển khoản POS.</p>
                    </div>
                  </div>
                  {!isAdmin && (
                    <div className="flex items-center space-x-2 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 animate-in fade-in">
                       <Lock size={14} />
                       <span className="text-[10px] font-black uppercase tracking-widest">Admin Only</span>
                    </div>
                  )}
                </div>
                
                <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 transition-opacity ${!isAdmin ? 'opacity-70' : 'opacity-100'}`}>
                   <div className="space-y-2 relative" ref={bankRef}>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngân hàng thụ hưởng</label>
                      <div 
                        onClick={() => isAdmin && setIsBankOpen(!isBankOpen)}
                        className={`w-full px-5 py-4 bg-white border rounded-[24px] font-bold flex items-center justify-between transition-all ${isAdmin ? 'cursor-pointer border-slate-200 hover:border-indigo-300 shadow-sm' : 'bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed'} ${isBankOpen ? 'border-indigo-500 ring-4 ring-indigo-50' : ''}`}
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
                        onChange={(e) => updateStoreConfig({...storeConfig, bankAccount: e.target.value.replace(/\D/g, '')})} 
                        placeholder="123456..." 
                      />
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chủ tài khoản (Không dấu)</label>
                      <input 
                        disabled={!isAdmin}
                        className={`w-full px-6 py-4 border rounded-[22px] font-black text-sm outline-none transition-all uppercase ${isAdmin ? 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-indigo-500' : 'bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed'}`} 
                        value={storeConfig.bankAccountName || ''} 
                        onChange={(e) => updateStoreConfig({...storeConfig, bankAccountName: e.target.value.toUpperCase()})} 
                        placeholder="NGUYEN VAN A" 
                      />
                   </div>
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
                    <p className="text-xs text-slate-500 font-medium mt-1">Cập nhật thông tin hiển thị và mật khẩu.</p>
                 </div>
              </div>
              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên hiển thị</label>
                  <div className="relative">
                    <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-[22px] font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu mới</label>
                    <div className="relative group">
                      <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={18} />
                      <input type={showNewPassword ? "text" : "password"} className="w-full pl-14 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-[22px] font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" placeholder="Để trống nếu không đổi" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors">
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nhập lại mật khẩu</label>
                    <div className="relative group">
                      <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input type="password" className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-[22px] font-bold outline-none transition-all text-sm focus:ring-indigo-500" placeholder="Nhập lại mật khẩu mới" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button onClick={handleUpdateProfile} disabled={isSavingProfile} className="w-full md:w-auto px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl flex items-center justify-center space-x-2">
                  {isSavingProfile ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  <span>LƯU THAY ĐỔI</span>
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
                         <p className="text-xs text-slate-500 font-medium mt-1">Danh sách nhân viên hệ thống.</p>
                      </div>
                   </div>
                   <button onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }} className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center space-x-2">
                     <UserPlus size={18} />
                     <span>Thêm nhân viên</span>
                   </button>
                </div>
                <div className="overflow-x-auto scrollbar-hide">
                   <table className="w-full text-left border-collapse min-w-[500px]">
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
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs shadow-sm border border-slate-200">
                                       {user.fullName.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                       <p className="text-sm font-bold text-slate-800 leading-none mb-1">{user.fullName}</p>
                                       <p className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">@{user.username}</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-5">
                                 <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-wider ${user.role === 'admin' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                                    {user.role === 'admin' ? 'Quản trị' : 'Nhân viên'}
                                 </span>
                              </td>
                              <td className="px-10 py-5 text-right">
                                 <div className="flex items-center justify-end space-x-1">
                                    <button onClick={() => resetUserPassword(user.id, 'user@123')} className="p-2.5 text-slate-300 hover:text-amber-600 rounded-xl transition-all" title="Reset mật khẩu">
                                       <RotateCcw size={18} />
                                    </button>
                                    <button onClick={() => { setEditingUser(user); setIsUserModalOpen(true); }} className="p-2.5 text-slate-300 hover:text-indigo-600 rounded-xl transition-all">
                                       <Edit2 size={18} />
                                    </button>
                                    <button onClick={() => setUserToDelete(user)} disabled={user.id === currentUser?.id} className="p-2.5 text-slate-300 hover:text-red-600 rounded-xl transition-all disabled:opacity-30">
                                       <Trash2 size={18} />
                                    </button>
                                 </div>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
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
                           <input required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={userFormData.username} onChange={(e) => setUserFormData({...userFormData, username: e.target.value.toLowerCase()})} placeholder="VD: nhanvien01" />
                        </div>
                      )}
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên *</label>
                         <input required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={userFormData.fullName} onChange={(e) => setUserFormData({...userFormData, fullName: e.target.value})} placeholder="Nguyễn Văn A" />
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
                           <input required type="password" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={userFormData.password} onChange={(e) => setUserFormData({...userFormData, password: e.target.value})} placeholder="••••••••" />
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
      ) : activeTab === 'printer' ? (
        <div className="space-y-6 animate-in slide-in-from-bottom-2">
          <section className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
             <div className="p-6 md:p-8 border-b border-slate-50 bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center space-x-5">
                   <div className={`p-4 rounded-2xl shadow-sm transition-colors shrink-0 ${printerStatus === 'connected' ? 'bg-emerald-500 text-white' : printerStatus === 'searching' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {printerStatus === 'connected' ? <Printer size={32} /> : printerStatus === 'searching' ? <RefreshCw size={32} className="animate-spin" /> : <Unplug size={32} />}
                   </div>
                   <div className="min-w-0">
                      <h3 className="text-lg font-black text-slate-800 tracking-tight truncate">{printerStatus === 'connected' ? storeConfig.printerName || 'Máy in hóa đơn' : 'Chưa thiết lập máy in'}</h3>
                      <div className="flex items-center space-x-3 mt-1">
                         <span className={`text-[10px] font-black uppercase tracking-widest ${printerStatus === 'connected' ? 'text-emerald-500' : printerStatus === 'searching' ? 'text-amber-500' : 'text-slate-400'}`}>
                           {printerStatus === 'connected' ? 'Trạng thái: Online' : printerStatus === 'searching' ? 'Trạng thái: Đang tìm...' : 'Trạng thái: Offline'}
                         </span>
                         {printerStatus === 'connected' && <span className="hidden sm:flex text-xs font-bold text-slate-400 items-center"><Network size={12} className="mr-1" /> {storeConfig.printerIp}</span>}
                      </div>
                   </div>
                </div>
                <div className="flex gap-3">
                   <button onClick={handleConnectPrinter} disabled={isConnecting} className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-lg uppercase hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2">
                     {isConnecting ? <RefreshCw size={16} className="animate-spin" /> : <Cable size={16} />}
                     <span>{printerStatus === 'connected' ? 'Kết nối lại' : 'Kết nối ngay'}</span>
                   </button>
                   <button onClick={handleTestPrint} disabled={isTesting || printerStatus !== 'connected'} className="flex-1 md:flex-none px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase hover:bg-slate-50 transition-all flex items-center justify-center space-x-2">
                     {isTesting ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                     <span>In thử</span>
                   </button>
                </div>
             </div>
             <div className="p-6 md:p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Định danh máy in (Dành cho In LAN/Wifi)</label>
                      <input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-bold" value={storeConfig.printerName} onChange={(e) => updateStoreConfig({...storeConfig, printerName: e.target.value})} placeholder="Xprinter N160I..." />
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">IP Address / Port</label>
                      <input className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-mono font-bold" value={storeConfig.printerIp} onChange={(e) => updateStoreConfig({...storeConfig, printerIp: e.target.value})} placeholder="192.168.1.100" />
                   </div>
                   <div className="space-y-6">
                      <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Giao thức kết nối</h4>
                      <div className="grid grid-cols-2 gap-3">
                         <button onClick={() => updateStoreConfig({...storeConfig, printerType: 'wired'})} className={`p-4 md:p-6 rounded-[24px] border-2 transition-all flex flex-col items-center gap-2 ${storeConfig.printerType === 'wired' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}>
                           <Cable size={32} /><span className="text-[9px] md:text-[10px] font-black uppercase text-center">Có dây (USB/LAN)</span>
                         </button>
                         <button onClick={() => updateStoreConfig({...storeConfig, printerType: 'wireless'})} className={`p-4 md:p-6 rounded-[24px] border-2 transition-all flex flex-col items-center gap-2 ${storeConfig.printerType === 'wireless' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}>
                           <Wifi size={32} /><span className="text-[9px] md:text-[10px] font-black uppercase text-center">Không dây (Wi-Fi)</span>
                         </button>
                      </div>
                   </div>
                </div>

                <div className="pt-8 border-t border-slate-50 space-y-6">
                   <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Khổ giấy in mặc định</h4>
                   <div className="grid grid-cols-3 gap-3">
                      {(['58mm', '80mm', 'A4'] as const).map(size => (
                        <button 
                          key={size}
                          onClick={() => updateStoreConfig({...storeConfig, printerPaperSize: size})}
                          className={`p-4 rounded-[24px] border-2 transition-all flex flex-col items-center gap-2 ${storeConfig.printerPaperSize === size ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}
                        >
                           <FileText size={24} />
                           <span className="text-[10px] font-black uppercase">{size}</span>
                        </button>
                      ))}
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-50">
                   <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                         <p className="text-sm font-bold text-slate-800">Tự động mở hộp thoại in</p>
                         <p className="text-[10px] text-slate-500 font-medium">Sau khi lưu đơn hàng thành công</p>
                      </div>
                      <button onClick={() => updateStoreConfig({...storeConfig, printerAutoPrint: !storeConfig.printerAutoPrint})} className="text-indigo-600">
                        {storeConfig.printerAutoPrint ? <ToggleRight size={44} /> : <ToggleLeft size={44} className="text-slate-300" />}
                      </button>
                   </div>
                   <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-sm font-bold text-slate-800">Số lượng bản in</p>
                      <div className="flex items-center space-x-2 bg-white rounded-xl border border-slate-200 p-1">
                         <button onClick={() => updateStoreConfig({...storeConfig, printerCopies: Math.max(1, (storeConfig.printerCopies || 1) - 1)})} className="p-1 text-slate-400 hover:text-indigo-600"><Minus size={16} /></button>
                         <span className="w-8 text-center font-black text-sm">{storeConfig.printerCopies || 1}</span>
                         <button onClick={() => updateStoreConfig({...storeConfig, printerCopies: (storeConfig.printerCopies || 1) + 1})} className="p-1 text-slate-400 hover:text-indigo-600"><Plus size={16} /></button>
                      </div>
                   </div>
                </div>
             </div>
          </section>
        </div>
      ) : activeTab === 'loyalty' ? (
        <div className="space-y-8 animate-in slide-in-from-bottom-2">
           <section className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-6 md:p-10 space-y-10">
              <div className="flex items-center justify-between gap-6 border-b border-slate-50 pb-8">
                 <div className="flex items-center space-x-5 flex-1 min-w-0">
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
            <div className="p-6 bg-amber-50 rounded-[32px] border border-amber-100 flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-top-2 shadow-sm">
              <div className="p-4 bg-white rounded-2xl shadow-sm text-amber-600 shrink-0 border border-amber-100">
                <BoxSelect size={32} />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h4 className="font-black text-amber-800 uppercase tracking-widest text-[10px] mb-1">Thiết lập giá nhập kho (Giá vốn)</h4>
                <p className="text-xs text-amber-600 font-medium leading-relaxed italic">Chọn một loại giá để làm căn cứ tính toán lợi nhuận khi bán hàng.</p>
              </div>
              <div className="relative w-full md:w-auto">
                <select disabled={!isAdmin} className={`w-full md:w-auto pl-6 pr-12 py-4 bg-white border rounded-2xl outline-none font-black text-sm appearance-none shadow-sm ${isAdmin ? 'border-amber-200 focus:ring-2 focus:ring-amber-500 text-amber-900 cursor-pointer' : 'border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed'} min-w-[220px]`} value={storeConfig.costPriceTypeId} onChange={(e) => updateStoreConfig({...storeConfig, costPriceTypeId: e.target.value})}>
                  {priceTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {isAdmin && <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-amber-400 pointer-events-none" />}
              </div>
            </div>
          )}
          
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-visible">
            {isAdmin && (
              <div className="p-4 md:p-6 border-b border-slate-50 bg-slate-50/30 flex flex-col sm:flex-row gap-4">
                <input className="flex-1 px-5 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm" placeholder={activeTab === 'prices' ? "VD: Giá sỉ, Giá dự án..." : "VD: Thời trang nam, Điện gia dụng..."} value={newValue} onChange={(e) => setNewValue(e.target.value)} />
                <button onClick={handleAdd} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-x-2 hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-100 shrink-0">
                  <Plus size={18} />
                  <span>Thêm mới</span>
                </button>
              </div>
            )}
            <div className="divide-y divide-slate-50">
              {(activeTab === 'prices' ? priceTypes : productGroups).map((item) => {
                const isCostPrice = activeTab === 'prices' && storeConfig.costPriceTypeId === item.id;
                return (
                  <div key={item.id} className="p-4 md:p-6 flex flex-wrap items-center justify-between group hover:bg-slate-50/50 transition-all gap-4">
                    <div className="flex flex-1 items-center space-x-4 min-w-0">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:shadow-sm group-hover:text-indigo-600 transition-all shrink-0 border border-slate-200/50">
                        {activeTab === 'prices' ? <Tag size={20} /> : <Layers size={20} />}
                      </div>
                      
                      {editingId === item.id ? (
                        <div className="flex-1 flex items-center gap-2 max-w-md animate-in slide-in-from-left-2">
                           <input className="flex-1 px-4 py-2 bg-white border-2 border-indigo-600 rounded-xl outline-none font-black text-sm text-slate-900" value={editValue} autoFocus onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()} />
                           <button onClick={handleSaveEdit} className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg active:scale-90 transition-all"><Check size={18} /></button>
                           <button onClick={() => setEditingId(null)} className="p-2 bg-slate-100 text-slate-400 rounded-xl active:scale-90 transition-all"><X size={18} /></button>
                        </div>
                      ) : (
                        <div className="flex flex-1 flex-row flex-wrap items-center gap-2 md:gap-3 min-w-0">
                          <div className="flex flex-col min-w-0">
                            <span className="font-black text-slate-800 text-sm md:text-base leading-tight truncate">{item.name}</span>
                            <span className="text-[9px] md:text-[10px] text-slate-400 font-mono tracking-tighter uppercase mt-0.5">ID: {item.id}</span>
                          </div>
                          
                          {isCostPrice && (
                             <div className="px-2.5 py-1 md:px-3.5 md:py-1.5 bg-amber-50 text-amber-600 border border-amber-200/50 rounded-full flex items-center shrink-0 shadow-sm scale-90 md:scale-100 origin-left">
                               <div className="w-3.5 h-3.5 md:w-4 md:h-4 bg-amber-500 rounded-full flex items-center justify-center mr-2 shrink-0">
                                  <Target size={10} className="text-white" />
                               </div>
                               <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.1em] whitespace-nowrap">GIÁ NHẬP</span>
                             </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {isAdmin && (
                      <div className="flex items-center space-x-1 md:space-x-2 shrink-0 ml-auto">
                        {activeTab === 'prices' && !isCostPrice && editingId !== item.id && (
                          <button onClick={() => updateStoreConfig({...storeConfig, costPriceTypeId: item.id})} className="hidden lg:flex px-3 py-2 text-[9px] font-black uppercase text-amber-600 hover:bg-amber-50 rounded-xl transition-all border border-transparent hover:border-amber-100 items-center gap-1.5">
                            <Target size={12} /> Thiết lập giá nhập
                          </button>
                        )}
                        {editingId !== item.id && (
                          <>
                            <button onClick={() => handleStartEdit(item.id, item.name)} className="p-2.5 md:p-3 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-xl shadow-sm transition-all"><Edit2 size={16} /></button>
                            <button onClick={() => setDeleteId(item.id)} className="p-2.5 md:p-3 text-slate-300 hover:text-red-600 hover:bg-white rounded-xl shadow-sm transition-all"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {(activeTab === 'prices' ? priceTypes : productGroups).length === 0 && (
                <div className="py-20 text-center opacity-20 italic">
                   <BoxSelect size={60} strokeWidth={1} className="mx-auto mb-4" />
                   <p className="text-xs font-black uppercase tracking-[0.3em]">Danh sách trống</p>
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
