
import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import { useStore } from '../store';
import { Dexie } from 'dexie';

/**
 * Hook xử lý đồng bộ dữ liệu giữa IndexedDB cục bộ và PocketBase Server trong mạng LAN.
 * Sử dụng REST API của PocketBase để đảm bảo tính gọn nhẹ.
 */
export const useSync = () => {
  const { storeConfig } = useStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isServerOnline, setIsServerOnline] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(
    Number(localStorage.getItem('last_sync_ts')) || null
  );
  
  const [unsyncedCount, setUnsyncedCount] = useState({
    products: 0, orders: 0, customers: 0, users: 0, prices: 0, groups: 0
  });

  const backendUrl = storeConfig.backendUrl?.replace(/\/$/, '');

  // Kiểm tra trạng thái Server PocketBase trong mạng LAN
  const checkServerHealth = useCallback(async () => {
    if (!backendUrl) {
      setIsServerOnline(false);
      return false;
    }
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);
      const resp = await fetch(`${backendUrl}/api/health`, { signal: controller.signal });
      clearTimeout(id);
      const online = resp.ok;
      setIsServerOnline(online);
      return online;
    } catch (e) {
      setIsServerOnline(false);
      return false;
    }
  }, [backendUrl]);

  // Kiểm tra số lượng bản ghi chưa đồng bộ trong DB nội bộ
  const checkUnsynced = useCallback(async () => {
    const pCount = await db.products.where('synced').equals(0).count();
    const oCount = await db.orders.where('synced').equals(0).count();
    const cCount = await db.customers.where('synced').equals(0).count();
    const uCount = await db.users.where('synced').equals(0).count();
    const prCount = await db.productPrices.where('synced').equals(0).count();
    const gCount = await db.productGroups.where('synced').equals(0).count();
    
    setUnsyncedCount({ 
      products: pCount, 
      orders: oCount, 
      customers: cCount, 
      users: uCount,
      prices: prCount,
      groups: gCount
    });
    
    return pCount + oCount + cCount + uCount + prCount + gCount;
  }, []);

  // Hàm helper để gửi dữ liệu lên PocketBase (Push)
  const pushCollection = async (tableName: string, collectionName: string) => {
    const table = (db as any)[tableName];
    const unsynced = await table.where('synced').equals(0).toArray();
    
    for (const item of unsynced) {
      try {
        // Kiểm tra record đã tồn tại trên server chưa
        const checkResp = await fetch(`${backendUrl}/api/collections/${collectionName}/records/${item.id}`);
        const exists = checkResp.ok;

        const method = exists ? 'PATCH' : 'POST';
        const url = exists 
          ? `${backendUrl}/api/collections/${collectionName}/records/${item.id}`
          : `${backendUrl}/api/collections/${collectionName}/records`;

        // Chuẩn bị dữ liệu gửi đi (loại bỏ flag local internal)
        const { synced, ...payload } = item;
        
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          await table.update(item.id, { synced: 1 });
        }
      } catch (err) {
        console.warn(`Sync failed for ${collectionName}/${item.id}:`, err);
      }
    }
  };

  // Hàm helper để lấy dữ liệu từ PocketBase về (Pull)
  const pullCollection = async (tableName: string, collectionName: string) => {
    const table = (db as any)[tableName];
    const filter = lastSync ? `updatedAt > ${lastSync}` : '';
    const url = `${backendUrl}/api/collections/${collectionName}/records?filter=${encodeURIComponent(filter)}&perPage=500`;

    try {
      const resp = await fetch(url);
      if (!resp.ok) return;
      const data = await resp.json();

      if (data.items && data.items.length > 0) {
        await (db as Dexie).transaction('rw', [table], async () => {
          for (const record of data.items) {
            // Chỉ cập nhật nếu dữ liệu server mới hơn dữ liệu local
            const local = await table.get(record.id);
            if (!local || record.updatedAt > local.updatedAt) {
              await table.put({ ...record, synced: 1 });
            }
          }
        });
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
    const now = Date.now();

    try {
      // 1. Đồng bộ cấu hình cơ bản trước
      await pushCollection('priceTypes', 'price_types');
      await pullCollection('priceTypes', 'price_types');
      
      await pushCollection('productGroups', 'product_groups');
      await pullCollection('productGroups', 'product_groups');

      // 2. Đồng bộ sản phẩm và giá
      await pushCollection('products', 'products');
      await pullCollection('products', 'products');
      
      await pushCollection('productPrices', 'product_prices');
      await pullCollection('productPrices', 'product_prices');

      // 3. Đồng bộ khách hàng
      await pushCollection('customers', 'customers');
      await pullCollection('customers', 'customers');

      // 4. Đồng bộ đơn hàng (Thường chỉ push, ít khi pull về sửa)
      await pushCollection('orders', 'orders');
      await pullCollection('orders', 'orders');

      // 5. Đồng bộ người dùng
      await pushCollection('users', 'users');
      await pullCollection('users', 'users');

      setLastSync(now);
      localStorage.setItem('last_sync_ts', now.toString());
      await checkUnsynced();
    } catch (error) {
      console.error('Lỗi quy trình đồng bộ LAN:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Vòng lặp kiểm tra dữ liệu và server định kỳ
  useEffect(() => {
    checkUnsynced();
    checkServerHealth();
    
    const healthInterval = setInterval(checkServerHealth, 10000);
    const syncInterval = setInterval(() => {
      if (!isSyncing && isServerOnline) {
        syncData();
      }
    }, 30000); // Tự động đồng bộ mỗi 30s nếu có server

    return () => {
      clearInterval(healthInterval);
      clearInterval(syncInterval);
    };
  }, [checkUnsynced, checkServerHealth, isServerOnline, isSyncing]);

  return { 
    syncData, 
    isSyncing, 
    isServerOnline,
    lastSync, 
    unsyncedCount, 
    // Fix: Explicitly cast Object.values to number[] and provide parameter types in reduce to fix "unknown" errors
    totalUnsynced: (Object.values(unsyncedCount) as number[]).reduce((a: number, b: number) => a + b, 0)
  };
};