
import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Package,
  Loader2,
  Box,
  Target,
  ArrowRight,
  Truck,
  Layers,
  Activity
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { db } from '../db';
import { useStore } from '../store';

type TimeFilter = 'day' | 'week' | 'month' | 'year';

const KPICard = ({ title, value, icon: Icon, trend, color, description, subValue }: any) => (
  <div className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-50/50 transition-all group overflow-hidden relative">
    <div className="flex items-start justify-between relative z-10">
      <div className={`p-3 rounded-2xl bg-${color}-50 text-${color}-600 shadow-sm`}>
        <Icon size={20} />
      </div>
      {trend !== undefined && (
        <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
          {trend >= 0 ? <ArrowUpRight size={12} strokeWidth={3} /> : <ArrowDownRight size={12} strokeWidth={3} />}
          <span>{Math.abs(trend).toFixed(1)}%</span>
        </div>
      )}
    </div>
    <div className="mt-4 relative z-10">
      <h3 className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">{title}</h3>
      <p className="text-xl font-black text-slate-800 mt-1 tracking-tighter leading-none">{value}</p>
      {subValue && <p className="text-[10px] text-indigo-500 font-black mt-1 uppercase tracking-tight">{subValue}</p>}
      {description && <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase italic leading-tight">{description}</p>}
    </div>
  </div>
);

const Dashboard = () => {
  const { storeConfig, products: storeProducts } = useStore();
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('day');
  const [stats, setStats] = useState({
    revenue: { current: 0, growth: 0 },
    orders: { current: 0, growth: 0 },
    profit: { current: 0, growth: 0 },
    purchases: { current: 0, growth: 0 },
    inventory: { value: 0, qty: 0, growth: 0 },
    customers: { current: 0, growth: 0 },
    chartData: [] as any[],
    topProducts: [] as any[]
  });

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  useEffect(() => {
    const calculateStats = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        
        let currentStart = 0;
        let prevStart = 0;
        let prevEnd = 0;

        if (timeFilter === 'day') {
          currentStart = todayStart;
          prevStart = todayStart - (24 * 60 * 60 * 1000);
          prevEnd = todayStart;
        } else if (timeFilter === 'week') {
          currentStart = todayStart - (7 * 24 * 60 * 60 * 1000);
          prevStart = currentStart - (7 * 24 * 60 * 60 * 1000);
          prevEnd = currentStart;
        } else if (timeFilter === 'month') {
          currentStart = todayStart - (30 * 24 * 60 * 60 * 1000);
          prevStart = currentStart - (30 * 24 * 60 * 60 * 1000);
          prevEnd = currentStart;
        } else {
          currentStart = todayStart - (365 * 24 * 60 * 60 * 1000);
          prevStart = currentStart - (365 * 24 * 60 * 60 * 1000);
          prevEnd = currentStart;
        }

        // 1. Fetch data with indexed fields
        const allOrders = await db.orders.where('deleted').equals(0).toArray();
        const allPurchases = await db.purchases.where('deleted').equals(0).toArray();
        const allCustomers = await db.customers.where('deleted').equals(0).toArray();
        const allProducts = await db.products.where('deleted').equals(0).toArray();
        const costPrices = await db.productPrices.where('priceTypeId').equals(storeConfig.costPriceTypeId).toArray();
        const costMap = new Map<string, number>(costPrices.map(cp => [cp.productId, cp.price]));

        // 2. Revenue & Orders
        const ordersInPeriod = allOrders.filter(o => o.updatedAt >= currentStart);
        const ordersInPrevPeriod = allOrders.filter(o => o.updatedAt >= prevStart && o.updatedAt < prevEnd);
        
        const revCurrent = ordersInPeriod.reduce((s, o) => s + o.total, 0);
        const revPrev = ordersInPrevPeriod.reduce((s, o) => s + o.total, 0);
        const revGrowth = calculateGrowth(revCurrent, revPrev);
        const ordersGrowth = calculateGrowth(ordersInPeriod.length, ordersInPrevPeriod.length);

        // 3. Profit (Revenue - COGS)
        const getCOGS = (orders: any[]) => orders.reduce((sum, order) => {
          return sum + order.items.reduce((iSum: number, item: any) => iSum + ((costMap.get(item.productId) || 0) * item.qty), 0);
        }, 0);
        
        const currentCOGS = getCOGS(ordersInPeriod);
        const prevCOGS = getCOGS(ordersInPrevPeriod);
        const profitCurrent = revCurrent - currentCOGS;
        const profitPrev = revPrev - prevCOGS;
        const profitGrowth = calculateGrowth(profitCurrent, profitPrev);

        // 4. Purchases (Nhập hàng trong kỳ)
        const purCurrent = allPurchases.filter(p => p.createdAt >= currentStart).reduce((s, p) => s + p.total, 0);
        const purPrev = allPurchases.filter(p => p.createdAt >= prevStart && p.createdAt < prevEnd).reduce((s, p) => s + p.total, 0);
        const purGrowth = calculateGrowth(purCurrent, purPrev);

        // 5. Inventory (Tồn kho: Hiện tại vs Đầu kỳ)
        // Giá trị kho hiện tại = Tổng (Số lượng * Giá nhập)
        const currentStockQty = allProducts.reduce((sum, p) => sum + p.stock, 0);
        const currentStockValue = allProducts.reduce((sum, p) => sum + (p.stock * (costMap.get(p.id) || 0)), 0);
        
        // Ước tính giá trị đầu kỳ = Giá trị hiện tại - Nhập hàng + Xuất hàng (COGS)
        const startStockValue = currentStockValue - purCurrent + currentCOGS;
        const invGrowth = calculateGrowth(currentStockValue, startStockValue);

        // 6. Customers (Tỷ lệ khách hàng mới)
        const totalCustomers = allCustomers.length;
        const newCustCurrent = allCustomers.filter(c => c.updatedAt >= currentStart).length;
        const newCustPrev = allCustomers.filter(c => c.updatedAt >= prevStart && c.updatedAt < prevEnd).length;
        const custGrowth = calculateGrowth(newCustCurrent, newCustPrev);

        // 7. Chart & Top Products
        const chartMap = new Map<string, number>();
        const productSales = new Map<string, { name: string, sales: number }>();
        
        ordersInPeriod.forEach(o => {
          const d = new Date(o.updatedAt);
          const key = timeFilter === 'day' ? `${d.getHours()}h` : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
          chartMap.set(key, (chartMap.get(key) || 0) + o.total);
          
          o.items.forEach(i => {
            const existing = productSales.get(i.productId);
            if (existing) existing.sales += i.qty;
            else productSales.set(i.productId, { name: i.name || 'N/A', sales: i.qty });
          });
        });

        setStats({
          revenue: { current: revCurrent, growth: revGrowth },
          orders: { current: ordersInPeriod.length, growth: ordersGrowth },
          profit: { current: profitCurrent, growth: profitGrowth },
          purchases: { current: purCurrent, growth: purGrowth },
          inventory: { value: currentStockValue, qty: currentStockQty, growth: invGrowth },
          customers: { current: totalCustomers, growth: custGrowth },
          chartData: Array.from(chartMap.entries()).map(([label, revenue]) => ({ label, revenue })),
          topProducts: Array.from(productSales.values()).sort((a, b) => b.sales - a.sales).slice(0, 5)
        });
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };

    calculateStats();
  }, [timeFilter, storeConfig.costPriceTypeId, storeProducts]);

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center py-40">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tính toán hiệu suất kinh doanh...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3 mb-1">
             <div className="w-1.5 h-7 bg-indigo-600 rounded-full"></div>
             <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">Tổng quan kinh doanh</h1>
          </div>
          <p className="text-slate-400 text-xs font-medium ml-4">Phân tích dữ liệu thực tế dựa trên kỳ báo cáo.</p>
        </div>

        <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm no-print">
          {(['day', 'week', 'month', 'year'] as TimeFilter[]).map(f => (
            <button 
              key={f}
              onClick={() => setTimeFilter(f)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeFilter === f ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            >
              {f === 'day' ? 'Hôm nay' : f === 'week' ? 'Tuần' : f === 'month' ? 'Tháng' : 'Năm'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Doanh thu" value={`${stats.revenue.current.toLocaleString()}đ`} trend={stats.revenue.growth} icon={DollarSign} color="indigo" description="Tổng tiền bán lẻ" />
        <KPICard title="Đơn hàng" value={stats.orders.current} trend={stats.orders.growth} icon={ShoppingBag} color="emerald" description="Số đơn hoàn tất" />
        <KPICard title="Lợi nhuận" value={`${stats.profit.current.toLocaleString()}đ`} trend={stats.profit.growth} icon={TrendingUp} color="amber" description="Doanh thu - Giá vốn" />
        <KPICard title="Doanh số nhập" value={`${stats.purchases.current.toLocaleString()}đ`} trend={stats.purchases.growth} icon={Truck} color="purple" description="Tổng tiền nhập kho" />
        <KPICard title="Tồn kho" value={`${stats.inventory.value.toLocaleString()}đ`} subValue={`${stats.inventory.qty.toLocaleString()} SP`} trend={stats.inventory.growth} icon={Box} color="blue" description="Tổng tiền nhập hàng tồn" />
        <KPICard title="Khách hàng" value={stats.customers.current} trend={stats.customers.growth} icon={Users} color="rose" description="Tổng tệp khách" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[40px] border border-slate-100 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                 <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Target size={20} /></div>
                 <div>
                    <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-[0.2em]">Biểu đồ doanh thu</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Hiệu suất bán lẻ</p>
                 </div>
              </div>
           </div>
           
           <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData.length > 0 ? stats.chartData : [{label: '-', revenue: 0}]}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v.toLocaleString()} />
                  <Tooltip 
                    formatter={(v: any) => [`${v.toLocaleString()}đ`, 'Doanh thu']}
                    contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '16px', fontWeight: 'bold'}}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col">
           <div className="flex items-center space-x-3 mb-8">
              <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl shadow-sm"><Layers size={20} /></div>
              <div>
                 <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-[0.2em]">Sản phẩm bán chạy</h3>
                 <p className="text-slate-400 text-[9px] font-bold uppercase mt-1 tracking-widest">Tiêu thụ nhiều nhất</p>
              </div>
           </div>

           <div className="flex-1 space-y-3">
              {stats.topProducts.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl hover:bg-indigo-50/50 transition-all group border border-transparent hover:border-indigo-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 bg-white border border-slate-100 text-indigo-600 rounded-xl flex items-center justify-center font-black text-[10px] shadow-sm">
                       {idx + 1}
                    </div>
                    <div className="min-w-0">
                       <p className="font-bold text-slate-700 text-xs truncate leading-tight uppercase tracking-tight">{item.name}</p>
                       <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">Đã bán {item.sales} đơn vị</p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                </div>
              ))}
              {stats.topProducts.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center py-20 opacity-20 italic">
                   <Package size={50} strokeWidth={1} className="text-slate-400 mb-4" />
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Chưa có giao dịch</p>
                </div>
              )}
           </div>

           <div className="mt-8 pt-6 border-t border-slate-50">
              <div className="bg-indigo-50/30 p-4 rounded-2xl border border-indigo-50 flex items-center justify-center space-x-2">
                 <Activity size={12} className="text-indigo-500" />
                 <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest text-center">Tự động cập nhật dữ liệu</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
