
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../store';
import { db, generateId } from '../db';
import { 
  Search, Plus, Minus, Trash2, User, ShoppingCart,
  Printer, X, QrCode, DollarSign, ChevronDown, 
  Barcode, CheckCircle, OctagonAlert, Wallet,
  Package, Tag, UserX, FileDown, FileImage, 
  PackageSearch, 
  RefreshCw,
  Loader2
} from 'lucide-react';
import { Product, Customer, OrderItem } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

type PrintSize = '58mm' | '80mm' | 'A4';

const POS = () => {
  const { products, customers, priceTypes, updateStock, setError, error, storeConfig } = useStore();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [discountValue, setDiscountValue] = useState<string>('0');
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage');
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerFocused, setIsCustomerFocused] = useState(false);
  const [isProductSearchFocused, setIsProductSearchFocused] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr'>('cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  const [printSize, setPrintSize] = useState<PrintSize>(storeConfig.printerPaperSize || '80mm');
  const [tempOrderId, setTempOrderId] = useState('');

  const customerRef = useRef<HTMLDivElement>(null);
  const productSearchRef = useRef<HTMLDivElement>(null);
  const invoiceAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) setIsCustomerFocused(false);
      if (productSearchRef.current && !productSearchRef.current.contains(e.target as Node)) setIsProductSearchFocused(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const updatePrices = async () => {
      const targetType = selectedCustomer?.typeId || priceTypes.find(p => p.id.includes('retail'))?.id || priceTypes[0]?.id;
      if (!targetType) return;
      
      const prices = await db.productPrices.where('priceTypeId').equals(targetType).toArray();
      const priceMap: Record<string, number> = {};
      prices.forEach(p => priceMap[p.productId] = p.price);
      setCurrentPrices(priceMap);

      if (cart.length > 0) {
        setCart(prev => prev.map(item => ({
          ...item,
          price: priceMap[item.productId] || 0,
          total: item.qty * (priceMap[item.productId] || 0)
        })));
      }
    };
    updatePrices();
  }, [selectedCustomer, priceTypes]);

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      handleQtyChange(product.id, existing.qty + 1);
    } else {
      if (product.stock <= 0) {
        setError("Sản phẩm đã hết hàng.");
        setTimeout(() => setError(null), 3000);
        return;
      }
      const price = currentPrices[product.id] || 0;
      setCart([...cart, {
        id: generateId(),
        productId: product.id,
        qty: 1,
        price,
        total: price,
        name: product.name
      }]);
    }
    setProductSearch('');
    setIsProductSearchFocused(false);
  };

  const handleQtyChange = (productId: string, val: number) => {
    const p = products.find(x => x.id === productId);
    if (!p) return;
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        let newQty = Math.max(0, val);
        if (newQty > p.stock) {
          setError(`Vượt tồn kho (${p.stock})`);
          setTimeout(() => setError(null), 2000);
          newQty = p.stock;
        }
        return { ...item, qty: newQty, total: newQty * item.price };
      }
      return item;
    }));
  };

  const filteredProducts = useMemo(() => {
    const term = productSearch.toLowerCase();
    if (!term && isProductSearchFocused) return products.slice(0, 10);
    return products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.code.toLowerCase().includes(term) ||
      p.barcode?.includes(term)
    ).slice(0, 15);
  }, [productSearch, products, isProductSearchFocused]);

  const subTotal = cart.reduce((sum, item) => sum + item.total, 0);
  const parseNumber = (str: string) => Number(String(str).replace(/\D/g, ''));
  
  const handleDiscountInput = (val: string) => {
    let num = val.replace(/\D/g, '');
    if (discountType === 'percentage') {
      if (Number(num) > 100) num = '100';
    }
    setDiscountValue(num || '0');
  };

  const switchDiscountType = (type: 'percentage' | 'amount') => {
    setDiscountType(type);
    setDiscountValue('0');
  };

  const discNumeric = parseNumber(discountValue);
  const discountAmt = discountType === 'percentage' ? (subTotal * Math.min(100, discNumeric)) / 100 : discNumeric;
  const total = Math.max(0, subTotal - discountAmt);

  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    setTempOrderId(generateId());
    setShowPaymentModal(true);
  };

  const handleCheckout = async () => {
    const finalOrderId = tempOrderId || generateId();
    const finalCashReceived = paymentMethod === 'qr' ? total : (parseNumber(cashReceived) || total);
    
    const order = {
      id: finalOrderId,
      customerId: selectedCustomer?.id || 'walk-in',
      customerName: selectedCustomer?.name || 'Khách lẻ',
      total,
      subTotal,
      discountAmt,
      discount: discNumeric,
      discountType,
      items: cart,
      paymentMethod,
      cashReceived: finalCashReceived,
      changeAmount: Math.max(0, finalCashReceived - total),
      updatedAt: Date.now(),
      synced: 0,
      deleted: 0,
      status: 'completed' as const
    };
    await db.orders.add(order);
    for (const item of cart) await updateStock(item.productId, -item.qty);
    setLastOrder(order);
    setShowPaymentModal(false);
    setShowInvoicePreview(true);
  };

  const resetPOS = () => {
    setCart([]);
    setDiscountValue('0');
    setSelectedCustomer(null);
    setCashReceived('');
    setShowInvoicePreview(false);
    setLastOrder(null);
    setTempOrderId('');
  };

  const handlePrint = () => window.print();

  const handleExportPDF = async () => {
    if (!invoiceAreaRef.current) return;
    const canvas = await html2canvas(invoiceAreaRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: printSize === 'A4' ? 'a4' : [Number(printSize.replace('mm','')), 297]
    });
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`HoaDon-${lastOrder.id}.pdf`);
  };

  const handleExportJPG = async () => {
    if (!invoiceAreaRef.current) return;
    const canvas = await html2canvas(invoiceAreaRef.current, { scale: 3 });
    const link = document.createElement('a');
    link.download = `HoaDon-${lastOrder.id}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.9);
    link.click();
  };

  const getStockColor = (stock: number) => {
    if (stock <= 0) return 'text-red-500 bg-red-50';
    if (stock <= (storeConfig.lowStockThreshold || 10)) return 'text-amber-500 bg-amber-50';
    return 'text-emerald-500 bg-emerald-50';
  };

  const getQrUrl = () => {
    const bankId = storeConfig.bankId || 'MB';
    const bankAccount = storeConfig.bankAccount || '000000';
    const accountName = encodeURIComponent(storeConfig.bankAccountName || 'ELITE POS');
    const description = encodeURIComponent(`THANH TOAN DON HANG ${tempOrderId}`);
    return `https://img.vietqr.io/image/${bankId}-${bankAccount}-compact2.png?amount=${total}&addInfo=${description}&accountName=${accountName}`;
  };

  return (
    <div className="h-full flex flex-col gap-4 animate-in fade-in no-print">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-invoice, #printable-invoice * { visibility: visible; }
          #printable-invoice { position: absolute; left: 0; top: 0; width: 100% !important; background: white !important; margin: 0; padding: 10mm; }
        }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-red-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center space-x-3">
          <OctagonAlert size={18} />
          <span className="font-bold text-sm">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-8 flex flex-col gap-4 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
            <div className="relative" ref={customerRef}>
              <div 
                className={`bg-white p-3 rounded-2xl border ${selectedCustomer ? 'border-indigo-600 ring-2 ring-indigo-50' : 'border-slate-200'} flex items-center space-x-3 cursor-pointer h-[64px] transition-all`}
                onClick={() => setIsCustomerFocused(!isCustomerFocused)}
              >
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100">
                  <User size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Khách hàng</p>
                  <p className="text-sm font-bold truncate leading-none text-slate-800">{selectedCustomer?.name || 'Khách lẻ'}</p>
                </div>
                <ChevronDown size={16} className={`text-slate-300 transition-transform ${isCustomerFocused ? 'rotate-180' : ''}`} />
              </div>
              {isCustomerFocused && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[70] overflow-hidden">
                  <div className="p-3 bg-slate-50 border-b border-slate-100">
                    <input 
                      autoFocus
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Tìm tên hoặc số điện thoại..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto scrollbar-hide">
                    <button onClick={() => { setSelectedCustomer(null); setIsCustomerFocused(false); }} className="w-full p-4 hover:bg-slate-50 text-left border-b border-slate-50 flex items-center space-x-3">
                       <UserX size={18} className="text-slate-400" />
                       <span className="text-sm font-bold text-slate-600">Khách lẻ</span>
                    </button>
                    {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)).map(c => (
                      <button key={c.id} onClick={() => { setSelectedCustomer(c); setIsCustomerFocused(false); }} className="w-full p-4 hover:bg-indigo-50 text-left border-b border-slate-50 flex justify-between items-center group">
                        <div>
                          <div className="text-sm font-bold group-hover:text-indigo-600">{c.name}</div>
                          <div className="text-xs text-slate-400 font-medium">{c.phone}</div>
                        </div>
                        <span className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg">
                          {priceTypes.find(t => t.id === c.typeId)?.name || 'Giá lẻ'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={productSearchRef}>
              <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center space-x-3 focus-within:ring-2 focus-within:ring-indigo-50 focus-within:border-indigo-600 h-[64px] transition-all">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shadow-sm border border-indigo-100">
                  <Search size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Hàng hóa</p>
                  <input 
                    className="w-full bg-transparent border-none outline-none text-sm font-bold p-0 placeholder:text-slate-300 focus:ring-0"
                    placeholder="Quét mã vạch / Tìm tên SP..."
                    value={productSearch}
                    onFocus={() => setIsProductSearchFocused(true)}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
                <Barcode size={18} className="text-slate-300" />
              </div>
              {isProductSearchFocused && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[60] overflow-hidden">
                   <div className="max-h-80 overflow-y-auto scrollbar-hide">
                    {filteredProducts.map(p => (
                      <button 
                        key={p.id} 
                        onClick={() => addToCart(p)}
                        className="w-full p-4 hover:bg-slate-50 text-left border-b border-slate-50 flex items-center justify-between transition-colors"
                      >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border border-slate-100">
                                {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Package size={20} className="text-slate-300" />}
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-bold text-slate-800">{p.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">Mã: {p.code}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-indigo-600">{(currentPrices[p.id] || 0).toLocaleString()}đ</div>
                            <div className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full mt-1 w-fit ml-auto ${getStockColor(p.stock)}`}>
                                Tồn: {p.stock}
                            </div>
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
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between shrink-0">
               <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center">
                 <ShoppingCart size={14} className="mr-2 text-indigo-600" /> CHI TIẾT GIỎ HÀNG
               </h3>
               <button onClick={() => setCart([])} className="text-[9px] font-black text-red-500 hover:text-red-600 uppercase tracking-widest bg-red-50 px-3 py-1.5 rounded-xl transition-all">Xóa tất cả</button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <table className="w-full border-collapse table-auto">
                <thead className="sticky top-0 bg-white z-10 shadow-sm">
                   <tr className="border-b border-slate-100">
                      <th className="px-3 md:px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-auto">Sản phẩm</th>
                      <th className="px-2 md:px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-20 md:w-32">SL</th>
                      <th className="hidden md:table-cell px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Đơn giá</th>
                      <th className="px-2 md:px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[85px] md:w-40">T.Tiền</th>
                      <th className="px-2 md:px-4 py-4 w-10"></th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {cart.map(item => {
                    const pInfo = products.find(px => px.id === item.productId);
                    return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                       <td className="px-3 md:px-6 py-4">
                          <p className="text-xs md:text-sm font-bold text-slate-800 leading-tight">{item.name}</p>
                          <div className="flex items-center flex-wrap gap-x-2 mt-1">
                            <span className="text-[9px] text-slate-500 font-bold md:hidden">{item.price.toLocaleString()}đ</span>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${getStockColor(pInfo?.stock || 0)}`}>Tồn: {pInfo?.stock || 0}</span>
                          </div>
                       </td>
                       <td className="px-2 md:px-6 py-4">
                          <div className="flex items-center bg-white rounded-lg border border-slate-100 p-0.5 shadow-sm w-fit mx-auto">
                             <button onClick={() => handleQtyChange(item.productId, item.qty - 1)} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"><Minus size={12} /></button>
                             <input 
                              type="number" 
                              className="w-6 md:w-10 text-center font-black text-xs md:text-sm border-none focus:ring-0 outline-none p-0 bg-transparent" 
                              value={item.qty || ''} 
                              onChange={(e) => handleQtyChange(item.productId, parseInt(e.target.value) || 0)}
                             />
                             <button onClick={() => handleQtyChange(item.productId, item.qty + 1)} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"><Plus size={12} /></button>
                          </div>
                       </td>
                       <td className="hidden md:table-cell px-6 py-4 text-right text-sm font-bold text-slate-600 whitespace-nowrap">{item.price.toLocaleString()}đ</td>
                       <td className="px-2 md:px-6 py-4 text-right text-[11px] md:text-sm font-black text-indigo-600 whitespace-nowrap">
                         {item.total.toLocaleString()}đ
                       </td>
                       <td className="px-1 md:px-4 py-4 text-right">
                          <button onClick={() => setCart(cart.filter(i => i.id !== item.id))} className="text-slate-200 hover:text-red-500 transition-colors p-1"><Trash2 size={14} /></button>
                       </td>
                    </tr>
                  )})}
                  {cart.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-24 text-center opacity-10">
                         <ShoppingCart size={80} className="mx-auto mb-4" strokeWidth={1} />
                         <p className="text-xs font-black uppercase tracking-[0.5em]">Giỏ hàng trống</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
           <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                 <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">TỔNG KẾT ĐƠN HÀNG</h3>
              </div>
              <div className="p-6 space-y-4 flex-1">
                 <div className="flex justify-between items-center text-sm px-1">
                    <span className="font-bold text-slate-500">Tạm tính ({cart.length} món)</span>
                    <span className="font-black text-slate-800">{subTotal.toLocaleString()}đ</span>
                 </div>
                 <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm px-1">
                       <span className="font-bold text-slate-500">Chiết khấu</span>
                       <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                          <button onClick={() => switchDiscountType('percentage')} className={`px-3 py-1 text-[9px] font-black rounded-lg transition-all ${discountType === 'percentage' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>%</button>
                          <button onClick={() => switchDiscountType('amount')} className={`px-3 py-1 text-[9px] font-black rounded-lg transition-all ${discountType === 'amount' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>VNĐ</button>
                       </div>
                    </div>
                    <div className="relative">
                      <input 
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-right font-black text-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                        value={discountValue === '0' ? '' : (discountType === 'amount' ? parseNumber(discountValue).toLocaleString() : discountValue)}
                        onChange={(e) => handleDiscountInput(e.target.value)}
                        placeholder="0"
                      />
                      {parseNumber(discountValue) > 0 && (
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-rose-50 text-rose-600 px-3 py-1 rounded-xl text-[9px] font-black border border-rose-100">
                           -{discountAmt.toLocaleString()}đ
                        </div>
                      )}
                    </div>
                 </div>
                 <div className="h-px bg-slate-100 my-4"></div>
                 <div className="flex justify-between items-end px-1 pt-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-none mb-1 text-slate-500">Tổng tiền</span>
                    <span className="text-3xl font-black text-rose-600 tracking-tighter leading-none">{total.toLocaleString()}đ</span>
                 </div>
              </div>

              <div className="p-6 bg-slate-900 space-y-4">
                 <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setPaymentMethod('cash')} className={`py-4 rounded-2xl font-black text-[10px] uppercase border transition-all flex items-center justify-center space-x-2 ${paymentMethod === 'cash' ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-950/20' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}>
                      <DollarSign size={16} /> <span>Tiền mặt</span>
                    </button>
                    <button onClick={() => setPaymentMethod('qr')} className={`py-4 rounded-2xl font-black text-[10px] uppercase border transition-all flex items-center justify-center space-x-2 ${paymentMethod === 'qr' ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-950/20' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}>
                      <QrCode size={16} /> <span>Quét QR</span>
                    </button>
                 </div>
                 <button 
                  onClick={handleOpenPayment}
                  disabled={cart.length === 0}
                  className="w-full py-6 bg-emerald-600 text-white rounded-[28px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-emerald-950 hover:bg-emerald-500 active:scale-95 transition-all flex items-center justify-center space-x-3 disabled:grayscale disabled:opacity-30"
                 >
                    <Wallet size={20} />
                    <span>THANH TOÁN NGAY</span>
                 </button>
              </div>
           </div>
        </div>
      </div>

      {showPaymentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 no-print">
          <div className="bg-white w-full max-w-[420px] rounded-[32px] shadow-3xl flex flex-col animate-in zoom-in-95 overflow-hidden border border-slate-100">
            <div className="px-5 py-2.5 border-b border-slate-50 flex items-center justify-between shrink-0">
               <div className="flex items-center space-x-2">
                 <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-inner border ${paymentMethod === 'qr' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                    {paymentMethod === 'qr' ? <QrCode size={14} /> : <DollarSign size={14} />}
                 </div>
                 <div>
                    <h2 className="text-[9px] font-black text-slate-800 uppercase tracking-widest leading-none mb-0.5">{paymentMethod === 'qr' ? 'Thanh toán QR' : 'Xác nhận thu'}</h2>
                    <p className="text-[7px] text-slate-400 font-bold uppercase tracking-widest leading-none">Giao dịch đơn hàng</p>
                 </div>
               </div>
               <button onClick={() => setShowPaymentModal(false)} className="p-1 text-slate-300 hover:bg-slate-50 hover:text-slate-900 rounded-full transition-all">
                 <X size={18} />
               </button>
            </div>
            
            <div className="px-5 py-3 space-y-3 shrink-0 flex flex-col items-center">
               <div className="bg-slate-950 rounded-[20px] p-3 text-center shadow-lg border border-white/5 w-full">
                  <p className="text-[8px] text-slate-500 font-black uppercase mb-0.5 tracking-[0.1em]">Cần thanh toán</p>
                  <h1 className="text-xl font-black text-white tracking-tighter">
                    {total.toLocaleString()}<span className="text-[10px] font-bold text-slate-500 ml-0.5">đ</span>
                  </h1>
               </div>
               
               {paymentMethod === 'cash' ? (
                 <div className="space-y-2 w-full">
                    <div className="bg-white p-3 rounded-[16px] border border-slate-100 focus-within:border-indigo-600 transition-all shadow-inner">
                       <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Tiền khách đưa</label>
                       <input 
                         className="w-full bg-transparent border-none p-0 text-xl font-black text-slate-900 focus:ring-0 outline-none placeholder:text-slate-200" 
                         autoFocus
                         placeholder="0"
                         value={cashReceived ? parseNumber(cashReceived).toLocaleString() : ''} 
                         onChange={(e) => setCashReceived(e.target.value.replace(/\D/g, ''))} 
                    />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-[16px] border border-emerald-100">
                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-800 italic">Tiền trả lại</span>
                        <span className="text-lg font-black text-emerald-600">
                           {Math.max(0, (parseNumber(cashReceived) || 0) - total).toLocaleString()}đ
                        </span>
                    </div>
                 </div>
               ) : (
                  <div className="space-y-2 w-full flex flex-col items-center">
                     <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-inner relative flex items-center justify-center overflow-hidden w-full">
                        <img 
                          src={getQrUrl()} 
                          alt="VietQR" 
                          className="w-auto max-w-full h-auto max-h-[340px] md:max-h-[380px] object-contain animate-in fade-in zoom-in-95 duration-500" 
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-white/40 backdrop-blur-[1px] pointer-events-none">
                           <Loader2 className="text-indigo-600 animate-spin" size={24} />
                        </div>
                     </div>
                     <div className="text-center space-y-0.5">
                        <p className="text-[9px] font-black text-slate-800 uppercase tracking-widest">{storeConfig.bankId} - {storeConfig.bankAccount}</p>
                        <p className="text-[8px] text-slate-500 font-bold uppercase">{storeConfig.bankAccountName}</p>
                        <div className="flex items-center justify-center space-x-1.5 text-[8px] font-black text-emerald-600 bg-emerald-50 py-1 px-4 rounded-lg border border-emerald-100 mt-1">
                           <CheckCircle size={10} />
                           <span className="uppercase tracking-widest">Đang chờ quét mã...</span>
                        </div>
                     </div>
                  </div>
               )}
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0">
               <button onClick={handleCheckout} className="w-full py-3.5 bg-indigo-600 text-white rounded-[16px] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.96] flex items-center justify-center space-x-2">
                  <CheckCircle size={16} />
                  <span>XÁC NHẬN ĐÃ THU TIỀN</span>
               </button>
            </div>
          </div>
        </div>
      )}

      {showInvoicePreview && lastOrder && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-6 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300 no-print">
          <div className="bg-slate-800 w-full max-w-5xl h-full md:h-[90vh] rounded-none md:rounded-[48px] shadow-3xl overflow-hidden flex flex-col md:flex-row border border-slate-700">
             <div className="w-full md:w-80 bg-white md:bg-transparent p-6 md:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-700 no-print">
                <div className="space-y-10">
                   <div className="flex items-center space-x-4 text-white">
                      <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20"><CheckCircle size={28} /></div>
                      <div>
                         <h2 className="text-sm font-black uppercase tracking-widest leading-none mb-1">THÀNH CÔNG</h2>
                         <p className="text-[10px] text-slate-400 italic">Đã lưu giao dịch</p>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Khổ giấy in</p>
                      <div className="grid grid-cols-3 gap-2">
                         {(['58mm', '80mm', 'A4'] as PrintSize[]).map(size => (
                           <button key={size} onClick={() => setPrintSize(size)} className={`py-4 rounded-2xl text-[10px] font-black transition-all ${printSize === size ? 'bg-indigo-600 text-white shadow-xl' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                              {size}
                           </button>
                         ))}
                      </div>
                   </div>
                   <div className="space-y-3">
                      <button onClick={handlePrint} className="w-full py-5 bg-white text-slate-900 rounded-[28px] font-black text-[12px] uppercase tracking-widest flex items-center justify-center space-x-3 shadow-xl hover:bg-slate-50 transition-all">
                        <Printer size={20} /> <span>In hóa đơn</span>
                      </button>
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={handleExportPDF} className="py-4 bg-slate-700 text-white rounded-[22px] font-black text-[10px] uppercase flex items-center justify-center space-x-2 hover:bg-slate-600 transition-all">
                          <FileDown size={16} /> <span>PDF</span>
                        </button>
                        <button onClick={handleExportJPG} className="py-4 bg-slate-700 text-white rounded-[22px] font-black text-[10px] uppercase flex items-center justify-center space-x-2 hover:bg-slate-600 transition-all">
                          <FileImage size={16} /> <span>JPG</span>
                        </button>
                      </div>
                </div>
             </div>
             <button onClick={resetPOS} className="w-full mt-10 py-5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-[28px] font-black text-[12px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
                   ĐÓNG & TIẾP TỤC
                </button>
             </div>
             <div className="flex-1 bg-slate-900 md:p-10 overflow-y-auto scrollbar-hide flex items-start justify-center p-6">
                <div id="printable-invoice" ref={invoiceAreaRef} className={`bg-white shadow-2xl transition-all origin-top text-slate-900 p-10 font-sans ${printSize === '58mm' ? 'w-[58mm] text-[10px]' : printSize === '80mm' ? 'w-[80mm] text-[12px]' : 'w-[210mm] min-h-[297mm] text-[14px]'}`} style={{ fontFamily: "'Inter', sans-serif" }}>
                   <div className="text-center space-y-1 border-b-2 border-slate-900 pb-5 mb-5">
                      <h1 className="text-xl font-black uppercase tracking-tighter leading-none mb-1">{storeConfig.name}</h1>
                      <p className="font-bold opacity-80 italic text-[0.8em] leading-tight">{storeConfig.address}</p>
                      <p className="font-bold opacity-80 italic text-[0.8em] leading-tight">Hotline: {storeConfig.phone}</p>
                   </div>
                   <div className="text-center mb-6">
                      <h2 className="text-lg font-black uppercase tracking-widest">HÓA ĐƠN BÁN HÀNG</h2>
                      <p className="text-[0.8em] font-mono mt-2 opacity-50 uppercase tracking-widest">MÃ: {lastOrder.id}</p>
                   </div>
                   <div className="space-y-1.5 mb-8 text-[0.9em]">
                      <div className="flex justify-between border-b border-slate-100 pb-1"><span>Khách hàng:</span> <span className="font-black uppercase">{lastOrder.customerName}</span></div>
                      <div className="flex justify-between border-b border-slate-100 pb-1"><span>Thời gian:</span> <span>{new Date(lastOrder.updatedAt).toLocaleString('vi-VN')}</span></div>
                   </div>
                   <table className="w-full mb-8 text-[0.9em]">
                      <thead className="border-b-2 border-slate-900">
                         <tr>
                            <th className="text-left py-2 uppercase font-black">Sản phẩm</th>
                            <th className="text-center py-2 uppercase font-black">Số lượng</th>
                            <th className="text-right py-2 uppercase font-black">T.Tiền</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {lastOrder.items.map((item: any) => (
                           <tr key={item.id}>
                              <td className="py-2.5 font-bold leading-tight align-top">{item.name}</td>
                              <td className="py-2.5 text-center align-top font-bold">{item.qty}</td>
                              <td className="py-2.5 text-right font-black tracking-tighter align-top">{item.total.toLocaleString()}đ</td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                   <div className="space-y-1.5 pt-5 border-t-2 border-slate-900">
                      <div className="flex justify-between text-[0.9em]">
                         <span>Tạm tính:</span>
                         <span className="font-bold">{lastOrder.subTotal.toLocaleString()}đ</span>
                      </div>
                      {lastOrder.discountAmt > 0 && (
                        <div className="flex justify-between text-[0.9em] text-rose-600 italic">
                           <span>Chiết khấu {lastOrder.discountType === 'percentage' ? `(${lastOrder.discount}%)` : ''}:</span>
                           <span className="font-bold">-{lastOrder.discountAmt.toLocaleString()}đ</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-black uppercase tracking-widest pt-4 border-t border-slate-100 mt-2">
                         <span>Tổng thanh toán:</span>
                         <span className="text-rose-600 tracking-tighter text-lg">{lastOrder.total.toLocaleString()}đ</span>
                      </div>
                   </div>
                   <div className="mt-16 text-center border-t border-dashed border-slate-300 pt-8 space-y-2">
                      <p className="font-black italic uppercase text-[0.9em] tracking-widest leading-none">CẢMƠN QUÝ KHÁCH HÀNG!</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
