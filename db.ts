
import { Dexie, type Table } from 'dexie';
import { Product, ProductPrice, PriceType, Customer, CustomerType, Order, Purchase, ProductGroup, User } from './types';
import { argon2id } from 'hash-wasm';

// Hàm tạo ID tương thích hoàn toàn với PocketBase (15 ký tự, a-z0-9)
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
    (this as Dexie).version(10).stores({ 
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
      id: 'admin0000000001', // Đổi về 15 ký tự
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

  const count = await db.priceTypes.count();
  if (count === 0) {
    const p1 = 'retail000000001';
    const p2 = 'wholesal0000001';
    
    await db.priceTypes.bulkPut([
      { id: p1, name: 'Giá bán lẻ', synced: 1, updatedAt: Date.now(), deleted: 0 },
      { id: p2, name: 'Giá bán sỉ', synced: 1, updatedAt: Date.now(), deleted: 0 }
    ]);

    await db.productGroups.bulkPut([
      { id: 'group0000000001', name: 'Điện thoại', synced: 1, updatedAt: Date.now(), deleted: 0 },
      { id: 'group0000000002', name: 'Laptop', synced: 1, updatedAt: Date.now(), deleted: 0 },
      { id: 'group0000000003', name: 'Phụ kiện', synced: 1, updatedAt: Date.now(), deleted: 0 }
    ]);

    const ct1 = 'type00000000001';
    const ct2 = 'type00000000002';

    await db.customerTypes.bulkPut([
      { id: ct1, name: 'Khách lẻ', defaultPriceTypeId: p1 },
      { id: ct2, name: 'Khách VIP', defaultPriceTypeId: p2 }
    ]);

    const sampleProdId = 'prod00000000001';
    await db.products.put({
      id: sampleProdId,
      name: 'iPhone 15 Pro Max',
      code: 'IP15PM',
      barcode: '88888888',
      image: 'https://images.unsplash.com/photo-1696446701796-da61225697cc?w=400',
      groupId: 'group0000000001',
      unit: 'Cái',
      lineId: 'apple',
      stock: 50,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      synced: 1,
      deleted: 0
    });

    await db.productPrices.bulkPut([
      { id: 'price0000000001', productId: sampleProdId, priceTypeId: p1, price: 34000000, synced: 1, updatedAt: Date.now(), deleted: 0 },
      { id: 'price0000000002', productId: sampleProdId, priceTypeId: p2, price: 32000000, synced: 1, updatedAt: Date.now(), deleted: 0 }
    ]);

    await db.customers.put({
      id: 'cust00000000001',
      name: 'Nguyễn Văn A',
      phone: '0901234567',
      birthday: '',
      address: '',
      facebook: '',
      typeId: ct1,
      isLoyal: false,
      totalSpent: 0,
      orderCount: 0,
      updatedAt: Date.now(),
      synced: 1,
      deleted: 0
    });
  }
};
