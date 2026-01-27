
export interface BaseEntity {
  id: string;
  updatedAt: number;
  synced: number; // 0: no, 1: yes
  deleted: number; // 0: no, 1: yes
}

export type UserRole = 'admin' | 'staff';

export interface User extends BaseEntity {
  username: string;
  passwordHash: string;
  passwordSalt: string; 
  fullName: string;
  role: UserRole;
  lastLogin?: number;
}

// Added Bank interface to fix import errors in Settings.tsx
export interface Bank {
  id: string;
  name: string;
  logo: string;
  shortName: string;
  code: string;
}

export interface StoreConfig {
  name: string;
  address: string;
  phone: string;
  costPriceTypeId: string;
  lowStockThreshold?: number;
  bankId?: string;
  bankAccount?: string;
  bankAccountName?: string;
  printerName?: string;
  printerIp?: string;
  printerPort?: number;
  printerType?: 'wired' | 'wireless';
  printerAutoPrint?: boolean;
  printerPaperSize?: '58mm' | '80mm' | 'A4';
  printerCopies?: number;
  syncKey?: string; 
  backendUrl?: string; // URL của PocketBase (VD: http://192.168.1.50:8090)
}

export interface Product extends BaseEntity {
  name: string;
  code: string;
  barcode: string;
  image?: string;
  groupId: string;
  unit: string;
  lineId: string;
  stock: number;
  createdAt: number;
}

export interface ProductGroup extends BaseEntity {
  name: string;
}

export interface PriceType extends BaseEntity {
  name: string;
}

export interface CustomerType {
  id: string;
  name: string;
  defaultPriceTypeId: string;
}

export interface ProductPrice extends BaseEntity {
  productId: string;
  priceTypeId: string;
  price: number;
}

export interface Customer extends BaseEntity {
  name: string;
  phone: string;
  birthday: string;
  address: string;
  facebook: string;
  typeId: string; 
  isLoyal: boolean; 
  totalSpent: number; 
  orderCount: number; 
}

export interface LoyaltyConfig {
  id: string;
  minSpend: number;
  minOrders: number;
  enabled: boolean;
}

export interface Order extends BaseEntity {
  customerId: string;
  discount: number;
  discountType: 'percentage' | 'amount';
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
  items: OrderItem[];
  paymentMethod: 'cash' | 'qr';
  cashReceived: number;
  changeAmount: number;
  subTotal: number;
  discountAmt: number;
  customerName?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  qty: number;
  price: number;
  total: number;
  name?: string;
}

export interface Purchase extends BaseEntity {
  supplierName: string;
  total: number;
  items: PurchaseItem[];
  createdAt: number;
}

export interface PurchaseItem {
  id: string;
  productId: string;
  qty: number;
  cost: number;
  total: number;
  name?: string;
}