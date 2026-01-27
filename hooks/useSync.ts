
import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import { useStore } from '../store';
import { Dexie } from 'dexie';

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
      const resp = await fetch(`${backendUrl}/api/health`, { signal: controller.signal });
      clearTimeout(id);
      setIsServerOnline(resp.ok);
      return resp.ok;
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
    const table = (db as any)[tableName];
    
    // 1. Push: Đẩy dữ liệu cục bộ chưa đồng bộ lên server
    const unsynced = await table.where('synced').equals(0).toArray();
    for (const item of unsynced) {
      try {
        const checkResp = await fetch(`${backendUrl}/api/collections/${collectionName}/records/${item.id}`);
        const exists = checkResp.ok;
        const method = exists ? 'PATCH' : 'POST';
        const url = exists ? `${backendUrl}/api/collections/${collectionName}/records/${item.id}` : `${backendUrl}/api/collections/${collectionName}/records`;

        const { synced, ...payload } = item;
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) await table.update(item.id, { synced: 1 });
      } catch (err) { console.warn(`Push failed: ${collectionName}`, err); }
    }

    // 2. Pull: Lấy dữ liệu mới từ server về
    const filter = lastSync ? `updatedAt > ${lastSync}` : '';
    const url = `${backendUrl}/api/collections/${collectionName}/records?filter=${encodeURIComponent(filter)}&perPage=500`;
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        for (const record of data.items) {
          const local = await table.get(record.id);
          if (!local || record.updatedAt > local.updatedAt) {
            await table.put({ ...record, synced: 1 });
          }
        }
      }
    } catch (err) { console.error(`Pull failed: ${collectionName}`, err); }
  };

  const syncData = async () => {
    if (isSyncing || !backendUrl) return;
    if (!(await checkServerHealth())) return;

    setIsSyncing(true);
    try {
      // Map local tables to PocketBase collections
      await syncCollection('products', 'products');
      await syncCollection('orders', 'orders');
      await syncCollection('customers', 'customers');
      await syncCollection('users', 'profiles'); // Map users to profiles collection

      const now = Date.now();
      setLastSync(now);
      localStorage.setItem('last_sync_ts', now.toString());
      await checkUnsynced();
    } catch (error) {
      console.error('Sync process error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    checkUnsynced();
    const interval = setInterval(() => {
      checkUnsynced();
      if (isServerOnline) syncData();
    }, 60000); 
    return () => clearInterval(interval);
  }, [isServerOnline]);

  return { 
    syncData, isSyncing, isServerOnline, lastSync, unsyncedCount,
    totalUnsynced: (Object.values(unsyncedCount) as number[]).reduce((a, b) => a + b, 0)
  };
};
