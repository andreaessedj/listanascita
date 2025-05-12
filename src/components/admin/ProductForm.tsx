import { useState, useEffect } from 'react';
import { Product } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

// Omettiamo 'id' e 'contributedAmount' dal form
// Aggiungiamo un campo temporaneo per la textarea delle immagini aggiuntive
export type ProductFormData = Omit<Product, 'id' | 'contributedAmount' | 'imageUrls'> & {
  additionalImageUrlsText?: string; // Campo per la textarea
};

interface ProductFormProps {
  initialData?: Product | null;
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

const ProductForm = ({ initialData, onSubmit, onCancel, isLoading }: ProductFormProps) => {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    imageUrl: '',
    originalUrl: '',
    category: '',
    additionalImageUrlsText: '', // Inizializza la textarea
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        description: initialData.description || '',
        price: initialData.price,
        imageUrl: initialData.imageUrl || '',
        originalUrl: initialData.originalUrl || '',
        category: initialData.category || '',
        // Unisci gli URL aggiuntivi (escludendo il principale se già presente) in una stringa, uno per riga
        additionalImageUrlsText: (initialData.imageUrls || [])
          .filter(url => url !== initialData.imageUrl) // Opzionale: escludi il principale dalla textarea
          .join('\n'),
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: 0,
        imageUrl: '',
        originalUrl: '',
        category: '',
        additionalImageUrlsText: '',
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'price' ? parseFloat(value) || 0 : value }));
    if (errors[name as keyof ProductFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ProductFormData, string>> = {};
    if (!formData.name.trim()) newErrors.name = 'Il nome è obbligatorio.';
    if (formData.price < 0) newErrors.price = 'Il prezzo non può essere negativo.';
    // Potremmo aggiungere validazione per gli URL nella textarea qui, ma per ora la saltiamo
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nome, Descrizione, Prezzo (invariati) */}
       <div>
        <Label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome Prodotto</Label>
        <Input id="name" name="name" value={formData.name} onChange={handleChange} className={`mt-1 block w-full ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
      </div>
      <div>
        <Label htmlFor="description" className="block text-sm font-medium text-gray-700">Descrizione</Label>
        <Textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3} className="mt-1 block w-full border-gray-300" />
      </div>
      <div>
        <Label htmlFor="price" className="block text-sm font-medium text-gray-700">Prezzo (€)</Label>
        <Input id="price" name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} className={`mt-1 block w-full ${errors.price ? 'border-red-500' : 'border-gray-300'}`} />
        {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price}</p>}
      </div>

      {/* URL Immagine Principale */}
      <div>
        <Label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">URL Immagine Principale</Label>
        <Input id="imageUrl" name="imageUrl" value={formData.imageUrl} onChange={handleChange} className="mt-1 block w-full border-gray-300" placeholder="https://esempio.com/immagine_principale.jpg" />
      </div>

      {/* URL Immagini Aggiuntive */}
      <div>
        <Label htmlFor="additionalImageUrlsText" className="block text-sm font-medium text-gray-700">URL Immagini Aggiuntive (una per riga)</Label>
        <Textarea
          id="additionalImageUrlsText"
          name="additionalImageUrlsText"
          value={formData.additionalImageUrlsText}
          onChange={handleChange}
          rows={4}
          className="mt-1 block w-full border-gray-300"
          placeholder="https://esempio.com/foto1.jpg&#10;https://esempio.com/foto2.jpg&#10;https://esempio.com/foto3.jpg"
        />
         <p className="mt-1 text-xs text-gray-500">Incolla qui gli URL delle altre immagini, uno per ogni riga.</p>
      </div>

      {/* URL Originale, Categoria (invariati) */}
       <div>
        <Label htmlFor="originalUrl" className="block text-sm font-medium text-gray-700">URL Originale Prodotto</Label>
        <Input id="originalUrl" name="originalUrl" value={formData.originalUrl} onChange={handleChange} className="mt-1 block w-full border-gray-300" placeholder="https://sito-negozio.com/prodotto" />
      </div>
      <div>
        <Label htmlFor="category" className="block text-sm font-medium text-gray-700">Categoria</Label>
        <Input id="category" name="category" value={formData.category} onChange={handleChange} className="mt-1 block w-full border-gray-300" placeholder="Es. Passeggio, Nanna, Pappa" />
      </div>

      {/* Pulsanti (invariati) */}
      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Annulla</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (initialData ? 'Salvataggio...' : 'Creazione...') : (initialData ? 'Salva Modifiche' : 'Crea Prodotto')}
        </Button>
      </div>
    </form>
  );
};

export default ProductForm;