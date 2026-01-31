
import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../db';
import { useStore } from '../store';

// Helper to convert Base64/DataURL to Blob for File Upload
const dataURLtoBlob = (dataurl: string) => {
  try {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) return null;
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    return null;
  }
};

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
      return Object.values(counts).reduce((a, b) => (a as number) + (b as number), 0);
    } catch (err) {
      return 0;
    }
  }, [setUnsyncedCount]);

  const checkDependenciesSynced = useCallback(async (tableName: string, item: any) => {
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
  }, []);

  const syncCollection = useCallback(async (tableName: string, collectionName: string, currentLastSync: number | null): Promise<boolean> => {
    if (!backendUrl) return false;
    const table = (db as any)[tableName];
    let hasChanges = false;
    
    // 1. PUSH LOCAL TO REMOTE
    const allLocalUnsynced = await table.where('synced').equals(0).toArray();
    for (const item of allLocalUnsynced) {
      try {
        const { synced, deleted, updatedAt, createdAt, id: localId, ...rawPayload } = item;
        
        if (deleted === 1) {
          const deleteResp = await fetch(`${backendUrl}/api/collections/${collectionName}/records/${localId}`, { method: 'DELETE' });
          if (deleteResp.ok || deleteResp.status === 404) {
            await table.delete(localId);
            hasChanges = true;
          }
          continue;
        }

        const cleanPayload: any = {};
        let skipPush = false;
        let containsFile = false;

        Object.keys(rawPayload).forEach(key => {
          const value = rawPayload[key];
          
          if (['groupId', 'typeId', 'productId', 'priceTypeId', 'customerId'].includes(key)) {
             if (value && String(value).length !== 15 && value !== 'walk-in') {
                skipPush = true;
             }
          }

          if (value !== undefined && value !== null && value !== "") {
            cleanPayload[key] = value;
            // Phát hiện trường hình ảnh Base64
            if (key === 'image' && typeof value === 'string' && value.startsWith('data:image')) {
              containsFile = true;
            }
          } else if (typeof value === 'number' || typeof value === 'boolean') {
            cleanPayload[key] = value;
          }
        });

        if (skipPush) continue;

        const isReady = await checkDependenciesSynced(tableName, item);
        if (!isReady) continue;

        const checkResp = await fetch(`${backendUrl}/api/collections/${collectionName}/records/${localId}`);
        const exists = checkResp.ok;
        
        const url = exists 
          ? `${backendUrl}/api/collections/${collectionName}/records/${localId}` 
          : `${backendUrl}/api/collections/${collectionName}/records`;
        
        const method = exists ? 'PATCH' : 'POST';
        
        let requestOptions: RequestInit = {
          method,
        };

        if (containsFile) {
          // Sử dụng FormData nếu có file
          const formData = new FormData();
          if (method === 'POST') formData.append('id', localId);
          
          Object.keys(cleanPayload).forEach(key => {
            if (key === 'image' && cleanPayload[key].startsWith('data:image')) {
              const blob = dataURLtoBlob(cleanPayload[key]);
              if (blob) {
                formData.append(key, blob, `image_${localId}.png`);
              }
            } else {
              formData.append(key, String(cleanPayload[key]));
            }
          });
          requestOptions.body = formData;
          // Note: Browser tự động set Content-Type: multipart/form-data khi dùng FormData
        } else {
          // Sử dụng JSON thông thường
          requestOptions.headers = { 'Content-Type': 'application/json' };
          requestOptions.body = JSON.stringify(method === 'POST' ? { id: localId, ...cleanPayload } : cleanPayload);
        }

        const response = await fetch(url, requestOptions);

        if (response.ok) {
          await table.update(localId, { synced: 1 });
          hasChanges = true;
        } else {
          const errorInfo = await response.json();
          console.error(`[PocketBase Error ${response.status}] ${collectionName} fail:`, {
            id: localId,
            message: errorInfo.message,
            validationErrors: errorInfo.data,
            sentPayload: cleanPayload
          });
        }
      } catch (err) {
        console.error(`[Sync Push] Lỗi kết nối khi đẩy ${collectionName}:`, err);
      }
    }

    // 2. PULL REMOTE TO LOCAL
    try {
      const lastSyncISO = currentLastSync 
        ? new Date(currentLastSync).toISOString().replace('T', ' ').split('.')[0] 
        : '2000-01-01 00:00:00';
      
      const pullUrl = `${backendUrl}/api/collections/${collectionName}/records?filter=(updated > "${lastSyncISO}")&perPage=500`;
      const resp = await fetch(pullUrl);
      
      if (resp.ok) {
        const result = await resp.json();
        if (result.items.length > 0) {
          for (const record of result.items) {
            const local = await table.get(record.id);
            const remoteTs = new Date(record.updated).getTime();
            
            if (!local || remoteTs > (local.updatedAt || 0)) {
              // Xử lý URL ảnh từ PocketBase nếu cần
              const processedRecord = { ...record };
              if (record.image && !record.image.startsWith('data:')) {
                // Để đơn giản, ta giữ nguyên tên file. UI sẽ tự ghép URL server nếu cần.
              }

              await table.put({ 
                ...processedRecord, 
                synced: 1, 
                deleted: 0, 
                updatedAt: remoteTs,
                createdAt: record.created ? new Date(record.created).getTime() : Date.now()
              });
              hasChanges = true;
            }
          }
        }
      }
    } catch (err) {
      console.error(`[Sync Pull] Lỗi tải dữ liệu ${collectionName}:`, err);
    }
    
    return hasChanges;
  }, [backendUrl, checkDependenciesSynced]);

  const syncData = useCallback(async () => {
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
        const changed = await syncCollection(col.t, col.c, lastSync);
        if (changed) anyCollectionChanged = true;
      }

      const now = Date.now();
      setLastSync(now);
      localStorage.setItem('last_sync_ts', now.toString());
      
      await checkUnsynced();
      
      if (anyCollectionChanged) {
        await fetchInitialData();
      }
    } catch (error) {
      console.error('Critical Sync Failure:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, backendUrl, lastSync, checkServerHealth, syncCollection, checkUnsynced, fetchInitialData]);

  useEffect(() => {
    checkUnsynced();
    checkServerHealth();

    countTimerRef.current = setInterval(() => {
      checkUnsynced();
    }, 5000);

    syncTimerRef.current = setInterval(() => {
      syncData();
    }, 20000); 

    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
      if (countTimerRef.current) clearInterval(countTimerRef.current);
    };
  }, [checkServerHealth, checkUnsynced, syncData]);

  return { 
    syncData, isSyncing, isServerOnline, lastSync, unsyncedCount, checkUnsynced,
    totalUnsynced: (Object.values(unsyncedCount) as number[]).reduce((a, b) => (a as number) + (b as number), 0)
  };
};
