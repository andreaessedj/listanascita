export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl: string;
  contributedAmount: number;
  category?: string; // e.g., "Passeggio", "Pappa", "Nanna"
}