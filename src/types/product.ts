export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string; // Immagine principale/thumbnail
  imageUrls?: string[]; // Array di URL per immagini aggiuntive
  contributedAmount: number;
  category?: string;
  originalUrl?: string;
}