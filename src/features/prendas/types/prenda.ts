export interface Prenda {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  service_id: string | null;
  service?: { id: string; name: string; active: boolean } | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePrenda {
  code: string;
  name: string;
  description?: string;
  price: number;
  service_id: string;
}

export interface UpdatePrenda {
  code: string;
  name: string;
  description?: string;
  price: number;
  service_id: string;
  active: boolean;
}
