
import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import { useStore } from '../store';

export const useSync = () => {
  const { storeConfig } = useStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isServerOnline, setIsServerOnline] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(
    Number(localStorage.getItem('last_sync_ts')) || null
  );
  
  const [unsyncedCount, setUnsyncedCount] = useState({
    products: 0, orders: 0, customers: 0, users: 0
  });

  const backendUrl = storeConfig.backendUrl?.replace(/\/$/, '');

  const checkServerHealth = useCallback(async () => {
    if (!backendUrl) return false;
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);
      // PocketBase không có /api/health mặc định, dùng list records profiles (kể cả lỗi 403 vẫn là server online)
      const resp = await fetch(`${backendUrl}/api/collections/profiles/records?perPage=1`, { signal: controller.signal });
      clearTimeout(id);
      const online = resp.status < 500; // 2xx, 4xx đều coi là server đang sống
      setIsServerOnline(online);
      return online;
    } catch (e) {
      setIsServerOnline(false);
      return false;
    }
  }, [backendUrl]);

  const checkUnsynced = useCallback(async () => {
    const pCount = await db.products.where('synced').equals(0).count();
    const oCount = await db.orders.where('synced').equals(0).count();
    const cCount = await db.customers.where('synced').equals(0).count();
    const uCount = await db.users.where('synced').equals(0).count();
    
    setUnsyncedCount({ products: pCount, orders: oCount, customers: cCount, users: uCount });
    return pCount + oCount + cCount + uCount;
  }, []);

  const syncCollection = async (tableName: string, collectionName: string) => {
    if (!backendUrl) return;
    const table = (db as any)[tableName];
    
    // 1. PUSH: Đẩy dữ liệu cục bộ mới lên Server
    const unsynced = await table.where('synced').equals(0).toArray();
    for (const item of unsynced) {
      try {
        // Kiểm tra record tồn tại trên PB chưa bằng ID
        const checkResp = await fetch(`${backendUrl}/api/collections/${collectionName}/records/${item.id}`);
        const exists = checkResp.ok;
        
        const method = exists ? 'PATCH' : 'POST';
        const url = exists 
          ? `${backendUrl}/api/collections/${collectionName}/records/${item.id}` 
          : `${backendUrl}/api/collections/${collectionName}/records`;

        // Chuẩn bị payload (loại bỏ trường synced, deleted)
        const { synced, deleted, ...payload } = item;
        
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          await table.update(item.id, { synced: 1 });
        } else {
          const errData = await response.json();
          console.warn(`[Sync Failed] ${collectionName}:`, errData);
        }
      } catch (err) {
        console.warn(`[Sync Network Error] ${collectionName}:`, err);
      }
    }

    // 2. PULL: Lấy dữ liệu mới từ Server về máy
    const lastSyncDate = lastSync ? new Date(lastSync).toISOString().replace('T', ' ').split('.')[0] : '2000-01-01 00:00:00';
    const filter = `updated > "${lastSyncDate}"`;
    const pullUrl = `${backendUrl}/api/collections/${collectionName}/records?filter=${encodeURIComponent(filter)}&perPage=500`;

    try {
      const resp = await fetch(pullUrl);
      if (resp.ok) {
        const result = await resp.json();
        for (const record of result.items) {
          const local = await table.get(record.id);
          const remoteUpdatedTs = new Date(record.updated).getTime();
          
          if (!local || remoteUpdatedTs > (local.updatedAt || 0)) {
            await table.put({ 
              ...record, 
              synced: 1, 
              updatedAt: remoteUpdatedTs,
              deleted: 0 // Giả định record lấy về là không bị xóa
            });
          }
        }
      }
    } catch (err) {
      console.error(`[Sync Pull Error] ${collectionName}:`, err);
    }
  };

  const syncData = async () => {
    if (isSyncing || !backendUrl) return;
    const isOnline = await checkServerHealth();
    if (!isOnline) {
      console.warn("Máy chủ PocketBase không phản hồi. Đồng bộ bị hoãn.");
      return;
    }

    setIsSyncing(true);
    try {
      // Đồng bộ theo thứ tự quan hệ dữ liệu
      await syncCollection('users', 'profiles');
      await syncCollection('products', 'products');
      await syncCollection('customers', 'customers');
      await syncCollection('orders', 'orders');

      const now = Date.now();
      setLastSync(now);
      localStorage.setItem('last_sync_ts', now.toString());
      await checkUnsynced();
    } catch (error) {
      console.error('Toàn trình đồng bộ thất bại:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    checkUnsynced();
    checkServerHealth();
    // Tự động kiểm tra sức khỏe server và đồng bộ mỗi 60s
    const interval = setInterval(async () => {
      const online = await checkServerHealth();
      if (online) await syncData();
      else await checkUnsynced();
    }, 60000);
    return () => clearInterval(interval);
  }, [checkServerHealth]);

  return { 
    syncData, 
    isSyncing, 
    isServerOnline, 
    lastSync, 
    unsyncedCount,
    totalUnsynced: (Object.values(unsyncedCount) as number[]).reduce((a, b) => a + b, 0)
  };
};
