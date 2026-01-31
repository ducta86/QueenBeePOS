
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { db, generateId } from '../db';
import { 
  Search, Plus, Minus, Trash2, ShoppingCart, X, PackageSearch, 
  Barcode, Wallet, ArrowDownCircle, CheckCircle, PackagePlus, Box, Package,
  Camera, Loader2, OctagonAlert, RotateCcw
} from 'lucide-react';
import { Product, PurchaseItem, Purchase } from '../types';
import { Html5Qrcode } from "html5-qrcode";

const playBeep = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
  } catch (e) {
    console.warn("Beep failed", e);
  }
};

const BarcodeScannerModal = ({ isOpen, onClose, onScan }: { isOpen: boolean, onClose: () => void, onScan: (code: string) => void }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setScannerError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const stopAndClose = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2 || state === 3) await scannerRef.current.stop();
      } catch (e) {
        console.warn("Stop failed:", e);
      } finally {
        scannerRef.current = null;
        onClose();
      }
    } else {
      onClose();
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      setIsInitializing(true);
      setScannerError(null);
      const startScanner = async () => {
        try {
          const html5QrCode = new Html5Qrcode("purchase-reader");
          scannerRef.current = html5QrCode;
          await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 15, qrbox: { width: 250, height: 150 } },
            async (decodedText) => {
              if (!isMounted) return;
              playBeep(); // Phát tiếng beep khi camera quét thành công
              if (navigator.vibrate) navigator.vibrate(100);
              onScan(decodedText);
              await stopAndClose();
            },
            () => {} 
          );
          if (isMounted) setIsInitializing(false);
        } catch (err) {
          if (isMounted) {
            setScannerError("Không thể truy cập Camera.");
            setIsInitializing(false);
          }
        }
      };
      const timer = setTimeout(startScanner, 100);
      return () => {
        isMounted = false;
        clearTimeout(timer);
        if (scannerRef.current) {
          const state = scannerRef.current.getState();
          if (state === 2 || state === 3) scannerRef.current.stop();
        }
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-[40px] shadow-3xl overflow-hidden relative border border-slate-100">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
           <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><Camera size={20} /></div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-800">Quét mã sản phẩm</h2>
           </div>
           <button onClick={stopAndClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"><X size={24} /></button>
        </div>
        <div className="p-6">
          <div className="relative aspect-square md:aspect-video bg-slate-900 rounded-[28px] overflow-hidden border-4 border-slate-100 shadow-inner">
             <div id="purchase-reader" className="w-full h-full"></div>
             {isInitializing && (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900/60">
                  <Loader2 size={40} className="animate-spin mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Đang khởi tạo...</p>
               </div>
             )}
             {error && (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 text-rose-400 bg-slate-900/90">
                  <OctagonAlert size={48} className="mb-4" />
                  <p className="text-sm font-bold leading-relaxed">{error}</p>
               </div>
             )}
             {!isInitializing && !error && (
               <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-[250px] h-[150px] border-2 border-indigo-500 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] relative">
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-indigo-400 animate-[scan_2s_linear_infinite]"></div>
                  </div>
               </div>
             )}
          </div>
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
           <button onClick={stopAndClose} className="px-8 py-3 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-100 transition-all">Đóng</button>
        </div>
      </div>
      <style>{`@keyframes scan { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }`}</style>
    </div>
  );
};

