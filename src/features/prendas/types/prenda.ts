export interface Prenda {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePrenda {
  code: string;
  name: string;
  description?: string;
  price: number;
}

export interface UpdatePrenda {
  code: string;
  name: string;
  description?: string;
  price: number;
  active: boolean;
}
