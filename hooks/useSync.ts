
import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../db';
import { useStore } from '../store';

export const useSync = () => {
  const backendUrl = useStore(state => state.storeConfig.backendUrl?.replace(/\/$/, ''));
  const fetchInitialData = useStore(state => state.fetchInitialData);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isServerOnline, setIsServerOnline] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(
    Number(localStorage.getItem('last_sync_ts')) || null
  );
  
  const [unsyncedCount, setUnsyncedCount] = useState({
    products: 0, orders: 0, customers: 0, users: 0, purchases: 0,
    priceTypes: 0, productGroups: 0, productPrices: 0
  });

  const syncTimerRef = useRef<any>(null);
  const prevTotalRef = useRef<number>(-1);

  const checkServerHealth = useCallback(async () => {
    if (!backendUrl) return false;
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);
      const resp = await fetch(`${backendUrl}/api/health`, { signal: controller.signal });
      clearTimeout(id);
      const online = resp.status < 500;
      setIsServerOnline(online);
      return online;
    } catch (e) {
      setIsServerOnline(false);
      return false;
    }
  }, [backendUrl]);

  const checkUnsynced = useCallback(async () => {
    try {
      const [pCount, oCount, cCount, uCount, puCount, ptCount, pgCount, ppCount] = await Promise.all([
        db.products.where('synced').equals(0).count(),
        db.orders.where('synced').equals(0).count(),
        db.customers.where('synced').equals(0).count(),
        db.users.where('synced').equals(0).count(),
        db.purchases.where('synced').equals(0).count(),
        db.priceTypes.where('synced').equals(0).count(),
        db.productGroups.where('synced').equals(0).count(),
        db.productPrices.where('synced').equals(0).count()
      ]);
      
      const counts = { 
        products: pCount, orders: oCount, customers: cCount, users: uCount,
        purchases: puCount, priceTypes: ptCount, productGroups: pgCount, productPrices: ppCount  
      };
      
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      if (total !== prevTotalRef.current) {
        setUnsyncedCount(counts);
        prevTotalRef.current = total;
      }
      return total;
    } catch (err) {
      return 0;
    }
  }, []);

  const syncCollection = async (tableName: string, collectionName: string) => {
    if (!backendUrl) return;
    const table = (db as any)[tableName];
    
    // 1. PUSH: Gửi dữ liệu từ Local lên Server
    const allLocalUnsynced = await table.where('synced').equals(0).toArray();
    for (const item of allLocalUnsynced) {
      try {
        const { synced, deleted, id: localId, ...payload } = item;
        
        // Xử lý Xóa
        if (deleted === 1) {
          const deleteResp = await fetch(`${backendUrl}/api/collections/${collectionName}/records/${localId}`, { method: 'DELETE' });
          if (deleteResp.ok || deleteResp.status === 404) {
            // Nếu xóa mềm ở local và đã delete trên server (hoặc ko tồn tại trên server) thì xóa cứng ở local
            await table.delete(localId);
          }
          continue;
        }

        // Kiểm tra tồn tại trên server
        const checkResp = await fetch(`${backendUrl}/api/collections/${collectionName}/records/${localId}`);
        const exists = checkResp.ok;
        
        const url = exists 
          ? `${backendUrl}/api/collections/${collectionName}/records/${localId}` 
          : `${backendUrl}/api/collections/${collectionName}/records`;
        
        const method = exists ? 'PATCH' : 'POST';
        
        // PocketBase yêu cầu ID trong body khi POST để giữ nguyên ID từ local
        const body = method === 'POST' ? { id: localId, ...payload } : payload;

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (response.ok) {
          await table.update(localId, { synced: 1 });
        } else {
          const errData = await response.json();
          console.error(`Sync error for ${collectionName}:`, errData);
        }
      } catch (err) {
        console.error(`Fetch failed for ${collectionName}:`, err);
      }
    }

    // 2. PULL: Kéo dữ liệu mới từ Server về Local
    try {
      const lastSyncISO = lastSync 
        ? new Date(lastSync).toISOString().replace('T', ' ').split('.')[0] 
        : '2000-01-01 00:00:00';
      
      const pullUrl = `${backendUrl}/api/collections/${collectionName}/records?filter=(updated > "${lastSyncISO}")&perPage=500`;
      const resp = await fetch(pullUrl);
      
      if (resp.ok) {
        const result = await resp.json();
        for (const record of result.items) {
          const local = await table.get(record.id);
          const remoteTs = new Date(record.updated).getTime();
          
          // Chỉ cập nhật nếu local chưa có hoặc dữ liệu server mới hơn
          if (!local || remoteTs > (local.updatedAt || 0)) {
            // Quan trọng: Dữ liệu pull về từ PB có thể thiếu trường 'deleted', ta mặc định là 0
            await table.put({ ...record, synced: 1, deleted: 0, updatedAt: remoteTs });
          }
        }
      }
    } catch (err) {
      console.error(`Pull failed for ${collectionName}:`, err);
    }
  };

  const syncData = async () => {
    if (isSyncing || !backendUrl) return;
    const isOnline = await checkServerHealth();
    if (!isOnline) return;

    setIsSyncing(true);
    try {
      // ĐỒNG BỘ TUẦN TỰ THEO THỨ TỰ QUAN HỆ DỮ LIỆU
      // Bước 1: Danh mục cha
      await syncCollection('priceTypes', 'price_types');
      await syncCollection('productGroups', 'product_groups');
      await syncCollection('users', 'profiles');
      
      // Bước 2: Dữ liệu chính (phụ thuộc vào danh mục cha)
      await syncCollection('products', 'products');
      await syncCollection('customers', 'customers');
      
      // Bước 3: Dữ liệu chi tiết (phụ thuộc vào sản phẩm/khách hàng)
      await syncCollection('productPrices', 'product_prices');
      await syncCollection('orders', 'orders');
      await syncCollection('purchases', 'purchases');

      const now = Date.now();
      setLastSync(now);
      localStorage.setItem('last_sync_ts', now.toString());
      await checkUnsynced();
      await fetchInitialData();
    } catch (error) {
      console.error('CRITICAL: Sync process failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    checkUnsynced();
    checkServerHealth();
    syncTimerRef.current = setInterval(async () => {
      const online = await checkServerHealth();
      if (online) {
        const count = await checkUnsynced();
        if (count > 0) await syncData();
      }
    }, 30000); 
    return () => clearInterval(syncTimerRef.current);
  }, [checkServerHealth, checkUnsynced, backendUrl]);

  return { 
    syncData, isSyncing, isServerOnline, lastSync, unsyncedCount, checkUnsynced,
    totalUnsynced: (Object.values(unsyncedCount) as number[]).reduce((a, b) => a + b, 0)
  };
};
