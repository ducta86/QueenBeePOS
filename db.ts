
import { Dexie, type Table } from 'dexie';
import { Product, ProductPrice, PriceType, Customer, CustomerType, Order, Purchase, ProductGroup, User } from './types';
import { argon2id } from 'hash-wasm';

// Hàm tạo ID tương thích hoàn toàn với PocketBase (BẮT BUỘC 15 ký tự, a-z0-9)
export const generateId = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 15; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const generateSalt = (): string => {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

const hexToUint8Array = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
};

export const hashPassword = async (password: string, saltHex: string): Promise<string> => {
  return argon2id({
    password: password,
    salt: hexToUint8Array(saltHex), 
    parallelism: 1,
    iterations: 3, 
    memorySize: 1024, 
    hashLength: 32,
    outputType: 'hex',
  });
};

export class POSDatabase extends Dexie {
  products!: Table<Product>;
  productPrices!: Table<ProductPrice>;
  priceTypes!: Table<PriceType>;
  productGroups!: Table<ProductGroup>;
  customers!: Table<Customer>;
  customerTypes!: Table<CustomerType>;
  orders!: Table<Order>;
  purchases!: Table<Purchase>;
  users!: Table<User>;

  constructor() {
    super('POSDatabase');
    // Version 11: Đảm bảo cấu trúc index cho đồng bộ
    (this as Dexie).version(11).stores({ 
      products: 'id, name, code, barcode, groupId, lineId, synced, updatedAt, deleted',
      productPrices: 'id, productId, priceTypeId, synced, updatedAt, deleted',
      priceTypes: 'id, name, synced, updatedAt, deleted',
      productGroups: 'id, name, synced, updatedAt, deleted',
      customers: 'id, name, phone, typeId, synced, updatedAt, deleted',
      customerTypes: 'id, name, defaultPriceTypeId',
      orders: 'id, customerId, status, synced, updatedAt, deleted',
      purchases: 'id, supplierName, createdAt, updatedAt, synced, deleted',
      users: 'id, username, role, synced, updatedAt, deleted'
    });
  }
}

export const db = new POSDatabase();

export const seedDatabase = async () => {
  const userCount = await db.users.count();
  if (userCount === 0) {
    const salt = generateSalt();
    const defaultPwHash = await hashPassword('user@123', salt);
    await db.users.put({
      id: 'admin0000000001', // 15 ký tự
      username: 'admin',
      passwordHash: defaultPwHash,
      passwordSalt: salt,
      fullName: 'Quản trị viên',
      role: 'admin',
      updatedAt: Date.now(),
      synced: 1,
      deleted: 0
    });
  }
  
  const ptCount = await db.priceTypes.count();
  if (ptCount === 0) {
    // Tạo sẵn loại giá mặc định với ID đúng 15 ký tự thay vì 'pt-retail'
    await db.priceTypes.add({
      id: 'pricetype000001',
      name: 'Giá bán lẻ',
      updatedAt: Date.now(),
      synced: 0,
      deleted: 0
    });
  }

  const ctCount = await db.customerTypes.count();
  if (ctCount === 0) {
    await db.customerTypes.bulkPut([
      { id: 'custype00000001', name: 'Khách lẻ', defaultPriceTypeId: 'pricetype000001' },
      { id: 'custype00000002', name: 'Khách VIP', defaultPriceTypeId: 'pricetype000001' }
    ]);
  }
};
