
export enum TransactionType {
  DEBT = 'DEBT',
  PAYMENT = 'PAYMENT'
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  dueDate?: string; // ISO date string for when the debt should be settled
  imageUrl?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  avatarUrl?: string;
  transactions: Transaction[];
  createdAt: string;
}

export interface AppState {
  clients: Client[];
  selectedClientId: string | null;
}
