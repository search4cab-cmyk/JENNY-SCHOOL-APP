export type UserRole = 'SUPER_ADMIN' | 'ESTATE_MANAGER' | 'ACCOUNT_OFFICER' | 'VIEW_ONLY';

export interface Estate {
  id: string;
  estate_name: string;
  address: string | null;
  created_at: string;
}

export interface UserRoleMapping {
  user_id: string;
  estate_id: string;
  role: UserRole;
  created_at: string;
}

export interface Landlord {
  id: string;
  estate_id: string;
  landlord_name: string;
  compound_name: string;
  phone_number: string | null;
  monthly_levy: number;
  status: string;
  created_at: string;
}

export interface Payment {
  id: string;
  landlord_id: string;
  payment_month: string;
  payment_year: string;
  amount_paid: number;
  payment_date: string;
  receipt_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface AuthSession {
  user: {
    id: string;
    email?: string;
    full_name?: string;
  };
  role: UserRole;
  estate_id: string;
}
