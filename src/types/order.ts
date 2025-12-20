export type OrderStatus = 'pending' | 'processing' | 'ready' | 'completed' | 'cancelled';

export interface OrderFile {
  id: string;
  order_id: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  copies: number;
  color_mode: 'color' | 'bw' | string | null;
  size: string | null;
  price_per_copy: number;
  created_at: string;
}

export interface OrderAudit {
  id: string;
  order_id: string;
  user_id: string | null;
  action: string;
  details: any | null;
  created_at: string;
}

export interface ClientProfile {
  first_name: string | null;
  last_name: string | null;
}

export interface LocalOrder {
  id: string;
  client_id: string;
  local_id: string;
  status: OrderStatus;
  total_price: number;
  points_earned: number;
  created_at: string;
  updated_at: string;
  profiles: ClientProfile;
  order_files: OrderFile[];
  order_audit: OrderAudit[];
}