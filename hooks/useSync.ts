
import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import { useStore } from '../store';
import { Dexie } from 'dexie';

// Giả lập một Cloud Server (trong thực tế sẽ là API endpoint)
const CLOUD_STORAGE_KEY = 'POS_CLOUD_MOCK_STORAGE';

export const useSync = () => {
  const { storeConfig } = useStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(Number(localStorage.getItem('last_sync_ts')) || null);
  const [unsyncedCount, setUnsyncedCount] = useState({ products: 0, orders: 0, customers: 0, users: 0 });

  const checkUnsynced = useCallback(async () => {
    const pCount = await db.products.where('synced').equals(0).count();
    const oCount = await db.orders.where('synced').equals(0).count();
    const cCount = await db.customers.where('synced').equals(0).count();
    const uCount = await db.users.where('synced').equals(0).count();
    setUnsyncedCount({ products: pCount, orders: oCount, customers: cCount, users: uCount });
    return pCount + oCount + cCount + uCount;
  }, []);

  useEffect(() => {
    checkUnsynced();
    const interval = setInterval(checkUnsynced, 5000); 
    return () => clearInterval(interval);
  }, [checkUnsynced]);

  // Hàm thực hiện đồng bộ thực tế (giả lập Cloud qua LocalStorage dùng chung giữa các tab hoặc giả định API)
  const syncData = async () => {
    if (!storeConfig.syncKey || isSyncing || !navigator.onLine) return;
    
    setIsSyncing(true);
    const syncKey = storeConfig.syncKey;

    try {
      // 1. PUSH: Lấy dữ liệu chưa đồng bộ cục bộ
      const unsyncedProducts = await db.products.where('synced').equals(0).toArray();
      const unsyncedOrders = await db.orders.where('synced').equals(0).toArray();
      const unsyncedCustomers = await db.customers.where('synced').equals(0).toArray();
      const unsyncedUsers = await db.users.where('synced').equals(0).toArray();

      // 2. CLOUD RELAY (Giả lập gửi lên server)
      // Trong thực tế: await fetch('/api/sync', { method: 'POST', body: JSON.stringify({...}) })
      const cloudDataRaw = localStorage.getItem(`${CLOUD_STORAGE_KEY}_${syncKey}`);
      let cloudDB = cloudDataRaw ? JSON.parse(cloudDataRaw) : { products: [], orders: [], customers: [], users: [] };

      // Hàm merge dữ liệu cục bộ vào cloud (Last-write-wins)
      const mergeToCloud = (cloudList: any[], localList: any[]) => {
        localList.forEach(localItem => {
          const idx = cloudList.findIndex(i => i.id === localItem.id);
          if (idx > -1) {
            if (localItem.updatedAt > cloudList[idx].updatedAt) {
              cloudList[idx] = { ...localItem, synced: 1 };
            }
          } else {
            cloudList.push({ ...localItem, synced: 1 });
          }
        });
      };

      mergeToCloud(cloudDB.products, unsyncedProducts);
      mergeToCloud(cloudDB.orders, unsyncedOrders);
      mergeToCloud(cloudDB.customers, unsyncedCustomers);
      mergeToCloud(cloudDB.users, unsyncedUsers);

      // Lưu lại "Cloud" giả lập
      localStorage.setItem(`${CLOUD_STORAGE_KEY}_${syncKey}`, JSON.stringify(cloudDB));

      // 3. PULL: Tải dữ liệu từ Cloud về và cập nhật Local
      // Merge ngược lại vào IndexedDB cục bộ
      const updateLocal = async (table: any, cloudItems: any[]) => {
        for (const item of cloudItems) {
          const localItem = await table.get(item.id);
          if (!localItem || item.updatedAt > localItem.updatedAt) {
            await table.put({ ...item, synced: 1 });
          }
        }
      };

      await (db as Dexie).transaction('rw', [db.products, db.orders, db.customers, db.users], async () => {
        await updateLocal(db.products, cloudDB.products);
        await updateLocal(db.orders, cloudDB.orders);
        await updateLocal(db.customers, cloudDB.customers);
        await updateLocal(db.users, cloudDB.users);
      });

      const now = Date.now();
      setLastSync(now);
      localStorage.setItem('last_sync_ts', now.toString());
      await checkUnsynced();
    } catch (error) {
      console.error('Lỗi đồng bộ:', error);
    } finally {
      setTimeout(() => setIsSyncing(false), 1000);
    }
  };

  // Tự động đồng bộ mỗi khi có thay đổi hoặc định kỳ
  useEffect(() => {
    if (storeConfig.syncKey && navigator.onLine) {
       const timer = setTimeout(syncData, 2000);
       return () => clearTimeout(timer);
    }
  }, [unsyncedCount.products, unsyncedCount.orders, unsyncedCount.customers, unsyncedCount.users, storeConfig.syncKey]);

  return { 
    syncData, 
    isSyncing, 
    lastSync, 
    unsyncedCount, 
    totalUnsynced: unsyncedCount.products + unsyncedCount.orders + unsyncedCount.customers + unsyncedCount.users
  };
};
