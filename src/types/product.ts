export interface EmbeddedContribution {
  contributor_name: string;
  contributor_surname: string;
  created_at: string;
  amount?: number; // Made amount optional
}

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
  createdAt?: string; // Aggiunto per l'ordinamento
  isPriority?: boolean; // Aggiunto per la segnalazione di priorità
  // Add the embedded contributions field
  contributions?: EmbeddedContribution[]; // Supabase embeds related data as an array
}