export interface Service {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateService {
  code: string;
  name: string;
  description?: string;
  price: number;
}

export interface UpdateService {
  code: string;
  name: string;
  description?: string;
  price: number;
  active: boolean;
}
