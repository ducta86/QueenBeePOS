
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { db, generateId } from '../db';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Package, 
  X, 
  Image as ImageIcon, 
  Barcode, 
  Hash,
  DollarSign,
  Layers,
  Box,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Info,
  ChevronRight,
  Lock,
  CloudOff,
  Settings as SettingsIcon,
  GitBranch,
  Camera,
  OctagonAlert
} from 'lucide-react';
import { Product, ProductPrice } from '../types';
import * as XLSX from 'xlsx';
import { Html5Qrcode } from "html5-qrcode";

const ConfirmDialog = ({ title, message, onConfirm, onCancel, type = 'danger', showConfirm = true }: any) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
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
          <button onClick={onConfirm} className={`flex-1 py-4 font-bold text-white rounded-2xl shadow-lg transition-all text-[11px] uppercase tracking-widest ${type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-100'}`}>
            Xác nhận
          </button>
        )}
      </div>
    </div>
  </div>
);

const BarcodeScannerModal = ({ isOpen, onClose, onScan, scannerId = "product-reader" }: { isOpen: boolean, onClose: () => void, onScan: (code: string) => void, scannerId?: string }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setScannerError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let isMounted = true;

    if (isOpen) {
      setIsInitializing(true);
      setScannerError(null);
      
      const startScanner = async () => {
        try {
          const html5QrCode = new Html5Qrcode(scannerId);
          scannerRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 150 },
            },
            (decodedText) => {
              if (!isMounted) return;
              onScan(decodedText);
              if (navigator.vibrate) navigator.vibrate(100);
              stopAndClose();
            },
            () => {} 
          );
          if (isMounted) setIsInitializing(false);
        } catch (err) {
          console.error("Camera error:", err);
          if (isMounted) {
            setScannerError("Không thể truy cập Camera. Vui lòng kiểm tra quyền trình duyệt.");
            setIsInitializing(false);
          }
        }
      };

      // Đợi một chút để DOM element kịp render
      const timer = setTimeout(startScanner, 100);
      return () => {
        isMounted = false;
        clearTimeout(timer);
        stopAndClose();
      };
    }
  }, [isOpen]);

  const stopAndClose = async () => {
    if (scannerRef.current) {
      try {
        // Chỉ stop khi đang ở trạng thái có thể stop
        const state = scannerRef.current.getState();
        if (state === 2 || state === 3) { // 2: SCANNING, 3: PAUSED
           await scannerRef.current.stop();
        }
      } catch (e) {
        console.warn("Stop failed (might already stopped):", e);
      } finally {
        scannerRef.current = null;
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-[40px] shadow-3xl overflow-hidden relative">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
           <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><Camera size={20} /></div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-800">Quét mã sản phẩm</h2>
           </div>
           <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all"><X size={24} /></button>
        </div>
        
        <div className="p-6">
          <div className="relative aspect-square md:aspect-video bg-slate-900 rounded-[28px] overflow-hidden border-4 border-slate-100 shadow-inner">
             <div id={scannerId} className="w-full h-full"></div>
             {isInitializing && (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900/60">
                  <Loader2 size={40} className="animate-spin mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Đang khởi tạo Camera...</p>
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
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-indigo-400 animate-[p-scan_2s_linear_infinite]"></div>
                  </div>
               </div>
             )}
          </div>
          <div className="mt-8 text-center">
             <p className="text-sm font-medium text-slate-600 italic">Đưa mã vạch vào khung ngắm để tự động nhận diện.</p>
          </div>
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
           <button onClick={onClose} className="px-8 py-3 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-100 transition-all">Đóng</button>
        </div>
      </div>
      <style>{`
        @keyframes p-scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
      `}</style>
    </div>
  );
};

const ProductManager = () => {
  const navigate = useNavigate();
  const { products, priceTypes, productGroups, addProduct, updateProduct, deleteProduct, error, setError, fetchInitialData, storeConfig } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isBlockedDelete, setIsBlockedDelete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [hasOrders, setHasOrders] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showSearchScanner, setShowSearchScanner] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelImportRef = useRef<HTMLInputElement>(null);
  const hasInitializedRef = useRef(false);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    barcode: '',
    image: '',
    groupId: '',
    unit: '',
    lineId: '',
    stock: 0
  });
  const [prices, setPrices] = useState<Record<string, number>>({});

  const missingConfig = productGroups.length === 0 || priceTypes.length === 0;

  useEffect(() => {
    if (!isModalOpen) {
      hasInitializedRef.current = false;
      return;
    }

    if (hasInitializedRef.current) return;

    if (editingProduct) {
      setFormData({
        name: editingProduct.name,
        code: editingProduct.code,
        barcode: editingProduct.barcode,
        image: editingProduct.image || '',
        groupId: editingProduct.groupId,
        unit: editingProduct.unit,
        lineId: editingProduct.lineId || '',
        stock: editingProduct.stock
      });
      
      db.orders.filter(o => o.items.some(i => i.productId === editingProduct.id)).count().then(count => {
        setHasOrders(count > 0);
      });

      db.productPrices.where('productId').equals(editingProduct.id).toArray().then(recs => {
        const pMap: Record<string, number> = {};
        recs.forEach(r => pMap[r.priceTypeId] = r.price);
        setPrices(pMap);
      });
    } else {
      setFormData({ 
        name: '', 
        code: '', 
        barcode: '', 
        image: '', 
        groupId: productGroups[0]?.id || '', 
        unit: '', 
        lineId: '', 
        stock: 0 
      });
      setPrices({});
      setHasOrders(false);
    }
    setLocalError(null);
    hasInitializedRef.current = true;
  }, [editingProduct, isModalOpen, productGroups]);

  const formatCurrencyInput = (value: string | number) => {
    if (value === undefined || value === null) return "";
    const numericValue = String(value).replace(/\D/g, "");
    return numericValue ? Number(numericValue).toLocaleString('vi-VN') : "";
  };

  const parseCurrencyInput = (value: string) => {
    return Number(value.replace(/\D/g, ""));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExportExcel = async () => {
    setIsProcessing(true);
    try {
      const allPrices = await db.productPrices.toArray();
      const priceMapByProduct = new Map<string, Record<string, number>>();
      
      allPrices.forEach(p => {
        if (!priceMapByProduct.has(p.productId)) priceMapByProduct.set(p.productId, {});
        const pMap = priceMapByProduct.get(p.productId)!;
        const pt = priceTypes.find(type => type.id === p.priceTypeId);
        if (pt) pMap[pt.name] = p.price;
      });

      const exportData = products.map(p => ({
        'ID': p.id,
        'Mã sản phẩm': p.code,
        'Tên sản phẩm': p.name,
        'Mã Barcode': p.barcode || '',
        'Nhóm sản phẩm': productGroups.find(g => g.id === p.groupId)?.name || '',
        'Đơn vị tính': p.unit,
        'Tồn kho': p.stock,
        ...priceMapByProduct.get(p.id) || {}
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sản phẩm");
      const safeStoreName = (storeConfig?.name || 'Store').replace(/[^a-z0-9]/gi, '_');
      XLSX.writeFile(workbook, `${safeStoreName}_Inventory_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`);
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

        for (let row of data as any[]) {
          const idInFile = String(row['ID'] || '').trim();
          const code = String(row['Mã sản phẩm'] || row['Mã SKU'] || row['Mã'] || '').trim();
          const name = String(row['Tên sản phẩm'] || row['Tên'] || '').trim();
          
          if (!name || !code) continue;

          const groupName = String(row['Nhóm sản phẩm'] || row['Nhóm'] || '').trim();
          const groupId = productGroups.find(g => g.name.toLowerCase() === groupName.toLowerCase())?.id || productGroups[0]?.id || 'pg-default';
          const unit = String(row['Đơn vị tính'] || row['ĐVT'] || 'Cái').trim();
          const barcode = String(row['Mã Barcode'] || row['Barcode'] || '').trim();
          const stock = Number(row['Tồn kho'] || 0);

          const pricePayload = priceTypes.map(pt => ({
            priceTypeId: pt.id,
            price: Number(row[pt.name] || 0)
          }));

          let existingProduct = idInFile ? await db.products.get(idInFile) : null;
          if (!existingProduct) {
             existingProduct = await db.products.where('code').equals(code).first();
          }

          if (existingProduct) {
            await db.products.update(existingProduct.id, {
              name, code, barcode, groupId, unit, updatedAt: Date.now(), synced: 0
            });
            await db.productPrices.where('productId').equals(existingProduct.id).delete();
            await db.productPrices.bulkAdd(pricePayload.map(pp => ({
              id: generateId(),
              productId: existingProduct!.id,
              ...pp
            })));
            updatedCount++;
          } else {
            const newId = generateId();
            await db.products.add({
              id: newId, name, code, barcode, groupId, unit, stock, 
              lineId: '', createdAt: Date.now(), updatedAt: Date.now(), synced: 0, deleted: 0
            });
            await db.productPrices.bulkAdd(pricePayload.map(pp => ({
              id: generateId(),
              productId: newId,
              ...pp
            })));
            importedCount++;
          }
        }

        await fetchInitialData();
        setSuccessMsg(`Thành công: Thêm mới ${importedCount}, Cập nhật ${updatedCount} sản phẩm.`);
        setTimeout(() => setSuccessMsg(null), 5000);
      } catch (err) {
        setError("Lỗi định dạng file Excel hoặc cấu trúc dữ liệu.");
      } finally {
        setIsProcessing(false);
        if (excelImportRef.current) excelImportRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCheckDelete = async (id: string) => {
    const orderUsage = await db.orders.filter(o => o.items.some(i => i.productId === id)).count();
    setIsBlockedDelete(orderUsage > 0);
    setDeleteConfirmId(id);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchTerm))
  );

  const validate = () => {
    if (!formData.name.trim()) return "Vui lòng nhập tên sản phẩm.";
    if (!formData.code.trim()) return "Vui lòng nhập mã sản phẩm.";
    if (!formData.unit.trim()) return "Vui lòng nhập đơn vị tính.";
    if (!formData.groupId) return "Vui lòng chọn nhóm sản phẩm.";
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errorMsg = validate();
    if (errorMsg) {
      setLocalError(errorMsg);
      return;
    }

    const productId = editingProduct ? editingProduct.id : generateId();
    const productPayload: Product = {
      id: productId,
      ...formData,
      createdAt: editingProduct ? editingProduct.createdAt : Date.now(),
      updatedAt: Date.now(),
      synced: 0,
      deleted: 0
    };

    const pricePayload = priceTypes.map(pt => ({
      priceTypeId: pt.id,
      price: prices[pt.id] || 0
    }));

    try {
      if (editingProduct) await updateProduct(productPayload, pricePayload);
      else await addProduct(productPayload, pricePayload);
      
      setSuccessMsg(editingProduct ? "Đã cập nhật sản phẩm thành công!" : "Đã thêm sản phẩm mới thành công!");
      setTimeout(() => setSuccessMsg(null), 3000);
      
      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (err) {
      setLocalError("Có lỗi xảy ra khi lưu sản phẩm.");
    }
  };

  const getGroupName = (id: string) => productGroups.find(g => g.id === id)?.name || '---';

  const getStockColor = (stock: number) => {
    if (stock > 10) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (stock > 0) return 'bg-amber-50 text-amber-600 border-amber-100';
    return 'bg-rose-50 text-rose-600 border-red-100';
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      {(error || localError) && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[250] w-full max-w-md px-4 animate-in slide-in-from-top-4">
          <div className="bg-red-50 border border-red-200 p-5 rounded-3xl shadow-2xl flex items-center space-x-3 text-red-700">
            <AlertCircle size={24} className="shrink-0" />
            <p className="text-sm font-bold">{localError || error}</p>
            <button onClick={() => { setError(null); setLocalError(null); }} className="ml-auto p-1 hover:bg-red-100 rounded-full">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[250] w-full max-w-md px-4 animate-in slide-in-from-top-4">
          <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-3xl shadow-2xl flex items-center space-x-3 text-emerald-700">
            <CheckCircle2 size={24} className="shrink-0" />
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
              <p className="text-sm font-bold text-slate-700 uppercase tracking-widest">Đang xử lý dữ liệu...</p>
           </div>
        </div>
      )}

      {deleteConfirmId && (
        <ConfirmDialog 
          title={isBlockedDelete ? "Hạn chế xóa" : "Xóa sản phẩm?"}
          message={isBlockedDelete 
            ? "Sản phẩm này đã có giao dịch. Để bảo toàn dữ liệu, bạn chỉ có thể chỉnh sửa thông tin." 
            : "Sản phẩm sẽ được chuyển vào mục lưu trữ tạm thời. Bạn có chắc chắn?"}
          type={isBlockedDelete ? 'info' : 'danger'}
          showConfirm={!isBlockedDelete}
          onConfirm={() => {
            deleteProduct(deleteConfirmId!);
            setDeleteConfirmId(null);
          }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Danh mục hàng hóa</h1>
          <p className="text-slate-500 text-sm font-medium">Hệ thống quản lý kho và giá bán đa kênh.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm flex-nowrap">
            <button onClick={handleExportExcel} className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 font-bold transition-all text-sm">
              <Download size={18} />
              <span className="hidden sm:inline">Xuất Excel</span>
            </button>
            <div className="w-px h-6 bg-slate-100 self-center mx-1"></div>
            <button onClick={() => excelImportRef.current?.click()} className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 font-bold transition-all text-sm">
              <FileSpreadsheet size={18} />
              <span className="hidden sm:inline">Nhập Excel</span>
            </button>
            <input type="file" ref={excelImportRef} className="hidden" accept=".xlsx,.xls" onChange={handleImportExcel} />
          </div>

          <button 
            onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-8 py-4 rounded-[22px] font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 whitespace-nowrap"
          >
            <Plus size={20} />
            <span>Thêm sản phẩm</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-3 rounded-[32px] border border-slate-100 shadow-sm sticky top-16 z-20">
        <div className="relative group flex items-center">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm theo tên, mã SKU hoặc barcode..." 
            className="w-full pl-11 pr-14 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button 
            type="button"
            onClick={() => setShowSearchScanner(true)}
            className="absolute right-3 p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-90"
            title="Tìm kiếm bằng Camera"
          >
            <Barcode size={26} strokeWidth={3} />
          </button>
        </div>
      </div>

      <div className="hidden md:block bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sản phẩm</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã/Barcode</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tồn kho</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phân loại</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-slate-50/80 transition-all group">
                <td className="px-6 py-5">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center text-slate-400 border border-slate-200">
                      {product.image ? <img src={product.image} className="w-full h-full object-cover" alt="" /> : <Package size={28} />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800 block text-sm">{product.name}</span>
                        {product.synced === 0 && (
                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded border border-amber-100 flex items-center space-x-1 shrink-0">
                             <CloudOff size={8} />
                             <span className="text-[7px] font-black uppercase">Chưa đồng bộ</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {product.id}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="font-mono text-xs text-slate-600 font-bold">{product.code}</span>
                    <span className="text-[10px] text-slate-400 flex items-center mt-1">
                      <Barcode size={12} className="mr-1" /> {product.barcode || '---'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${getStockColor(product.stock)}`}>
                    {product.stock} {product.unit}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="text-slate-700 font-bold text-xs">{getGroupName(product.groupId)}</span>
                    <span className="text-slate-400 text-[10px] font-bold uppercase mt-1">{product.unit}</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button onClick={() => { setEditingProduct(product); setIsModalOpen(true); }} className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleCheckDelete(product.id)} className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-4">
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm active:scale-[0.98] transition-all">
            <div className="flex items-start space-x-4 mb-4">
              <div className="w-16 h-16 rounded-[20px] bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                {product.image ? <img src={product.image} className="w-full h-full object-cover" alt="" /> : <Package size={24} className="text-slate-300" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{product.code}</p>
                  {product.synced === 0 && <CloudOff size={10} className="text-amber-500" />}
                </div>
                <h3 className="text-sm font-bold text-slate-800 leading-tight truncate">{product.name}</h3>
                <div className="flex items-center space-x-2 mt-2">
                   <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase">{product.unit}</span>
                   <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${getStockColor(product.stock)}`}>Tồn: {product.stock}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-50">
                <button onClick={() => handleCheckDelete(product.id)} className="p-3 bg-red-50 text-red-500 rounded-xl"><Trash2 size={18} /></button>
                <button onClick={() => { setEditingProduct(product); setIsModalOpen(true); }} className="flex-1 py-3.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-x-2">
                   <Edit2 size={16} /> <span>Chỉnh sửa</span>
                </button>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="py-24 text-center opacity-10">
          <Package size={80} className="mx-auto mb-4" strokeWidth={1} />
          <p className="text-xs font-black uppercase tracking-[0.5em]">Không có hàng hóa</p>
        </div>
      )}

      <BarcodeScannerModal 
        isOpen={showScanner} 
        onClose={() => setShowScanner(false)} 
        onScan={(code) => setFormData(prev => ({ ...prev, barcode: code }))} 
        scannerId="product-edit-reader"
      />

      <BarcodeScannerModal 
        isOpen={showSearchScanner} 
        onClose={() => setShowSearchScanner(false)} 
        onScan={(code) => setSearchTerm(code)} 
        scannerId="product-search-reader"
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-none md:rounded-[40px] shadow-3xl overflow-hidden flex flex-col h-full md:h-auto max-h-[100vh] md:max-h-[95vh] animate-in zoom-in-95">
            <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">
                {editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
              </h2>
              <button onClick={() => { setIsModalOpen(false); setEditingProduct(null); }} className="p-3 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-10 md:space-y-12 scrollbar-hide pb-28 md:pb-10">
              {missingConfig ? (
                <div className="py-20 text-center space-y-6">
                   <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-100">
                      <AlertTriangle size={40} />
                   </div>
                   <div className="max-w-md mx-auto">
                      <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Cấu hình chưa hoàn tất</h3>
                      <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">
                         Bạn cần khởi tạo Nhóm sản phẩm và Loại giá bán trước khi có thể thêm mới hàng hóa vào hệ thống.
                      </p>
                   </div>
                   <button 
                      type="button"
                      onClick={() => navigate('/settings')}
                      className="px-10 py-4 bg-slate-900 text-white rounded-[22px] font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all flex items-center justify-center space-x-2 mx-auto"
                   >
                      <SettingsIcon size={18} />
                      <span>Đi tới thiết lập ngay</span>
                   </button>
                </div>
              ) : (
                <>
                <section className="space-y-6">
                  <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider flex items-center">
                    <Hash size={18} className="mr-2" /> Thông tin cơ bản
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-600">Tên sản phẩm *</label>
                      <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-bold text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="VD: iPhone 15 Pro" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-600">Mã sản phẩm (SKU) *</label>
                      <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-mono font-bold text-sm" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="IP15P-BLK" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-600">Mã Barcode</label>
                      <div className="relative group flex items-center">
                        <input className="w-full pl-5 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-mono text-sm" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} placeholder="Quét hoặc nhập barcode" />
                        <button 
                          type="button"
                          onClick={() => setShowScanner(true)}
                          className="absolute right-4 p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-90"
                          title="Quét barcode bằng camera"
                        >
                          <Barcode size={26} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-600">Đơn vị tính *</label>
                      <div className="relative">
                        <Box className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input required className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold text-sm" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} placeholder="VD: Cái, Kg, Hộp..." />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                     <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider flex items-center">
                       <Layers size={18} className="mr-2" /> Phân loại & Kho
                     </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-600">Nhóm sản phẩm *</label>
                      <select required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none cursor-pointer appearance-none font-bold text-sm" value={formData.groupId} onChange={e => setFormData({...formData, groupId: e.target.value})}>
                        {productGroups.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-600">Dòng sản phẩm (Line ID)</label>
                      <div className="relative">
                        <GitBranch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold text-sm" value={formData.lineId} onChange={e => setFormData({...formData, lineId: e.target.value})} placeholder="VD: Premium, Seasonal..." />
                      </div>
                    </div>
                    <div className="space-y-2 relative">
                      <div className="flex items-center justify-between">
                         <label className="text-sm font-semibold text-slate-600">Tồn kho ban đầu</label>
                         {editingProduct && hasOrders && (
                           <div className="flex items-center text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100 animate-in fade-in">
                              <Lock size={10} className="mr-1" /> KHÔNG THỂ SỬA
                           </div>
                         )}
                      </div>
                      <div className="relative">
                        <input 
                          type="text" 
                          inputMode="numeric"
                          pattern="[0-9]*"
                          disabled={editingProduct && hasOrders}
                          className={`w-full px-5 py-4 border rounded-2xl outline-none font-black text-sm transition-all ${editingProduct && hasOrders ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-70' : 'bg-slate-50 border-slate-200 focus:ring-4 focus:ring-indigo-100 text-slate-800'}`} 
                          placeholder="0"
                          value={formatCurrencyInput(formData.stock)} 
                          onChange={e => setFormData({...formData, stock: parseCurrencyInput(e.target.value)})} 
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider flex items-center">
                    <DollarSign size={18} className="mr-2" /> Thiết lập giá bán *
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {priceTypes.map(pt => (
                      <div key={pt.id} className="p-5 bg-indigo-50/40 rounded-[28px] border border-indigo-100 shadow-sm">
                        <label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest block mb-2">{pt.name}</label>
                        <div className="relative">
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">VNĐ</span>
                          <input 
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            required
                            className="w-full pl-4 pr-12 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-black text-slate-800 text-sm shadow-sm"
                            value={formatCurrencyInput(prices[pt.id] ?? "")}
                            onChange={e => setPrices({...prices, [pt.id]: parseCurrencyInput(e.target.value)})}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-6">
                  <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider flex items-center">
                    <ImageIcon size={18} className="mr-2" /> Hình ảnh sản phẩm
                  </h3>
                  <div className="flex flex-col md:flex-row items-center gap-10">
                    <div className="w-44 h-44 rounded-[36px] border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center relative group shrink-0 overflow-hidden shadow-inner">
                      {formData.image ? (
                        <>
                          <img src={formData.image} className="w-full h-full object-cover" alt="" />
                          <button type="button" onClick={() => setFormData({...formData, image: ''})} className="absolute inset-0 bg-red-600/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                             <Trash2 size={32} />
                          </button>
                        </>
                      ) : (
                        <ImageIcon size={48} className="text-slate-200" />
                      )}
                    </div>
                    <div className="flex-1 w-full space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Đường dẫn Online (URL)</label>
                        <input className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[12px] font-medium outline-none focus:ring-2 focus:ring-indigo-500" value={formData.image && !formData.image.startsWith('data:') ? formData.image : ''} onChange={e => setFormData({...formData, image: e.target.value})} placeholder="https://example.com/image.jpg" />
                      </div>
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-600 flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-sm">
                         <Upload size={18} /> <span>Chọn ảnh từ thiết bị</span>
                      </button>
                      <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                    </div>
                  </div>
                </section>
                </>
              )}
            </form>

            <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row justify-end gap-3 shrink-0 pb-12 md:pb-8">
              <button onClick={() => { setIsModalOpen(false); setEditingProduct(null); }} className="order-2 md:order-1 px-8 py-4 font-bold text-slate-500 hover:bg-slate-200 rounded-[22px] transition-all text-sm">
                Hủy
              </button>
              {!missingConfig && (
                <button onClick={handleSubmit} className="order-1 md:order-2 px-12 py-4 bg-indigo-600 text-white rounded-[22px] font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 text-sm">
                  {editingProduct ? 'Cập nhật sản phẩm' : 'Lưu sản phẩm'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManager;
