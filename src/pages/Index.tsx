import ProductCard from '@/components/ProductCard';
import { Product } from '@/types/product';
import { Baby, Heart } from 'lucide-react';
import { showSuccess } from '@/utils/toast'; // Importa la funzione per i toast

// Dati di esempio per i prodotti
const sampleProducts: Product[] = [
  {
    id: '1',
    name: 'Passeggino Trio',
    description: 'Un passeggino versatile per tutte le avventure.',
    price: 550,
    imageUrl: 'https://images.unsplash.com/photo-1586059304348-0532101a48f7?q=80&w=800&auto=format&fit=crop',
    contributedAmount: 150,
    category: 'Passeggio',
  },
  {
    id: '2',
    name: 'Culla Next2Me',
    description: 'Per sogni d\'oro accanto a mamma e papà.',
    price: 220,
    imageUrl: 'https://images.unsplash.com/photo-1604834800608-7cd6cf320c80?q=80&w=800&auto=format&fit=crop',
    contributedAmount: 220,
    category: 'Nanna',
  },
  {
    id: '3',
    name: 'Seggiolone Pappa',
    description: 'Comodo e pratico per le prime pappe.',
    price: 180,
    imageUrl: 'https://images.unsplash.com/photo-1604834800608-7cd6cf320c80?q=80&w=800&auto=format&fit=crop', // Placeholder, da cambiare
    contributedAmount: 50,
    category: 'Pappa',
  },
  {
    id: '4',
    name: 'Set Lenzuolini',
    description: 'Morbidi lenzuolini per il lettino.',
    price: 70,
    imageUrl: 'https://images.unsplash.com/photo-1599507533901-068f2bab0f00?q=80&w=800&auto=format&fit=crop',
    contributedAmount: 10,
    category: 'Nanna',
  },
];

const Index = () => {
  const handleContribute = (productId: string, method: string) => {
    // Logica di contribuzione (placeholder)
    console.log(`Contributo per prodotto ${productId} con metodo ${method}`);
    // Mostra un toast di successo (esempio)
    showSuccess(`Hai selezionato ${method} per il prodotto! (Funzionalità in sviluppo)`);
    // Qui in futuro si aprirebbe un modale o si reindirizzerebbe al pagamento
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 text-gray-700">
      <header className="py-8 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg mb-2">
          <Heart className="h-8 w-8 text-pink-400" />
        </div>
        <h1 className="text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-blue-600">
          Ilaria & Andrea
        </h1>
        <p className="mt-2 text-2xl text-gray-600">Vi Presentano</p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm rounded-lg shadow">
          <Baby className="h-10 w-10 text-blue-500" />
          <p className="text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-pink-500">
            Figlio/a
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-semibold text-center mb-10 text-gray-700">La Nostra Lista Nascita</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sampleProducts.map((product) => (
            <ProductCard key={product.id} product={product} onContribute={handleContribute} />
          ))}
        </div>
      </main>

      <footer className="py-8 text-center text-gray-500">
        <p>&copy; {new Date().getFullYear()} Ilaria & Andrea. Con amore.</p>
      </footer>
    </div>
  );
};

export default Index;