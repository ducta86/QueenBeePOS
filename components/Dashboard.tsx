
import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, Users, ShoppingBag, DollarSign, ArrowUpRight, ArrowDownRight,
  Package, Loader2, Box, Target, ArrowRight, Truck, Layers, Activity
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { db } from '../db';
import { useStore } from '../store';

type TimeFilter = 'day' | 'week' | 'month' | 'year';

const KPICard = ({ title, value, icon: Icon, trend, color, description, subValue }: any) => (
  <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-50/50 transition-all group overflow-hidden relative">
    <div className="flex items-start justify-between relative z-10">
      <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600 shadow-sm`}>
        <Icon size={20} />
      </div>
      {trend !== undefined && (
        <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
          {trend >= 0 ? <ArrowUpRight size={12} strokeWidth={2} /> : <ArrowDownRight size={12} strokeWidth={2} />}
          <span>{Math.abs(trend).toFixed(1)}%</span>
        </div>
      )}
    </div>
    <div className="mt-4 relative z-10">
      <h3 className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">{title}</h3>
      <p className="text-2xl font-bold text-slate-800 mt-1 tracking-tight leading-none">{value}</p>
      {subValue && <p className="text-xs text-indigo-600 font-semibold mt-1.5">{subValue}</p>}
      {description && <p className="text-[10px] text-slate-400 font-medium mt-2 italic leading-tight">{description}</p>}
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

        const allOrders = await db.orders.where('deleted').equals(0).toArray();
        const allPurchases = await db.purchases.where('deleted').equals(0).toArray();
        const allCustomers = await db.customers.where('deleted').equals(0).toArray();
        const allProducts = await db.products.where('deleted').equals(0).toArray();
        const costPrices = await db.productPrices.where('priceTypeId').equals(storeConfig.costPriceTypeId).toArray();
        const costMap = new Map<string, number>(costPrices.map(cp => [cp.productId, cp.price]));

        const ordersInPeriod = allOrders.filter(o => o.updatedAt >= currentStart);
        const ordersInPrevPeriod = allOrders.filter(o => o.updatedAt >= prevStart && o.updatedAt < prevEnd);
        
        const revCurrent = ordersInPeriod.reduce((s, o) => s + o.total, 0);
        const revPrev = ordersInPrevPeriod.reduce((s, o) => s + o.total, 0);
        const revGrowth = calculateGrowth(revCurrent, revPrev);
        const ordersGrowth = calculateGrowth(ordersInPeriod.length, ordersInPrevPeriod.length);

        const getCOGS = (orders: any[]) => orders.reduce((sum, order) => {
          return sum + order.items.reduce((iSum: number, item: any) => iSum + ((costMap.get(item.productId) || 0) * item.qty), 0);
        }, 0);
        
        const currentCOGS = getCOGS(ordersInPeriod);
        const prevCOGS = getCOGS(ordersInPrevPeriod);
        const profitCurrent = revCurrent - currentCOGS;
        const profitPrev = revPrev - prevCOGS;
        const profitGrowth = calculateGrowth(profitCurrent, profitPrev);

        const purCurrent = allPurchases.filter(p => p.createdAt >= currentStart).reduce((s, p) => s + p.total, 0);
        const purPrev = allPurchases.filter(p => p.createdAt >= prevStart && p.createdAt < prevEnd).reduce((s, p) => s + p.total, 0);
        const purGrowth = calculateGrowth(purCurrent, purPrev);

        const currentStockQty = allProducts.reduce((sum, p) => sum + p.stock, 0);
        const currentStockValue = allProducts.reduce((sum, p) => sum + (p.stock * (costMap.get(p.id) || 0)), 0);
        
        const startStockValue = currentStockValue - purCurrent + currentCOGS;
        const invGrowth = calculateGrowth(currentStockValue, startStockValue);

        const totalCustomers = allCustomers.length;
        const newCustCurrent = allCustomers.filter(c => c.updatedAt >= currentStart).length;
        const newCustPrev = allCustomers.filter(c => c.updatedAt >= prevStart && c.updatedAt < prevEnd).length;
        const custGrowth = calculateGrowth(newCustCurrent, newCustPrev);

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
        <p className="text-sm font-semibold text-slate-400">Chuẩn bị báo cáo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3 mb-1">
             <div className="w-1.25 h-6 bg-indigo-600 rounded-full"></div>
             <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Tổng quan kinh doanh</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium ml-4">Phân tích dữ liệu thực tế dựa trên kỳ báo cáo.</p>
        </div>

        <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
          {(['day', 'week', 'month', 'year'] as TimeFilter[]).map(f => (
            <button 
              key={f}
              onClick={() => setTimeFilter(f)}
              className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${timeFilter === f ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
              {f === 'day' ? 'Hôm nay' : f === 'week' ? 'Tuần' : f === 'month' ? 'Tháng' : 'Năm'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Doanh thu" value={`${stats.revenue.current.toLocaleString()}đ`} trend={stats.revenue.growth} icon={DollarSign} color="indigo" />
        <KPICard title="Đơn hàng" value={stats.orders.current} trend={stats.orders.growth} icon={ShoppingBag} color="emerald" />
        <KPICard title="Lợi nhuận" value={`${stats.profit.current.toLocaleString()}đ`} trend={stats.profit.growth} icon={TrendingUp} color="amber" />
        <KPICard title="Nhập hàng" value={`${stats.purchases.current.toLocaleString()}đ`} trend={stats.purchases.growth} icon={Truck} color="purple" />
        <KPICard title="Tồn kho" value={`${stats.inventory.value.toLocaleString()}đ`} trend={stats.inventory.growth} icon={Box} color="blue" />
        <KPICard title="Khách hàng" value={stats.customers.current} trend={stats.customers.growth} icon={Users} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm">
           <div className="flex items-center space-x-3 mb-8">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shadow-sm"><Target size={20} /></div>
              <div>
                 <h3 className="font-bold text-slate-800 text-base">Biểu đồ doanh thu</h3>
                 <p className="text-xs text-slate-400 font-medium">Hiệu suất bán lẻ theo thời gian</p>
              </div>
           </div>
           
           <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData.length > 0 ? stats.chartData : [{label: '-', revenue: 0}]}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 500}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 500}} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v.toLocaleString()} />
                  <Tooltip 
                    formatter={(v: any) => [`${v.toLocaleString()}đ`, 'Doanh thu']}
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px', fontWeight: 600}}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col">
           <div className="flex items-center space-x-3 mb-8">
              <div className="p-3 bg-slate-50 text-slate-400 rounded-xl shadow-sm"><Layers size={20} /></div>
              <div>
                 <h3 className="font-bold text-slate-800 text-base">Sản phẩm tiêu biểu</h3>
                 <p className="text-slate-400 text-xs font-medium">Bán chạy nhất trong kỳ</p>
              </div>
           </div>

           <div className="flex-1 space-y-3">
              {stats.topProducts.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl hover:bg-indigo-50/50 transition-all group border border-transparent hover:border-indigo-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-white border border-slate-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-xs shadow-sm">
                       {idx + 1}
                    </div>
                    <div className="min-w-0">
                       <p className="font-semibold text-slate-700 text-sm truncate leading-tight">{item.name}</p>
                       <p className="text-[10px] text-slate-400 font-medium mt-1">Đã bán {item.sales} sản phẩm</p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
