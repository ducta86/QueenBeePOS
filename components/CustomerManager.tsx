
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { db } from '../db';
import { 
  Search, 
  UserPlus, 
  Phone, 
  Tag, 
  X, 
  Calendar, 
  MapPin, 
  Facebook, 
  Trash2, 
  Edit2, 
  AlertTriangle,
  User as UserIcon,
  Crown,
  TrendingUp,
  ShoppingBag,
  ChevronDown,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  ChevronRight,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { Customer } from '../types';
import * as XLSX from 'xlsx';

const generateShortId = (prefix: string) => {
  return `${prefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
};

const ConfirmDialog = ({ title, message, onConfirm, onCancel, type = 'danger', showConfirm = true }: any) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 text-center border border-slate-100">
      <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${type === 'danger' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
        {type === 'danger' ? <AlertTriangle size={32} /> : <Info size={32} />}
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500 mb-8 text-sm">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all text-sm">
          {showConfirm ? 'Hủy' : 'Đã hiểu'}
        </button>
        {showConfirm && (
          <button onClick={onConfirm} className={`flex-1 py-3 font-bold text-white rounded-2xl shadow-lg transition-all text-sm ${type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-100'}`}>
            Xác nhận
          </button>
        )}
      </div>
    </div>
  </div>
);

