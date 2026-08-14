export interface Branch {
  id: string;
  code: string;
  name: string;
  company_name: string | null;
  nit: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  currency_code: string;
  is_active: boolean;
  logo_path: string | null;
}

export interface BranchInput {
  code: string;
  name: string;
  company_name: string | null;
  nit: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  currency_code: string;
}
