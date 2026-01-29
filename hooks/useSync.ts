
import { useState, useEffect, useCallback, useRef } from 'react';
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
    products: 0, 
    orders: 0, 
    customers: 0, 
    users: 0, 
    purchases: 0,
    priceTypes: 0, 
    productGroups: 0, 
    productPrices: 0
  });

  const syncTimerRef = useRef<any>(null);
  const backendUrl = storeConfig.backendUrl?.replace(/\/$/, '');

  const checkServerHealth = useCallback(async () => {
    if (!backendUrl) return false;
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);
      const resp = await fetch(`${backendUrl}/api/collections/profiles/records?perPage=1`, { 
        signal: controller.signal 
      });
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
    const puCount = await db.purchases.where('synced').equals(0).count();
    const ptCount = await db.priceTypes.where('synced').equals(0).count();
    const pgCount = await db.productGroups.where('synced').equals(0).count();
    const ppCount = await db.productPrices.where('synced').equals(0).count();
    
    const counts = { 
      products: pCount, 
      orders: oCount, 
      customers: cCount, 
      users: uCount,
      purchases: puCount,
      priceTypes: ptCount,
      productGroups: pgCount, 
      productPrices: ppCount  
    };
    
    setUnsyncedCount(counts);
    return (Object.values(counts) as number[]).reduce((a: number, b: number) => a + b, 0);
  }, []);

  const syncCollection = async (tableName: string, collectionName: string) => {
    if (!backendUrl) return;
    const table = (db as any)[tableName];
    
    const allLocalUnsynced = await table.where('synced').equals(0).toArray();
    
    for (const item of allLocalUnsynced) {
      try {
        const { synced, deleted, id: localId, ...payload } = item;
        
        if (deleted === 1) {
          const deleteResp = await fetch(`${backendUrl}/api/collections/${collectionName}/records/${localId}`, {
            method: 'DELETE'
          });
          if (deleteResp.ok || deleteResp.status === 404) {
            await table.delete(localId);
          }
          continue;
        }

        const checkResp = await fetch(`${backendUrl}/api/collections/${collectionName}/records/${localId}`);
        const exists = checkResp.ok;

        const url = exists 
          ? `${backendUrl}/api/collections/${collectionName}/records/${localId}` 
          : `${backendUrl}/api/collections/${collectionName}/records`;

        const method = exists ? 'PATCH' : 'POST';
        const body = method === 'POST' ? { id: localId, ...payload } : payload;

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (response.ok) {
          await table.update(localId, { synced: 1 });
        }
      } catch (err) {
        console.warn(`[Sync Item Error] ${collectionName}:`, err);
      }
    }

    try {
      const lastSyncISO = lastSync ? new Date(lastSync).toISOString().replace('T', ' ').split('.')[0] : '2000-01-01 00:00:00';
      const pullUrl = `${backendUrl}/api/collections/${collectionName}/records?filter=(updated > "${lastSyncISO}")&perPage=500`;
      const resp = await fetch(pullUrl);
      if (resp.ok) {
        const result = await resp.json();
        for (const record of result.items) {
          const local = await table.get(record.id);
          const remoteTs = new Date(record.updated).getTime();
          if (!local || remoteTs > (local.updatedAt || 0)) {
            await table.put({ ...record, synced: 1, deleted: 0 });
          }
        }
      }
    } catch (err) {
      console.error(`[Pull Error] ${collectionName}:`, err);
    }
  };

  const syncData = async () => {
    if (isSyncing || !backendUrl) return;
    const isOnline = await checkServerHealth();
    if (!isOnline) return;

    setIsSyncing(true);
    try {
      await syncCollection('priceTypes', 'price_types');
      await syncCollection('productGroups', 'product_groups');
      await syncCollection('products', 'products');
      await syncCollection('productPrices', 'product_prices');
      await syncCollection('customers', 'customers');
      await syncCollection('users', 'profiles');
      await syncCollection('orders', 'orders');
      await syncCollection('purchases', 'purchases');

      const now = Date.now();
      setLastSync(now);
      localStorage.setItem('last_sync_ts', now.toString());
      await checkUnsynced();
      await fetchInitialData();
    } catch (error) {
      console.error('Sync process failed:', error);
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
        if ((count as number) > 0) await syncData();
      }
    }, 15000); 

    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, [checkServerHealth, syncData, checkUnsynced]);

  return { 
    syncData, 
    isSyncing, 
    isServerOnline, 
    lastSync, 
    unsyncedCount,
    totalUnsynced: (Object.values(unsyncedCount) as number[]).reduce((a: number, b: number) => a + b, 0)
  };
};
