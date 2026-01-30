
import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../db';
import { useStore } from '../store';

export const useSync = () => {
  const backendUrl = useStore(state => state.storeConfig.backendUrl?.replace(/\/$/, ''));
  const fetchInitialData = useStore(state => state.fetchInitialData);
  const unsyncedCount = useStore(state => state.unsyncedCount);
  const setUnsyncedCount = useStore(state => state.setUnsyncedCount);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isServerOnline, setIsServerOnline] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(
    Number(localStorage.getItem('last_sync_ts')) || null
  );

  const syncTimerRef = useRef<any>(null);
  const countTimerRef = useRef<any>(null);

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
      
      setUnsyncedCount(counts);
      return Object.values(counts).reduce((a, b) => a + b, 0);
    } catch (err) {
      return 0;
    }
  }, [setUnsyncedCount]);

  const syncCollection = async (tableName: string, collectionName: string) => {
    if (!backendUrl) return;
    const table = (db as any)[tableName];
    
    const allLocalUnsynced = await table.where('synced').equals(0).toArray();
    for (const item of allLocalUnsynced) {
      try {
        const { synced, deleted, updatedAt, createdAt, id: localId, ...rawPayload } = item;
        
        if (deleted === 1) {
          const deleteResp = await fetch(`${backendUrl}/api/collections/${collectionName}/records/${localId}`, { method: 'DELETE' });
          if (deleteResp.ok || deleteResp.status === 404) {
            await table.delete(localId);
          }
          continue;
        }

        // --- KIỂM TRA ĐỊNH DẠNG ID RELATION TRƯỚC KHI GỬI ---
        const cleanPayload: any = {};
        let hasInvalidRelation = false;

        Object.keys(rawPayload).forEach(key => {
          const value = rawPayload[key];
          // PocketBase Relation IDs phải đúng 15 ký tự
          if (['priceTypeId', 'productId', 'customerId', 'groupId'].includes(key)) {
             if (value && String(value).length !== 15) {
                console.warn(`Sync Warning: Invalid Relation ID length for ${key} in ${collectionName}. Skipping record.`, value);
                hasInvalidRelation = true;
             }
          }
          if (value !== "") cleanPayload[key] = value;
        });

        if (hasInvalidRelation) continue;

        const checkResp = await fetch(`${backendUrl}/api/collections/${collectionName}/records/${localId}`);
        const exists = checkResp.ok;
        
        const url = exists 
          ? `${backendUrl}/api/collections/${collectionName}/records/${localId}` 
          : `${backendUrl}/api/collections/${collectionName}/records`;
        
        const method = exists ? 'PATCH' : 'POST';
        const body = method === 'POST' ? { id: localId, ...cleanPayload } : cleanPayload;

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (response.ok) {
          await table.update(localId, { synced: 1 });
        } else {
          const errData = await response.json();
          console.group(`Sync Error 400: ${collectionName}`);
          console.error("Message:", errData.message);
          console.error("Data:", errData.data);
          console.log("Payload:", body);
          console.groupEnd();
        }
      } catch (err) {
        console.error(`Network Error for ${collectionName}:`, err);
      }
    }

    // PULL DATA FROM SERVER
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
          
          if (!local || remoteTs > (local.updatedAt || 0)) {
            await table.put({ 
              ...record, 
              synced: 1, 
              deleted: 0, 
              updatedAt: remoteTs,
              createdAt: record.created ? new Date(record.created).getTime() : Date.now()
            });
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
      // Quan trọng: Phải đồng bộ các bảng "Cha" trước để tránh lỗi Relation trên Server
      await syncCollection('priceTypes', 'price_types');
      await syncCollection('productGroups', 'product_groups');
      await syncCollection('users', 'profiles');
      await syncCollection('products', 'products');
      await syncCollection('customers', 'customers');
      await syncCollection('productPrices', 'product_prices');
      await syncCollection('orders', 'orders');
      await syncCollection('purchases', 'purchases');

      const now = Date.now();
      setLastSync(now);
      localStorage.setItem('last_sync_ts', now.toString());
      await checkUnsynced();
      await fetchInitialData();
    } catch (error) {
      console.error('Critical Sync Failure:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    checkUnsynced();
    checkServerHealth();

    countTimerRef.current = setInterval(() => {
      checkUnsynced();
    }, 5000);

    syncTimerRef.current = setInterval(async () => {
      const online = await checkServerHealth();
      if (online) {
        const count = await checkUnsynced();
        if (count > 0) await syncData();
      }
    }, 60000); 

    return () => {
      clearInterval(syncTimerRef.current);
      clearInterval(countTimerRef.current);
    };
  }, [checkServerHealth, checkUnsynced, backendUrl]);

  return { 
    syncData, isSyncing, isServerOnline, lastSync, unsyncedCount, checkUnsynced,
    totalUnsynced: (Object.values(unsyncedCount) as number[]).reduce((a, b) => a + b, 0)
  };
};
