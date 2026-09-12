export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  document: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
};

export type CustomerPurchase = {
  id: string;
  total: string;
  createdAt: string;
  items: { productName: string; quantity: string }[];
};
