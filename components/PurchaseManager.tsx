
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { db, generateId } from '../db';
import { 
  Search, Plus, Minus, Trash2, ShoppingCart, X, PackageSearch, 
  Barcode, Wallet, ArrowDownCircle, CheckCircle, PackagePlus, Box
} from 'lucide-react';
import { Product, PurchaseItem, Purchase } from '../types';

const PurchaseManager = () => {
  const { products, addPurchase, storeConfig, priceTypes } = useStore();
  const [cart, setCart] = useState<PurchaseItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [isProductFocused, setIsProductFocused] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [costPrices, setCostPrices] = useState<Record<string, number>>({});

  const productRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCostPrices = async () => {
      const prices = await db.productPrices.where('priceTypeId').equals(storeConfig.costPriceTypeId).toArray();
      const map: Record<string, number> = {};
      prices.forEach(p => map[p.productId] = p.price);
      setCostPrices(map);
    };
    fetchCostPrices();
  }, [storeConfig.costPriceTypeId]);

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      handleQtyChange(product.id, existing.qty + 1);
    } else {
      const cost = costPrices[product.id] || 0;
      const newItem: PurchaseItem = {
        id: generateId(),
        productId: product.id,
        name: product.name,
        qty: 1,
        cost,
        total: cost
      };
      setCart([...cart, newItem]);
    }
  };

  const handleQtyChange = (productId: string, value: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(0, value);
        return { ...item, qty: newQty, total: newQty * item.cost };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const totalAmount = useMemo(() => cart.reduce((sum, item) => sum + item.total, 0), [cart]);

  const handleSavePurchase = async () => {
    if (cart.length === 0) return;
    const purchaseId = generateId();
    const purchase: Purchase = {
      id: purchaseId,
      supplierName: supplierName || 'Nhà cung cấp lẻ',
      total: totalAmount,
      items: cart,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      synced: 0,
      deleted: 0
    };
    await addPurchase(purchase);
    setCart([]);
    setSupplierName('');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const filteredProducts = useMemo(() => {
    const term = productSearch.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.code.toLowerCase().includes(term) ||
      (p.barcode && p.barcode.includes(term))
    ).slice(0, 10);
  }, [productSearch, products]);

  const getStockColor = (stock: number) => {
    if (stock <= 0) return 'text-red-500 bg-red-50';
    if (stock < 10) return 'text-amber-500 bg-amber-50';
    return 'text-emerald-500 bg-emerald-50';
  };

  return (
    <div className="h-full flex flex-col gap-4 animate-in fade-in duration-500 relative">
      <style>{`
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {showSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3">
            <CheckCircle size={20} />
            <span className="font-bold">Nhập kho thành công!</span>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nhập hàng vào kho</h1>
          <p className="text-slate-500 text-sm">Cập nhật số lượng tồn kho từ nhà cung cấp.</p>
        </div>
        <div className="flex items-center space-x-2 text-[10px] font-bold bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full border border-amber-100">
          <Box size={14} />
          <span>GIÁ NHẬP: {priceTypes.find(t => t.id === storeConfig.costPriceTypeId)?.name || 'Mặc định'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
          <div className="relative" ref={productRef}>
             <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-4 focus-within:ring-2 focus-within:ring-indigo-50 focus-within:border-indigo-600 transition-all">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shadow-sm border border-indigo-100">
                  <Search size={20} />
                </div>
                <input 
                  className="flex-1 bg-transparent border-none outline-none font-medium placeholder:text-slate-300"
                  placeholder="Tìm sản phẩm để nhập kho..."
                  value={productSearch}
                  onFocus={() => setIsProductFocused(true)}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
                <Barcode className="text-slate-200" />
             </div>
             {isProductFocused && (
               <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                  <div className="max-h-80 overflow-y-auto p-2 scrollbar-hide">
                    {filteredProducts.map(p => (
                      <button 
                        key={p.id}
                        onClick={() => { addToCart(p); setIsProductFocused(false); setProductSearch(''); }}
                        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-all"
                      >
                         <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden">
                               {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <PackageSearch size={18} className="text-slate-300" />}
                            </div>
                            <div className="text-left">
                               <div className="text-sm font-bold text-slate-800">{p.name}</div>
                               <div className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full mt-1 inline-block w-fit ml-auto ${getStockColor(p.stock)}`}>Tồn: {p.stock}</div>
                            </div>
                         </div>
                         <div className="text-right font-bold text-indigo-600 text-sm">
                           {(costPrices[p.id] || 0).toLocaleString()}đ
                         </div>
                      </button>
                    ))}
                    {filteredProducts.length === 0 && (
                        <div className="p-10 text-center opacity-20">
                            <PackageSearch size={40} className="mx-auto mb-2" />
                            <p className="text-xs font-black uppercase tracking-widest">Không có kết quả</p>
                        </div>
                    )}
                  </div>
               </div>
             )}
          </div>

          <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm flex-1 flex flex-col overflow-hidden min-h-0">
             <div className="p-6 border-b border-slate-50 flex items-center justify-between shrink-0">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center">
                   <PackagePlus size={16} className="mr-2 text-indigo-600" /> DANH SÁCH NHẬP KHO
                </h3>
                <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">{cart.length} SP</span>
             </div>

             <div className="grid grid-cols-[1fr_65px_80px_32px] md:grid-cols-[1fr_100px_120px_40px] gap-2 md:gap-4 px-4 md:px-6 py-3 bg-slate-50/50 border-b border-slate-50 shrink-0">
                <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Sản phẩm</span>
                <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">SL</span>
                <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">T.Tiền</span>
                <span></span>
             </div>

             <div className="flex-1 overflow-y-auto scrollbar-hide">
                {cart.map(item => (
                  <div key={item.id} className="grid grid-cols-[1fr_65px_80px_32px] md:grid-cols-[1fr_100px_120px_40px] items-center gap-2 md:gap-4 px-4 md:px-6 py-4 md:py-4 border-b border-slate-50 hover:bg-slate-50 transition-all group last:border-b-0">
                     <div className="min-w-0">
                        <div className="text-[12px] md:text-sm font-bold text-slate-800 leading-tight md:leading-normal truncate md:whitespace-normal">{item.name}</div>
                        <div className="text-[9px] md:text-[10px] text-slate-500 font-bold mt-1 tracking-tight">{item.cost.toLocaleString()}đ</div>
                     </div>
                     <div className="flex items-center bg-white rounded-lg border border-slate-100 p-0.5 shadow-sm w-fit mx-auto scale-[0.85] md:scale-100 origin-center">
                        <button onClick={() => handleQtyChange(item.productId, item.qty - 1)} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"><Minus size={12} /></button>
                        <input 
                           type="number"
                           className="w-5 md:w-12 text-center font-black text-[11px] md:text-sm border-none focus:ring-0 outline-none p-0 bg-transparent"
                           value={item.qty || ''}
                           onChange={(e) => handleQtyChange(item.productId, parseInt(e.target.value) || 0)}
                        />
                        <button onClick={() => handleQtyChange(item.productId, item.qty + 1)} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"><Plus size={12} /></button>
                     </div>
                     <div className="text-right font-black text-slate-900 text-[11px] md:text-sm whitespace-nowrap">
                        {item.total.toLocaleString()}đ
                     </div>
                     <button onClick={() => removeFromCart(item.productId)} className="flex justify-end text-slate-200 hover:text-red-500 transition-colors p-1"><Trash2 size={16} /></button>
                  </div>
                ))}
                {cart.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-40 py-20">
                      <ShoppingCart size={48} className="mb-4" />
                      <p className="text-xs font-black uppercase tracking-[0.2em]">Chưa có sản phẩm nào</p>
                   </div>
                )}
             </div>
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
              <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nhà cung cấp</label>
                    <input 
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                      placeholder="Tên NCC / Người giao hàng..."
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                    />
                 </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                 <div className="flex justify-between items-center mb-6">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">TỔNG TIỀN NHẬP</span>
                    <span className="text-2xl font-black text-indigo-600 tracking-tighter">{totalAmount.toLocaleString()}đ</span>
                 </div>
                 <button 
                  onClick={handleSavePurchase}
                  disabled={cart.length === 0}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all active:scale-95 disabled:grayscale uppercase tracking-widest flex items-center justify-center space-x-3"
                 >
                    <ArrowDownCircle size={18} />
                    <span>XÁC NHẬN NHẬP KHO</span>
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseManager;
