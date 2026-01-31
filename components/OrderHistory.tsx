
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { useStore } from '../store';
import { Search, FileText, Calendar, User, CreditCard, Trash2, Eye, ShoppingBag, X, AlertTriangle, ReceiptText, Tag, ArrowUpRight, ArrowDownLeft, Store, ChevronRight, CloudOff, Package } from 'lucide-react';
import { Order, Purchase } from '../types';

const ConfirmDialog = ({ title, message, onConfirm, onCancel }: any) => (
  <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-red-50 text-red-600">
        <AlertTriangle size={32} />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500 mb-8 text-sm">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all text-sm">Hủy</button>
        <button onClick={onConfirm} className="flex-1 py-3 font-bold text-white bg-red-600 hover:bg-red-700 rounded-2xl shadow-lg shadow-red-100 transition-all text-sm">Xác nhận xóa</button>
      </div>
    </div>
  </div>
);

const OrderHistory = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [activeTab, setActiveTab] = useState<'sales' | 'purchases'>('sales');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const { customers, products, deleteOrder, deletePurchase } = useStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const ordersData = await db.orders.where('deleted').equals(0).toArray();
    const purchasesData = await db.purchases.where('deleted').equals(0).toArray();
    
    setOrders(ordersData.sort((a, b) => b.updatedAt - a.updatedAt));
    setPurchases(purchasesData.sort((a, b) => b.updatedAt - a.updatedAt));
  };

  const getCustomerName = (id: string) => {
    if (id === 'walk-in') return 'Khách lẻ';
    return customers.find(c => c.id === id)?.name || 'N/A';
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const handleDelete = async () => {
    if (deleteId) {
      if (activeTab === 'sales') {
        await deleteOrder(deleteId);
      } else {
        await deletePurchase(deleteId);
      }
      await loadData();
      setDeleteId(null);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCustomerName(o.customerId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPurchases = purchases.filter(p => 
    p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const items = activeTab === 'sales' ? filteredOrders : filteredPurchases;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lịch sử giao dịch</h1>
          <p className="text-slate-500 text-sm font-medium">Xem lại toàn bộ hoạt động bán hàng và nhập kho.</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto scrollbar-hide shrink-0">
          <button 
            onClick={() => setActiveTab('sales')}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap text-sm ${activeTab === 'sales' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <ArrowUpRight size={18} />
            <span>Đơn bán hàng</span>
          </button>
          <button 
            onClick={() => setActiveTab('purchases')}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap text-sm ${activeTab === 'purchases' ? 'bg-purple-600 text-white shadow-lg shadow-purple-100' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <ArrowDownLeft size={18} />
            <span>Phiếu nhập hàng</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-4 sticky top-0 z-10">
        <div className="p-2 bg-slate-50 text-slate-400 rounded-xl">
           <Search size={20} />
        </div>
        <input 
          type="text" 
          placeholder={`Tìm ${activeTab === 'sales' ? 'mã đơn, tên khách...' : 'mã phiếu, nhà cung cấp...'}`}
          className="w-full bg-transparent border-none outline-none font-bold placeholder:text-slate-300 text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="hidden md:block bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Giao dịch</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{activeTab === 'sales' ? 'Đối tác' : 'Nhà cung cấp'}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng tiền</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === 'sales' ? 'bg-indigo-50 text-indigo-600' : 'bg-purple-50 text-purple-600'}`}>
                        {activeTab === 'sales' ? <ReceiptText size={20} /> : <Store size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                           <div className="text-sm font-black text-slate-800 uppercase tracking-tight">{item.id}</div>
                           {item.synced === 0 && (
                             <span className="px-1 py-0.5 bg-amber-50 text-amber-600 rounded border border-amber-100 flex items-center space-x-1 shrink-0">
                                <CloudOff size={8} />
                                <span className="text-[7px] font-black uppercase">Chưa đồng bộ</span>
                             </span>
                           )}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center font-bold">
                          <Calendar size={12} className="mr-1" /> {formatDate(item.updatedAt || item.createdAt)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm font-bold text-slate-700">{activeTab === 'sales' ? getCustomerName(item.customerId) : item.supplierName}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className={`text-sm font-black ${activeTab === 'sales' ? 'text-indigo-600' : 'text-purple-600'}`}>
                      {item.total.toLocaleString()}đ
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{item.items?.length || 0} Sản phẩm</div>
                  </td>
                  <td className="px-6 py-5">
                    {activeTab === 'sales' ? (
                       <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase">Hoàn tất</span>
                    ) : (
                       <span className="px-3 py-1 bg-purple-50 text-purple-600 text-[10px] font-black rounded-full uppercase">Đã nhập kho</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end space-x-2">
                       <button onClick={() => activeTab === 'sales' ? setSelectedOrder(item) : setSelectedPurchase(item)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><Eye size={18} /></button>
                       <button onClick={() => setDeleteId(item.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {items.map((item: any) => (
          <div key={item.id} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm active:scale-[0.98] transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                 <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${activeTab === 'sales' ? 'bg-indigo-50 text-indigo-600' : 'bg-purple-50 text-purple-600'}`}>
                    {activeTab === 'sales' ? <ReceiptText size={20} /> : <Store size={20} />}
                 </div>
                 <div>
                    <div className="flex items-center space-x-2">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">{item.id}</p>
                       {item.synced === 0 && <CloudOff size={10} className="text-amber-500" />}
                    </div>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">{formatDate(item.updatedAt || item.createdAt)}</p>
                 </div>
              </div>
              <span className={`px-2.5 py-1 text-[9px] font-black rounded-full uppercase ${activeTab === 'sales' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'}`}>
                {activeTab === 'sales' ? 'Hoàn tất' : 'Nhập kho'}
              </span>
            </div>

            <div className="flex items-end justify-between">
               <div>
                  <h3 className="text-sm font-bold text-slate-700 leading-none mb-1.5">{activeTab === 'sales' ? getCustomerName(item.customerId) : item.supplierName}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.items?.length || 0} Sản phẩm</p>
               </div>
               <div className="text-right">
                  <p className={`text-lg font-black tracking-tighter ${activeTab === 'sales' ? 'text-indigo-600' : 'text-purple-600'}`}>
                    {item.total.toLocaleString()}đ
                  </p>
                  <div className="flex items-center justify-end mt-2 space-x-2">
                     <button onClick={() => setDeleteId(item.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl"><Trash2 size={16} /></button>
                     <button onClick={() => activeTab === 'sales' ? setSelectedOrder(item) : setSelectedPurchase(item)} className="p-2.5 bg-slate-900 text-white rounded-xl flex items-center space-x-1.5 shadow-lg shadow-slate-100">
                        <span className="text-[10px] font-black uppercase tracking-widest ml-1">Xem</span>
                        <ChevronRight size={14} />
                     </button>
                  </div>
               </div>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="py-24 text-center opacity-30 italic">
            <ShoppingBag size={80} strokeWidth={1} className="mb-4 text-slate-300 mx-auto" />
            <p className="text-xs font-black uppercase tracking-[0.4em]">Không có dữ liệu</p>
        </div>
      )}

      {(selectedOrder || selectedPurchase) && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 md:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-none md:rounded-[48px] shadow-3xl flex flex-col h-full md:h-auto max-h-[100vh] md:max-h-[92vh] overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl ${selectedOrder ? 'bg-indigo-600 text-white' : 'bg-purple-600 text-white'}`}>
                  {selectedOrder ? <ReceiptText size={20} /> : <Store size={20} />}
                </div>
                <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">
                  Chi tiết {selectedOrder ? 'đơn bán' : 'phiếu nhập'}
                </h2>
              </div>
              <button onClick={() => { setSelectedOrder(null); setSelectedPurchase(null); }} className="p-3 bg-white border border-slate-100 shadow-sm rounded-full text-slate-400 active:scale-90 transition-all">
                 <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 md:space-y-8 scrollbar-hide">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Đối tác / Nhà cung cấp</label>
                    <p className="text-base font-bold text-slate-800">
                      {selectedOrder ? getCustomerName(selectedOrder.customerId) : selectedPurchase?.supplierName}
                    </p>
                    <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-widest">
                      Mã: {selectedOrder?.id || selectedPurchase?.id}
                    </p>
                  </div>
                  <div className={`p-6 rounded-[32px] border text-right shadow-sm ${selectedOrder ? 'bg-indigo-50 border-indigo-100' : 'bg-purple-50 border-purple-100'}`}>
                    <label className={`text-[9px] font-black uppercase tracking-widest block mb-2 ${selectedOrder ? 'text-indigo-400' : 'text-purple-400'}`}>Tổng giá trị</label>
                    <p className={`text-2xl font-black ${selectedOrder ? 'text-indigo-600' : 'text-purple-600'}`}>
                      {(selectedOrder?.total || selectedPurchase?.total || 0).toLocaleString()}đ
                    </p>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                     <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DANH SÁCH SẢN PHẨM</h3>
                     <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase">
                       {(selectedOrder?.items || selectedPurchase?.items || []).length} SP
                     </span>
                  </div>
                  <div className="divide-y divide-slate-50 border border-slate-50 rounded-[32px] overflow-hidden bg-white">
                    {(selectedOrder?.items || selectedPurchase?.items || []).map((item: any) => {
                      const pInfo = products.find(p => p.id === item.productId);
                      return (
                      <div key={item.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                        <div className="flex items-center space-x-4 min-w-0 flex-1">
                           <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                             {pInfo?.image ? <img src={pInfo.image} className="w-full h-full object-cover" /> : <Package size={20} className="text-slate-300" />}
                           </div>
                           <div className="min-w-0 flex-1">
                             <p className="font-bold text-slate-800 text-sm truncate leading-tight">
                               {selectedOrder ? (pInfo?.name || 'N/A') : item.name}
                             </p>
                             <p className="text-[10px] text-slate-400 font-black mt-1 uppercase tracking-tight">
                               {(item.price || item.cost).toLocaleString()}đ x {item.qty}
                             </p>
                           </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                           <p className="font-black text-slate-900 text-sm">{item.total.toLocaleString()}đ</p>
                        </div>
                      </div>
                    )})}
                  </div>
               </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 md:rounded-b-[48px] flex justify-end pb-12 md:pb-6">
               <button onClick={() => { setSelectedOrder(null); setSelectedPurchase(null); }} className="w-full md:w-auto px-12 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all">ĐÓNG</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <ConfirmDialog 
          title="Xác nhận xóa giao dịch?"
          message="Lưu ý: Hành động này sẽ xóa vĩnh viễn dữ liệu giao dịch khỏi lịch sử và không thể khôi phục. Bạn có chắc chắn?"
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
};

export default OrderHistory;
