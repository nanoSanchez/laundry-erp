export interface Cliente {
  id: string;
  phone: string;
  name: string;
  observations: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCliente {
  phone: string;
  name: string;
  observations?: string;
}

export interface UpdateCliente {
  phone: string;
  name: string;
  observations?: string;
  active: boolean;
}