const CustomerManager = () => {
  const { customers, priceTypes, loyaltyConfig, addCustomer, updateCustomer, deleteCustomer, fetchInitialData, storeConfig, error, setError } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isBlockedDelete, setIsBlockedDelete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  
  const excelImportRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    birthday: '',
    address: '',
    facebook: '',
    typeId: '', 
    isLoyal: false
  });

  useEffect(() => {
    if (editingCustomer) {
      setFormData({
        name: editingCustomer.name,
        phone: editingCustomer.phone,
        birthday: editingCustomer.birthday || '',
        address: editingCustomer.address || '',
        facebook: editingCustomer.facebook || '',
        typeId: editingCustomer.typeId,
        isLoyal: editingCustomer.isLoyal || false
      });
    } else {
      setFormData({ 
        name: '', 
        phone: '', 
        birthday: '', 
        address: '', 
        facebook: '', 
        typeId: priceTypes[0]?.id || '', 
        isLoyal: false 
      });
    }
    setLocalError(null);
  }, [editingCustomer, isModalOpen, priceTypes]);

  const handleExportExcel = () => {
    setIsProcessing(true);
    try {
      const exportData = customers.map(c => ({
        'ID': c.id,
        'Họ tên': c.name,
        'Số điện thoại': c.phone,
        'Địa chỉ': c.address || '',
        'Ngày sinh': c.birthday || '',
        'Facebook': c.facebook || '',
        'Nhóm khách hàng': priceTypes.find(t => t.id === c.typeId)?.name || '',
        'Thành viên thân thiết': c.isLoyal ? 'Có' : 'Không',
        'Tổng chi tiêu': c.totalSpent,
        'Số đơn hàng': c.orderCount
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Khách hàng");
      const safeStoreName = (storeConfig?.name || 'Store').replace(/[^a-z0-9]/gi, '_');
      XLSX.writeFile(workbook, `${safeStoreName}_Customers_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`);
    } catch (err) {
      setError("Lỗi khi xuất file Excel.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet);

        let importedCount = 0;
        let updatedCount = 0;

        for (let i = 0; i < data.length; i++) {
          const row: any = data[i];
          const idInFile = String(row['ID'] || '').trim();
          const name = String(row['Họ tên'] || row['Tên'] || '').trim();
          const phone = String(row['Số điện thoại'] || row['SĐT'] || '').trim();
          const typeName = String(row['Nhóm khách hàng'] || row['Nhóm'] || '').trim();
          const typeId = priceTypes.find(pt => pt.name.toLowerCase() === typeName.toLowerCase())?.id || priceTypes[0]?.id;

          if (!name || !phone) continue;

          let targetCustomer = idInFile ? await db.customers.get(idInFile) : null;

          if (targetCustomer) {
            await db.customers.update(targetCustomer.id, {
              name, phone, typeId, updatedAt: Date.now(), synced: 0
            });
            updatedCount++;
          } else {
            const newId = generateShortId('C');
            await db.customers.add({
              id: newId, name, phone, typeId, 
              totalSpent: Number(row['Tổng chi tiêu'] || 0),
              orderCount: Number(row['Số đơn hàng'] || 0),
              createdAt: Date.now(), updatedAt: Date.now(), synced: 0, deleted: 0
            } as any);
            importedCount++;
          }
        }
        await fetchInitialData();
        setSuccessMsg(`Xử lý xong: Thêm mới ${importedCount}, Cập nhật ${updatedCount} khách hàng.`);
        setTimeout(() => setSuccessMsg(null), 5000);
      } catch (err) {
        setError("File Excel không đúng định dạng.");
      } finally {
        setIsProcessing(false);
        if (excelImportRef.current) excelImportRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCheckDelete = async (id: string) => {
    const orderCount = await db.orders.where('customerId').equals(id).count();
    setIsBlockedDelete(orderCount > 0);
    setDeleteConfirmId(id);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  const getPriceTypeName = (id: string) => priceTypes.find(t => t.id === id)?.name || '---';

  const checkAutoLoyalty = (customer: Customer) => {
    if (!loyaltyConfig || !loyaltyConfig.enabled) return false;
    return customer.totalSpent >= loyaltyConfig.minSpend || customer.orderCount >= loyaltyConfig.minOrders;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
        setLocalError("Vui lòng nhập đầy đủ Tên và Số điện thoại.");
        return;
    }

    const customerId = editingCustomer ? editingCustomer.id : generateShortId('C');
    const payload: Customer = {
      id: customerId,
      ...formData,
      totalSpent: editingCustomer?.totalSpent || 0,
      orderCount: editingCustomer?.orderCount || 0,
      updatedAt: Date.now(),
      synced: 0,
      deleted: 0
    };

    if (editingCustomer) await updateCustomer(payload);
    else await addCustomer(payload);

    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {(error || localError) && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[250] w-full max-w-md px-4 animate-in slide-in-from-top-4">
          <div className="bg-red-50 border border-red-200 p-4 rounded-2xl shadow-xl flex items-center space-x-3 text-red-700">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-sm font-bold">{localError || error}</p>
            <button onClick={() => { setError(null); setLocalError(null); }} className="ml-auto p-1 hover:bg-red-100 rounded-full">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[250] w-full max-w-md px-4 animate-in slide-in-from-top-4">
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl shadow-xl flex items-center space-x-3 text-emerald-700">
            <CheckCircle2 size={20} className="shrink-0" />
            <p className="text-sm font-bold">{successMsg}</p>
            <button onClick={() => setSuccessMsg(null)} className="ml-auto p-1 hover:bg-emerald-100 rounded-full">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
           <div className="bg-white p-8 rounded-3xl shadow-2xl text-center space-y-4">
              <Loader2 size={40} className="mx-auto text-indigo-600 animate-spin" />
              <p className="text-sm font-bold text-slate-700 uppercase tracking-widest">Đang xử lý...</p>
           </div>
        </div>
      )}

      {deleteConfirmId && (
        <ConfirmDialog 
          title={isBlockedDelete ? "Hạn chế xóa" : "Xác nhận xóa?"}
          message={isBlockedDelete 
            ? "Khách hàng này đã có đơn hàng. Để bảo vệ dữ liệu, hệ thống không cho phép xóa." 
            : "Bạn có chắc chắn muốn xóa khách hàng này?"}
          type={isBlockedDelete ? 'info' : 'danger'}
          showConfirm={!isBlockedDelete}
          onConfirm={() => {
            deleteCustomer(deleteConfirmId!);
            setDeleteConfirmId(null);
          }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Khách hàng</h1>
          <p className="text-slate-500 text-sm">Quản lý tệp khách hàng thân thiết.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
            <button onClick={handleExportExcel} className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 font-bold transition-all text-sm">
              <Download size={18} />
              <span className="hidden sm:inline">Xuất Excel</span>
            </button>
            <div className="w-px h-6 bg-slate-100 self-center"></div>
            <button onClick={() => excelImportRef.current?.click()} className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 font-bold transition-all text-sm">
              <FileSpreadsheet size={18} />
              <span className="hidden sm:inline">Nhập Excel</span>
            </button>
            <input type="file" ref={excelImportRef} className="hidden" accept=".xlsx,.xls" onChange={handleImportExcel} />
          </div>

          <button onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }} className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 whitespace-nowrap text-sm">
            <UserPlus size={20} />
            <span>Thêm khách hàng</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-3 rounded-3xl border border-slate-100 shadow-sm sticky top-16 z-20">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm theo tên hoặc số điện thoại..." 
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((customer) => {
          const isAutoLoyal = checkAutoLoyalty(customer);
          const displayLoyal = customer.isLoyal || isAutoLoyal;

          return (
            <div key={customer.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-50/40 transition-all group relative overflow-hidden">
              {displayLoyal && (
                <div className="absolute top-0 right-0">
                  <div className={`px-4 py-1.5 flex items-center space-x-1.5 rounded-bl-[20px] shadow-sm ${isAutoLoyal ? 'bg-amber-500 text-white' : 'bg-indigo-600 text-white'}`}>
                    <Crown size={12} fill="currentColor" />
                    <span className="text-[10px] font-black uppercase tracking-[0.1em]">VIP</span>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-start mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl transition-all shadow-sm border ${displayLoyal ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => { setEditingCustomer(customer); setIsModalOpen(true); }} className="p-2.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 size={18} /></button>
                  <button onClick={() => handleCheckDelete(customer.id)} className="p-2.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                </div>
              </div>
              
              <div className="mb-6 min-w-0">
                <h3 className="text-[15px] font-black text-slate-800 truncate pr-12 leading-tight">{customer.name}</h3>
                <p className="text-[10px] text-slate-400 font-black mt-1 uppercase tracking-widest">ID: {customer.id}</p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 mr-3 shadow-sm"><Phone size={14} /></div>
                  <span className="text-sm font-bold text-slate-600">{customer.phone}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                   <div className="bg-indigo-50/40 p-3 rounded-2xl border border-indigo-100/50">
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1 flex items-center"><TrendingUp size={10} className="mr-1" /> Chi tiêu</p>
                      <p className="text-xs font-black text-indigo-700">{(customer.totalSpent || 0).toLocaleString()}đ</p>
                   </div>
                   <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center"><ShoppingBag size={10} className="mr-1" /> Đơn hàng</p>
                      <p className="text-xs font-black text-slate-700">{customer.orderCount || 0} lần</p>
                   </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${customer.typeId.includes('wholesale') || customer.typeId.includes('vip') ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    <Tag size={10} className="inline mr-1" /> {getPriceTypeName(customer.typeId)}
                  </span>
                  <ChevronRight size={16} className="text-slate-200" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-none md:rounded-[48px] shadow-3xl overflow-hidden flex flex-col h-full md:h-auto max-h-[100vh] md:max-h-[95vh]">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center space-x-3">
                 <div className="p-2 bg-indigo-600 text-white rounded-xl"><UserIcon size={20} /></div>
                 <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                   {editingCustomer ? 'CẬP NHẬT THÔNG TIN' : 'THÊM KHÁCH HÀNG MỚI'}
                 </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white border border-slate-100 shadow-sm rounded-full text-slate-400 active:scale-90 transition-all"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scrollbar-hide pb-24 md:pb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên khách hàng *</label>
                  <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số điện thoại *</label>
                  <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nhóm khách hàng *</label>
                  <div className="relative">
                    <select required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer text-sm font-bold" value={formData.typeId} onChange={e => setFormData({...formData, typeId: e.target.value})}>
                      {priceTypes.map(pt => (
                        <option key={pt.id} value={pt.id}>{pt.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngày sinh</label>
                  <input type="date" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold" value={formData.birthday} onChange={e => setFormData({...formData, birthday: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Địa chỉ</label>
                <input className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>

              <div className="flex items-center justify-between p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-2xl shadow-sm ${formData.isLoyal ? 'bg-indigo-600 text-white' : 'bg-white text-slate-300'}`}><Crown size={24} /></div>
                  <div>
                    <p className="text-sm font-black text-slate-800">Thành viên ưu tú</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Áp dụng các chính sách ưu đãi</p>
                  </div>
                </div>
                <button type="button" onClick={() => setFormData({...formData, isLoyal: !formData.isLoyal})} className="text-indigo-600">
                  {formData.isLoyal ? <ToggleRight size={44} /> : <ToggleLeft size={44} className="text-slate-300" />}
                </button>
              </div>
            </form>

            <div className="p-6 bg-slate-50 border-t border-slate-100 md:rounded-b-[48px] flex justify-end space-x-3 shrink-0 pb-12 md:pb-6">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 md:flex-none px-8 py-4 font-black text-slate-400 hover:text-slate-600 rounded-2xl transition-all text-[11px] uppercase tracking-widest">HỦY</button>
              <button onClick={handleSubmit} className="flex-1 md:flex-none px-12 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all active:scale-95 uppercase tracking-widest">
                {editingCustomer ? 'LƯU THAY ĐỔI' : 'TẠO KHÁCH HÀNG'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManager;
