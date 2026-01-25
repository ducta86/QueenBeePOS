
import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Package, 
  DollarSign, 
  PieChart, 
  ShoppingBag,
  Target,
  Users,
  ChevronRight,
  Filter,
  User,
  CreditCard,
  AlertTriangle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart as RePieChart,
  Pie
} from 'recharts';
import { db } from '../db';
import { useStore } from '../store';
import { ProductPrice, Product } from '../types';

type ReportFilter = 'week' | 'month' | 'year' | 'all';

const StatBox = ({ title, value, icon: Icon, trend, color }: any) => (
  <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl bg-${color}-50 text-${color}-600`}>
        <Icon size={20} />
      </div>
      {trend !== undefined && (
        <div className={`flex items-center space-x-1 text-[10px] font-black ${trend > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
          {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>{Math.abs(trend)}%</span>
        </div>
      )}
    </div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
    <h3 className="text-xl font-black text-slate-800 tracking-tighter">{value}</h3>
  </div>
);

const Reports = () => {
  const { products, storeConfig, productGroups } = useStore();
  const [filter, setFilter] = useState<ReportFilter>('month');
  const [data, setData] = useState<any>({
    salesByMethod: [],
    lowStock: [],
    customerReport: [],
    summary: {
      totalRev: 0,
      profit: 0,
      margin: 0
    }
  });
  const [selectedCustomerForAnalysis, setSelectedCustomerForAnalysis] = useState<any>(null);

  useEffect(() => {
    const loadReports = async () => {
      const now = Date.now();
      let startTime = 0;
      
      if (filter === 'week') startTime = now - 7 * 24 * 60 * 60 * 1000;
      else if (filter === 'month') startTime = now - 30 * 24 * 60 * 60 * 1000;
      else if (filter === 'year') startTime = now - 365 * 24 * 60 * 60 * 1000;

      const allOrders = await db.orders.where('deleted').equals(0).toArray();
      const filteredOrders = filter === 'all' ? allOrders : allOrders.filter(o => o.updatedAt >= startTime);
      
      const allPrices = await db.productPrices.where('priceTypeId').equals(storeConfig.costPriceTypeId).toArray();
      const costMap = new Map<string, number>(allPrices.map((p: ProductPrice) => [p.productId, p.price]));
      const productMap = new Map<string, Product>(products.map(p => [p.id, p]));

      let cash: number = 0, qr: number = 0, totalRev: number = 0, totalCost: number = 0;
      
      const customerMap = new Map<string, any>();

      filteredOrders.forEach(order => {
        totalRev += order.total;
        if (order.paymentMethod === 'cash') cash += order.total;
        else qr += order.total;

        const cId = order.customerId || 'walk-in';
        if (!customerMap.has(cId)) {
          customerMap.set(cId, {
            id: cId,
            name: order.customerName || 'Khách lẻ',
            total: 0,
            orderCount: 0,
            categorySpend: new Map<string, number>()
          });
        }
        const cData = customerMap.get(cId);
        cData.total += order.total;
        cData.orderCount += 1;

        order.items.forEach(item => {
          const itemCost: number = costMap.get(item.productId) || 0;
          totalCost += itemCost * item.qty;

          const product = productMap.get(item.productId);
          if (product) {
            const gId = product.groupId;
            const currentGSpend = cData.categorySpend.get(gId) || 0;
            cData.categorySpend.set(gId, currentGSpend + item.total);
          }
        });
      });

      const profit = totalRev - totalCost;
      const margin = totalRev > 0 ? (profit / totalRev) * 100 : 0;

      const customerReport = Array.from(customerMap.values())
        .map(c => {
          let favCat = 'N/A';
          let maxSpend = -1;
          const catBreakdown: any[] = [];
          
          c.categorySpend.forEach((spend: number, gId: string) => {
            const gName = productGroups.find(g => g.id === gId)?.name || 'Khác';
            catBreakdown.push({ name: gName, value: spend });
            if (spend > maxSpend) {
              maxSpend = spend;
              favCat = gName;
            }
          });

          return { ...c, favCat, catBreakdown: catBreakdown.sort((a,b) => b.value - a.value) };
        })
        .sort((a, b) => b.total - a.total);

      setData({
        salesByMethod: [
          { name: 'Tiền mặt', value: cash, color: '#6366f1' },
          { name: 'Quét QR', value: qr, color: '#10b981' }
        ],
        // Sử dụng ngưỡng từ cấu hình
        lowStock: products.filter(p => p.stock <= (storeConfig.lowStockThreshold || 10)).sort((a, b) => a.stock - b.stock),
        customerReport,
        summary: {
          totalRev,
          profit,
          margin: Math.round(margin)
        }
      });

      if (customerReport.length > 0 && !selectedCustomerForAnalysis) {
        setSelectedCustomerForAnalysis(customerReport[0]);
      }
    };

    loadReports();
  }, [products, storeConfig.costPriceTypeId, storeConfig.lowStockThreshold, filter, productGroups]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center">
            <BarChart3 className="mr-3 text-indigo-600" /> Báo cáo chi tiết
          </h1>
          <p className="text-slate-500 text-sm">Phân tích chuyên sâu về doanh thu và khách hàng.</p>
        </div>

        <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto scrollbar-hide">
          {(['week', 'month', 'year', 'all'] as ReportFilter[]).map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === f ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            >
              {f === 'week' ? '7 ngày qua' : f === 'month' ? '30 ngày qua' : f === 'year' ? 'Năm nay' : 'Toàn bộ'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatBox title="Doanh thu trong kỳ" value={`${data.summary.totalRev.toLocaleString()}đ`} icon={DollarSign} color="indigo" />
        <StatBox title="Lợi nhuận gộp" value={`${data.summary.profit.toLocaleString()}đ`} icon={TrendingUp} color="emerald" />
        <StatBox title="Tỉ suất lợi nhuận" value={`${data.summary.margin}%`} icon={Target} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Doanh thu theo khách hàng (List) */}
        <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div className="flex items-center space-x-3">
               <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Users size={20} /></div>
               <div>
                  <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Xếp hạng chi tiêu khách hàng</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Sắp xếp theo doanh thu giảm dần</p>
               </div>
            </div>
            <div className="px-3 py-1 bg-slate-50 rounded-full border border-slate-100 flex items-center space-x-2">
               <Filter size={12} className="text-slate-400" />
               <span className="text-[9px] font-black text-slate-500 uppercase">{data.customerReport.length} Khách hàng</span>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto scrollbar-hide">
             <table className="w-full text-left min-w-[500px]">
                <thead>
                   <tr className="border-b border-slate-50">
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">Hạng</th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Khách hàng</th>
                      <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">Nhóm hàng ưa thích</th>
                      <th className="pb-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Doanh thu</th>
                      <th className="pb-4 w-8"></th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {data.customerReport.map((c: any, idx: number) => (
                     <tr key={c.id} 
                        onClick={() => setSelectedCustomerForAnalysis(c)}
                        className={`group cursor-pointer transition-all ${selectedCustomerForAnalysis?.id === c.id ? 'bg-indigo-50/50' : 'hover:bg-slate-50/50'}`}
                     >
                        <td className="py-4">
                           <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[11px] ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-slate-100 text-slate-600' : 'text-slate-400'}`}>
                              {idx + 1}
                           </div>
                        </td>
                        <td className="py-4">
                           <p className="text-sm font-bold text-slate-800 truncate max-w-[150px]">{c.name}</p>
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{c.orderCount} đơn hàng</p>
                        </td>
                        <td className="py-4 hidden sm:table-cell">
                           <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-500 uppercase">
                              {c.favCat}
                           </span>
                        </td>
                        <td className="py-4 text-right">
                           <p className="text-sm font-black text-indigo-600">{c.total.toLocaleString()}đ</p>
                        </td>
                        <td className="py-4 text-right">
                           <ChevronRight size={16} className={`transition-transform ${selectedCustomerForAnalysis?.id === c.id ? 'text-indigo-600 translate-x-1' : 'text-slate-200'}`} />
                        </td>
                     </tr>
                   ))}
                </tbody>
             </table>
             {data.customerReport.length === 0 && (
               <div className="py-20 text-center opacity-20 italic">
                  <User size={60} strokeWidth={1} className="mx-auto mb-4" />
                  <p className="text-xs font-black uppercase tracking-[0.4em]">Chưa có dữ liệu giao dịch</p>
               </div>
             )}
          </div>
        </div>

        {/* Phân tích cơ cấu nhóm hàng của khách (Chart) */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center space-x-3 mb-8">
             <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><PieChart size={20} /></div>
             <div>
                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Cơ cấu nhóm hàng</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Phân tích chi tiêu của {selectedCustomerForAnalysis?.name || '---'}</p>
             </div>
          </div>
          
          <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center">
             {selectedCustomerForAnalysis && selectedCustomerForAnalysis.catBreakdown.length > 0 ? (
                <>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={selectedCustomerForAnalysis.catBreakdown}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {selectedCustomerForAnalysis.catBreakdown.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                           formatter={(v: any) => v.toLocaleString() + 'đ'}
                           contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px'}}
                        />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full space-y-2 mt-4">
                     {selectedCustomerForAnalysis.catBreakdown.map((item: any, idx: number) => (
                       <div key={item.name} className="flex items-center justify-between text-[10px]">
                          <div className="flex items-center space-x-2">
                             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                             <span className="font-bold text-slate-600 uppercase">{item.name}</span>
                          </div>
                          <span className="font-black text-slate-800">{((item.value / selectedCustomerForAnalysis.total) * 100).toFixed(1)}%</span>
                       </div>
                     ))}
                  </div>
                </>
             ) : (
                <div className="text-center opacity-20 py-10">
                   <Target size={40} className="mx-auto mb-2" />
                   <p className="text-[9px] font-black uppercase tracking-widest">Chọn khách hàng để xem phân tích</p>
                </div>
             )}
          </div>
        </div>

        {/* Biểu đồ so sánh doanh thu Top khách hàng */}
        <div className="lg:col-span-3 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
           <div className="flex items-center space-x-3 mb-8">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><BarChart3 size={20} /></div>
              <div>
                 <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">So sánh chi tiêu trong kỳ</h3>
                 <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Top {Math.min(10, data.customerReport.length)} khách hàng dẫn đầu</p>
              </div>
           </div>
           
           <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.customerReport.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} 
                    tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v.toLocaleString()} 
                  />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    formatter={(v: any) => [`${v.toLocaleString()}đ`, 'Chi tiêu']}
                    contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '16px', fontWeight: 'bold'}}
                  />
                  <Bar dataKey="total" radius={[10, 10, 0, 0]}>
                    {data.customerReport.slice(0, 10).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#6366f1' : '#c7d2fe'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Cảnh báo kho hàng - Mở rộng col-span-2 để rộng rãi hơn */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center space-x-3">
               <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><Package size={20} /></div>
               <div>
                  <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Cảnh báo tồn kho thấp</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Danh sách sản phẩm có tồn kho &le; {storeConfig.lowStockThreshold || 10}</p>
               </div>
            </div>
            {data.lowStock.length > 0 && (
              <div className="px-3 py-1 bg-rose-50 rounded-full border border-rose-100 flex items-center space-x-2 animate-pulse">
                <AlertTriangle size={12} className="text-rose-500" />
                <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">{data.lowStock.length} Sản phẩm sắp hết</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.lowStock.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-rose-100 transition-all hover:bg-rose-50/30 group">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm overflow-hidden text-slate-300 shrink-0">
                    {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Package size={20} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-700 leading-tight mb-1 truncate group-hover:text-rose-600 transition-colors">{p.name}</p>
                    <p className="text-[9px] text-slate-400 font-mono uppercase">Mã: {p.code}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                   <p className={`text-sm font-black leading-none ${p.stock <= (Math.floor((storeConfig.lowStockThreshold || 10) / 4)) ? 'text-rose-600' : 'text-amber-600'}`}>{p.stock}</p>
                   <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Còn {p.unit}</p>
                </div>
              </div>
            ))}
            {data.lowStock.length === 0 && (
              <div className="col-span-full py-10 flex flex-col items-center justify-center opacity-20 italic">
                <Package size={40} className="mb-2" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Kho hàng ổn định</p>
              </div>
            )}
          </div>
        </div>

        {/* Doanh thu theo phương thức */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <div className="flex items-center space-x-3 mb-8">
             <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl"><CreditCard size={20} /></div>
             <div>
                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Kênh thanh toán</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Cơ cấu dòng tiền mặt/QR</p>
             </div>
          </div>
          <div className="h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={data.salesByMethod}
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.salesByMethod.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(v: any) => v.toLocaleString() + 'đ'}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px'}}
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
             {data.salesByMethod.map((item: any) => (
               <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                     <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                     <span className="text-[10px] font-black text-slate-600 uppercase">{item.name}</span>
                  </div>
                  <span className="text-xs font-black text-slate-800">{item.value.toLocaleString()}đ</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
