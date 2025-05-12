export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string; // Reso opzionale
  contributedAmount: number;
  category?: string;
  originalUrl?: string;
}