const PurchaseManager = () => {
  const navigate = useNavigate();
  const { products, addPurchase, storeConfig, priceTypes, setError, error } = useStore();
  const [cart, setCart] = useState<PurchaseItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [isProductFocused, setIsProductFocused] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [costPrices, setCostPrices] = useState<Record<string, number>>({});
  const [showScanner, setShowScanner] = useState(false);

  const productRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!storeConfig.costPriceTypeId) {
      navigate('/settings');
      return;
    }
    const fetchCostPrices = async () => {
      const prices = await db.productPrices.where('priceTypeId').equals(storeConfig.costPriceTypeId).toArray();
      const map: Record<string, number> = {};
      prices.forEach(p => { if (p.deleted === 0) map[p.productId] = p.price; });
      setCostPrices(map);
    };
    fetchCostPrices();
  }, [storeConfig.costPriceTypeId, navigate]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (productRef.current && !productRef.current.contains(e.target as Node)) setIsProductFocused(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      handleQtyChange(product.id, existing.qty + 1);
    } else {
      const cost = costPrices[product.id] || 0;
      setCart([...cart, { id: generateId(), productId: product.id, name: product.name, qty: 1, cost, total: cost }]);
    }
    setProductSearch('');
    setIsProductFocused(false);
  };

  const handleBarcodeScan = (code: string) => {
    const product = products.find(p => p.barcode === code || p.code === code);
    if (product) {
      addToCart(product);
      setProductSearch('');
    } else {
      // Hiện toast lỗi nếu không tìm thấy giống như bên POS
      setError(`Không tìm thấy mã sản phẩm: ${code}`);
      setTimeout(() => setError(null), 3000);
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
    const purchase: Purchase = {
      id: generateId(),
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
    if (!term && isProductFocused) return products.slice(0, 10);
    return products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.code.toLowerCase().includes(term) ||
      (p.barcode && p.barcode.includes(term))
    ).slice(0, 15);
  }, [productSearch, products, isProductFocused]);

  const getStockColor = (stock: number) => {
    if (stock <= 0) return 'text-red-500 bg-red-50';
    if (stock <= (storeConfig.lowStockThreshold || 10)) return 'text-amber-500 bg-amber-50';
    return 'text-emerald-500 bg-emerald-50';
  };

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-500 min-h-full pb-24 md:pb-8 lg:h-full">
      <style>{`
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* TOAST THÀNH CÔNG - FIX XUỐNG DÒNG */}
      {showSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 whitespace-nowrap max-w-max">
            <CheckCircle size={20} className="shrink-0" />
            <span className="font-bold">Nhập kho thành công!</span>
          </div>
        </div>
      )}

      {/* TOAST LỖI (GIỐNG BÁN HÀNG) - FIX XUỐNG DÒNG */}
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top">
          <div className="bg-rose-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 whitespace-nowrap max-w-max">
            <OctagonAlert size={20} className="shrink-0" />
            <span className="font-bold">{error}</span>
          </div>
        </div>
      )}

      {/* HEADER SECTION - COMPACT ON MOBILE */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
        <div className="text-center sm:text-left">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Nhập kho hàng hóa</h1>
          <p className="text-slate-500 text-xs md:text-sm font-medium">Lấy giá vốn từ thiết lập để tăng tồn kho.</p>
        </div>
        <div className="flex items-center space-x-2 text-[9px] md:text-[10px] font-black bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full border border-indigo-100 uppercase tracking-widest shadow-sm">
          <RotateCcw size={14} />
          <span className="whitespace-nowrap uppercase">GIÁ VỐN: {priceTypes.find(t => t.id === storeConfig.costPriceTypeId)?.name || 'N/A'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:flex-1 lg:min-h-0">
        <div className="lg:col-span-8 flex flex-col gap-5 lg:min-h-0">
          
          {/* SEARCH BOX */}
          <div className="relative w-full shrink-0" ref={productRef}>
             <div className="bg-white p-3 md:p-4 rounded-[28px] border border-slate-200 shadow-sm flex items-center space-x-4 h-[78px] md:h-[84px] focus-within:ring-4 focus-within:ring-indigo-50 transition-all">
                <div className="p-2 md:p-3 bg-indigo-50/50 text-indigo-600 rounded-2xl">
                  <Search size={22} />
                </div>
                <div className="flex-1 flex flex-col min-w-0">
                   <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 ml-0.5 whitespace-nowrap">HÀNG HÓA</span>
                   <input 
                    className="bg-transparent border-none outline-none font-bold text-sm text-slate-800 placeholder:text-slate-300 p-0 truncate"
                    placeholder="Tìm tên hoặc quét..."
                    value={productSearch}
                    onFocus={() => setIsProductFocused(true)}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
                <button 
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="p-2 text-indigo-400 hover:text-indigo-600 active:scale-90 transition-all shrink-0"
                >
                   <Barcode size={32} strokeWidth={2} />
                </button>
             </div>

             {isProductFocused && (
               <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[32px] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15)] border border-slate-100 z-[110] overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="max-h-96 overflow-y-auto p-3 scrollbar-hide">
                    {filteredProducts.map(p => (
                      <button key={p.id} onClick={() => addToCart(p)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-[24px] transition-all group">
                         <div className="flex items-center space-x-4 text-left min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                               {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Package size={20} className="text-slate-300" />}
                            </div>
                            <div className="min-w-0 flex-1">
                               <div className="text-sm font-black text-slate-800 group-hover:text-indigo-600 truncate">{p.name}</div>
                               <div className="text-[10px] text-slate-400 font-mono mt-1">Barcode: {p.barcode || '---'}</div>
                            </div>
                         </div>
                         <div className="text-right ml-4 shrink-0">
                            <div className="font-black text-indigo-600 text-sm">{(costPrices[p.id] || 0).toLocaleString()}đ</div>
                            <div className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full mt-1 inline-block ${getStockColor(p.stock)}`}>Tồn: {p.stock}</div>
                         </div>
                      </button>
                    ))}
                  </div>
               </div>
             )}
          </div>

          {/* INVENTORY LIST - RESPONSIVE HEIGHT LIKE POS CART */}
          <div className={`bg-white rounded-[32px] border border-slate-100 shadow-sm lg:flex-1 flex flex-col overflow-hidden lg:min-h-0 ${cart.length === 0 ? 'min-h-[520px]' : 'h-auto'}`}>
             {/* LIST HEADER */}
             <div className="px-4 md:px-8 py-4 md:py-5 border-b border-slate-50 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-3 min-w-0">
                   <PackagePlus size={18} className="text-indigo-600 shrink-0" />
                   <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-slate-800 whitespace-nowrap">DANH SÁCH NHẬP KHO</h3>
                </div>
                <button 
                  onClick={() => setCart([])}
                  className="px-3 md:px-5 py-2 bg-rose-50 text-rose-500 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all active:scale-95 shrink-0 ml-2 whitespace-nowrap"
                >
                   XÓA TẤT CẢ
                </button>
             </div>

             {/* COLUMN HEADERS - OPTIMIZED FOR MAX PRODUCT COLUMN WIDTH ON MOBILE */}
             <div className="grid grid-cols-[1fr_50px_75px_25px] md:grid-cols-[1fr_80px_100px_110px_40px] gap-1 md:gap-2 px-4 md:px-8 py-4 bg-slate-50/50 border-b border-slate-50 shrink-0">
                <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">SẢN PHẨM</span>
                <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">SL</span>
                <span className="hidden md:block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">ĐƠN GIÁ</span>
                <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">T.TIỀN</span>
                <span></span>
             </div>

             {/* LIST CONTENT */}
             <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col">
                {cart.length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {cart.map(item => {
                      const pInfo = products.find(p => p.id === item.productId);
                      return (
                        <div key={item.id} className="grid grid-cols-[1fr_50px_75px_25px] md:grid-cols-[1fr_80px_100px_110px_40px] items-center gap-1 md:gap-2 px-4 md:px-8 py-4 md:py-5 hover:bg-slate-50/30 transition-all group">
                           <div className="min-w-0 flex items-center space-x-2 md:space-x-4">
                              <div className="w-8 h-8 md:w-12 md:h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                                 {pInfo?.image ? <img src={pInfo.image} className="w-full h-full object-cover" /> : <Package size={16} className="text-slate-300" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                 <div className="text-[12px] md:text-sm font-bold text-slate-800 leading-tight line-clamp-2 break-words">
                                   {item.name}
                                 </div>
                                 <div className="flex items-center flex-wrap gap-x-1 mt-0.5">
                                   <span className="md:hidden text-[9px] text-indigo-600 font-bold whitespace-nowrap">{item.cost.toLocaleString()}đ</span>
                                   <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${getStockColor(pInfo?.stock || 0)}`}>Tồn: {pInfo?.stock || 0}</span>
                                 </div>
                              </div>
                           </div>
                           <div className="flex items-center bg-white rounded-lg border border-slate-200 p-0.5 shadow-sm w-fit mx-auto scale-90 md:scale-100">
                              <button onClick={() => handleQtyChange(item.productId, item.qty - 1)} className="p-0.5 md:p-1 text-slate-400 hover:text-indigo-600 transition-colors"><Minus size={14} /></button>
                              <input type="text" inputMode="numeric" className="w-5 md:w-10 text-center font-black text-xs md:text-sm border-none focus:ring-0 outline-none p-0 bg-transparent" value={item.qty || ''} onChange={(e) => handleQtyChange(item.productId, parseInt(e.target.value) || 0)} />
                              <button onClick={() => handleQtyChange(item.productId, item.qty + 1)} className="p-0.5 md:p-1 text-slate-400 hover:text-indigo-600 transition-colors"><Plus size={14} /></button>
                           </div>
                           <div className="hidden md:block text-right font-bold text-slate-500 text-sm whitespace-nowrap">
                              {item.cost.toLocaleString()}đ
                           </div>
                           <div className="text-right font-black text-indigo-600 text-[10px] md:text-sm whitespace-nowrap truncate">
                              {item.total.toLocaleString()}đ
                           </div>
                           <button onClick={() => removeFromCart(item.productId)} className="flex justify-end text-slate-200 hover:text-rose-500 transition-colors p-0.5"><Trash2 size={16} /></button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                   /* EMPTY STATE - HEIGHT MATCH POS CART */
                   <div className="flex-1 flex flex-col items-center justify-center text-slate-300 py-32 animate-in fade-in duration-700">
                      <div className="relative mb-8">
                         <div className="absolute inset-0 bg-slate-100 rounded-full blur-3xl opacity-50 -z-10 scale-150"></div>
                         <PackagePlus size={100} md:size={120} strokeWidth={1.2} className="opacity-20" />
                      </div>
                      <p className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em] md:tracking-[0.8em] text-slate-400 ml-[0.4em] md:ml-[0.8em] whitespace-nowrap">CHƯA CÓ SẢN PHẨM NÀO</p>
                   </div>
                )}
             </div>
          </div>
        </div>

        {/* SIDE PANEL */}
        <div className="lg:col-span-4 flex flex-col gap-5 shrink-0">
           <div className="bg-white p-6 md:p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6 md:space-y-8 flex flex-col">
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Thông tin nhà cung cấp</label>
                    <input 
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-[20px] outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-sm text-slate-800 transition-all shadow-inner"
                      placeholder="Tên NCC hoặc nguồn nhập..."
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                    />
                 </div>
              </div>

              <div className="pt-6 border-t border-slate-100 space-y-6">
                 <div className="flex justify-between items-end px-1">
                    <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-none mb-1">TỔNG TIỀN NHẬP</span>
                    <span className="text-2xl md:text-3xl font-black text-indigo-600 tracking-tighter">{totalAmount.toLocaleString()}đ</span>
                 </div>
                 
                 <button 
                  onClick={handleSavePurchase}
                  disabled={cart.length === 0}
                  className="w-full py-5 md:py-6 bg-slate-900 text-white rounded-[24px] font-black text-[12px] md:text-[13px] shadow-2xl shadow-slate-200 hover:bg-emerald-600 transition-all active:scale-95 disabled:grayscale disabled:opacity-30 uppercase tracking-[0.2em] md:tracking-[0.3em] flex items-center justify-center space-x-3"
                 >
                    <ArrowDownCircle size={22} md:size={24} />
                    <span>XÁC NHẬN NHẬP KHO</span>
                 </button>
              </div>
           </div>
           
           <div className="bg-white rounded-[32px] p-5 md:p-6 border border-slate-100 hidden sm:block">
              <h4 className="text-[10px] font-black uppercase tracking-widest mb-4 text-slate-400">Lưu ý nhập kho</h4>
              <ul className="space-y-3">
                 <li className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                    <span className="text-[10px] font-bold text-slate-600 leading-relaxed italic">Tồn kho sẽ tăng ngay sau khi bạn nhấn 'Xác nhận'.</span>
                 </li>
                 <li className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0"></div>
                    <span className="text-[10px] font-bold text-slate-600 leading-relaxed italic">Hệ thống ghi nhận theo loại giá đã cấu hình làm giá vốn.</span>
                 </li>
              </ul>
           </div>
        </div>
      </div>

      <BarcodeScannerModal isOpen={showScanner} onClose={() => setShowScanner(false)} onScan={handleBarcodeScan} />
    </div>
  );
};

export default PurchaseManager;
