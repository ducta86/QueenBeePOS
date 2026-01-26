
import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import { Dexie } from 'dexie';

export const useSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
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
    // Lắng nghe thay đổi kết nối mạng
    window.addEventListener('online', checkUnsynced);
    const interval = setInterval(checkUnsynced, 5000); 
    return () => {
      window.removeEventListener('online', checkUnsynced);
      clearInterval(interval);
    };
  }, [checkUnsynced]);

  const syncData = async () => {
    if (isSyncing || !navigator.onLine) return;
    
    const total = await checkUnsynced();
    if (total === 0) return;

    setIsSyncing(true);

    try {
      const unsyncedProducts = await db.products.where('synced').equals(0).toArray();
      const unsyncedOrders = await db.orders.where('synced').equals(0).toArray();
      const unsyncedCustomers = await db.customers.where('synced').equals(0).toArray();
      const unsyncedUsers = await db.users.where('synced').equals(0).toArray();

      // Giả lập độ trễ mạng thực tế
      await new Promise(resolve => setTimeout(resolve, 2000));

      await (db as Dexie).transaction('rw', [db.products, db.orders, db.customers, db.users], async () => {
        const now = Date.now();
        for (const p of unsyncedProducts) await db.products.update(p.id, { synced: 1, updatedAt: now });
        for (const o of unsyncedOrders) await db.orders.update(o.id, { synced: 1, updatedAt: now });
        for (const c of unsyncedCustomers) await db.customers.update(c.id, { synced: 1, updatedAt: now });
        for (const u of unsyncedUsers) await db.users.update(u.id, { synced: 1, updatedAt: now });
      });

      setLastSync(Date.now());
      await checkUnsynced();
    } catch (error) {
      console.error('Lỗi đồng bộ:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Tự động đồng bộ khi online và có dữ liệu mới
  useEffect(() => {
    const autoSync = async () => {
      const total = await checkUnsynced();
      if (total > 0 && navigator.onLine && !isSyncing) {
        syncData();
      }
    };
    autoSync();
  }, [unsyncedCount.products, unsyncedCount.orders, unsyncedCount.customers, unsyncedCount.users]);

  return { 
    syncData, 
    isSyncing, 
    lastSync, 
    unsyncedCount, 
    totalUnsynced: unsyncedCount.products + unsyncedCount.orders + unsyncedCount.customers + unsyncedCount.users
  };
};
