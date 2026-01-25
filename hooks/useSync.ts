
import { useState, useEffect } from 'react';
import { db } from '../db';
import { Dexie } from 'dexie';

export const useSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);

  const syncData = async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      // 1. Lấy tất cả dữ liệu chưa đồng bộ
      const unsyncedProducts = await db.products.where('synced').equals(0).toArray();
      const unsyncedOrders = await db.orders.where('synced').equals(0).toArray();
      const unsyncedCustomers = await db.customers.where('synced').equals(0).toArray();

      if (unsyncedProducts.length === 0 && unsyncedOrders.length === 0 && unsyncedCustomers.length === 0) {
        console.log('Mọi thứ đã được đồng bộ');
        setIsSyncing(false);
        return;
      }

      // 2. Gửi lên server (Mock API call)
      console.log('Đang gửi dữ liệu lên server...', { 
        products: unsyncedProducts.length, 
        orders: unsyncedOrders.length,
        customers: unsyncedCustomers.length
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      // 3. Cập nhật trạng thái synced trong Local DB
      // Explicitly casting the db instance to Dexie ensures the transaction method is correctly typed.
      await (db as Dexie).transaction('rw', [db.products, db.orders, db.customers], async () => {
        const now = Date.now();
        
        for (const p of unsyncedProducts) {
          await db.products.update(p.id, { synced: 1, updatedAt: now });
        }
        for (const o of unsyncedOrders) {
          await db.orders.update(o.id, { synced: 1, updatedAt: now });
        }
        for (const c of unsyncedCustomers) {
          await db.customers.update(c.id, { synced: 1, updatedAt: now });
        }
      });

      setLastSync(Date.now());
      console.log('Đồng bộ thành công!');
    } catch (error) {
      console.error('Lỗi đồng bộ:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return { syncData, isSyncing, lastSync };
};
