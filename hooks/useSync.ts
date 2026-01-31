
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

  const checkDependenciesSynced = async (tableName: string, item: any) => {
    const deps: Record<string, { table: any, field: string }[]> = {
      'products': [{ table: db.productGroups, field: 'groupId' }],
      'customers': [{ table: db.priceTypes, field: 'typeId' }],
      'productPrices': [
        { table: db.products, field: 'productId' },
        { table: db.priceTypes, field: 'priceTypeId' }
      ],
      'orders': [{ table: db.customers, field: 'customerId' }]
    };

    const config = deps[tableName];
    if (!config) return true;

    for (const d of config) {
      const depId = item[d.field];
      if (!depId || depId === 'walk-in') continue;

      const parentRecord = await d.table.get(depId);
      if (!parentRecord || parentRecord.synced === 0) {
        return false;
      }
    }
    return true;
  };

  const syncCollection = async (tableName: string, collectionName: string): Promise<boolean> => {
    if (!backendUrl) return false;
    const table = (db as any)[tableName];
    let hasChanged = false;
    
    // 1. PUSH LOCAL TO REMOTE
    const allLocalUnsynced = await table.where('synced').equals(0).toArray();
    for (const item of allLocalUnsynced) {
      try {
        const { synced, deleted, updatedAt, createdAt, id: localId, ...rawPayload } = item;
        
        if (deleted === 1) {
          const deleteResp = await fetch(`${backendUrl}/api/collections/${collectionName}/records/${localId}`, { method: 'DELETE' });
          if (deleteResp.ok || deleteResp.status === 404) {
            await table.delete(localId);
            hasChanged = true;
          }
          continue;
        }

        const cleanPayload: any = {};
        let hasInvalidRelation = false;

        Object.keys(rawPayload).forEach(key => {
          const value = rawPayload[key];
          if (['priceTypeId', 'productId', 'customerId', 'groupId', 'typeId'].includes(key)) {
             if (value && String(value).length !== 15 && value !== 'walk-in') {
                hasInvalidRelation = true;
             }
          }
          if (value !== "") cleanPayload[key] = value;
        });

        if (hasInvalidRelation) continue;

        const isReady = await checkDependenciesSynced(tableName, item);
        if (!isReady) continue; 

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
          hasChanged = true;
        }
      } catch (err) {
        console.error(`Push error for ${collectionName}:`, err);
      }
    }

    // 2. PULL REMOTE TO LOCAL
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
            hasChanged = true;
          }
        }
      }
    } catch (err) {
      console.error(`Pull failed for ${collectionName}:`, err);
    }
    
    return hasChanged;
  };

  const syncData = async () => {
    if (isSyncing || !backendUrl) return;
    const isOnline = await checkServerHealth();
    if (!isOnline) return;

    setIsSyncing(true);
    let anyCollectionChanged = false;
    try {
      const collections = [
        { t: 'priceTypes', c: 'price_types' },
        { t: 'productGroups', c: 'product_groups' },
        { t: 'users', c: 'profiles' },
        { t: 'products', c: 'products' },
        { t: 'customers', c: 'customers' },
        { t: 'productPrices', c: 'product_prices' },
        { t: 'orders', c: 'orders' },
        { t: 'purchases', c: 'purchases' }
      ];

      for (const col of collections) {
        const changed = await syncCollection(col.t, col.c);
        if (changed) anyCollectionChanged = true;
      }

      const now = Date.now();
      setLastSync(now);
      localStorage.setItem('last_sync_ts', now.toString());
      await checkUnsynced();
      
      // Nếu có bất kỳ thay đổi nào từ phía DB (đẩy lên thành công hoặc kéo dữ liệu mới về)
      // thì phải làm mới State của ứng dụng để giao diện cập nhật ngay lập tức.
      if (anyCollectionChanged) {
        await fetchInitialData();
      }
    } catch (error) {
      console.error('Critical Sync Failure:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    checkUnsynced();
    checkServerHealth();

    // Kiểm tra số lượng chưa đồng bộ thường xuyên hơn (3s)
    countTimerRef.current = setInterval(() => {
      checkUnsynced();
    }, 3000);

    // Tự động đồng bộ thường xuyên hơn (20s) để các máy khác thấy dữ liệu nhanh hơn
    syncTimerRef.current = setInterval(async () => {
      const online = await checkServerHealth();
      if (online) {
        // Luôn chạy syncData để Pull dữ liệu mới từ máy khác về nếu có
        await syncData();
      }
    }, 20000); 

    return () => {
      clearInterval(syncTimerRef.current);
      clearInterval(countTimerRef.current);
    };
  }, [checkServerHealth, checkUnsynced, backendUrl, syncData]);

  return { 
    syncData, isSyncing, isServerOnline, lastSync, unsyncedCount, checkUnsynced,
    totalUnsynced: (Object.values(unsyncedCount) as number[]).reduce((a, b) => a + b, 0)
  };
};
