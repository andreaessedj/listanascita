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
  // Rimosso: reservedByEmail?: string | null; // Email dell'utente che ha prenotato
  // Rimosso: reservedUntil?: string | null; // Timestamp di scadenza prenotazione
}