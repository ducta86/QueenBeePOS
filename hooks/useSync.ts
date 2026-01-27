
import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import { useStore } from '../store';

export const useSync = () => {
  const { storeConfig, fetchInitialData } = useStore();
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
      const resp = await fetch(`${backendUrl}/api/collections/profiles/records?perPage=1`, { signal: controller.signal });
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
    
    const unsynced = await table.where('synced').equals(0).toArray();
    for (const item of unsynced) {
      try {
        const { synced, deleted, id: localId, ...payload } = item;
        
        // Kiểm tra xem ID cục bộ có đúng định dạng PocketBase (15 ký tự, alphanumeric) không
        const isIdValid = /^[a-z0-9]{15}$/.test(localId);
        
        let exists = false;
        if (isIdValid) {
          const checkResp = await fetch(`${backendUrl}/api/collections/${collectionName}/records/${localId}`);
          exists = checkResp.ok;
        }

        const url = exists 
          ? `${backendUrl}/api/collections/${collectionName}/records/${localId}` 
          : `${backendUrl}/api/collections/${collectionName}/records`;

        const method = exists ? 'PATCH' : 'POST';
        
        // Nếu ID không hợp lệ định dạng PB, chúng ta bỏ qua trường id khi POST để PB tự sinh ID mới
        const body = method === 'POST' && !isIdValid ? payload : { id: localId, ...payload };

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (response.ok) {
          const remoteRecord = await response.json();
          
          // Nếu PB sinh ID mới (do ID cũ sai định dạng), chúng ta cần cập nhật ID cục bộ
          if (!exists && remoteRecord.id !== localId) {
            await table.delete(localId);
            await table.put({ ...remoteRecord, synced: 1, updatedAt: new Date(remoteRecord.updated).getTime(), deleted: 0 });
            console.log(`[Sync] ID Migrated: ${localId} -> ${remoteRecord.id}`);
          } else {
            await table.update(localId, { synced: 1 });
          }
        } else {
          const errData = await response.json();
          console.error(`[Sync Error] ${collectionName}:`, errData);
        }
      } catch (err) {
        console.warn(`[Sync Error] ${collectionName}:`, err);
      }
    }

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
              deleted: 0
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
    if (!isOnline) return;

    setIsSyncing(true);
    try {
      await syncCollection('users', 'profiles');
      await syncCollection('products', 'products');
      await syncCollection('customers', 'customers');
      await syncCollection('orders', 'orders');

      const now = Date.now();
      setLastSync(now);
      localStorage.setItem('last_sync_ts', now.toString());
      await checkUnsynced();
      await fetchInitialData(); // Làm mới dữ liệu store sau khi Migration ID
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    checkUnsynced();
    checkServerHealth();
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
