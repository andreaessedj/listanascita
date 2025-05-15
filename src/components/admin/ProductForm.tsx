import { useState, useEffect } from 'react';
import { Product } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch'; // Importa il componente Switch
import { Check } from 'lucide-react'; // Importa l'icona Check

// Omettiamo solo 'id' dal form, includiamo contributedAmount e isPriority
export type ProductFormData = Omit<Product, 'id'> & {
  additionalImageUrlsText?: string;
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
    imageUrls: [], // Inizializza come array vuoto
    contributedAmount: 0, // Includi contributedAmount
    originalUrl: '',
    category: '',
    isPriority: false, // Aggiungi isPriority con valore di default false
    additionalImageUrlsText: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        description: initialData.description || '',
        price: initialData.price,
        imageUrl: initialData.imageUrl || '',
        imageUrls: initialData.imageUrls || [],
        contributedAmount: initialData.contributedAmount, // Carica contributedAmount esistente
        originalUrl: initialData.originalUrl || '',
        category: initialData.category || '',
        isPriority: initialData.isPriority || false, // Carica isPriority esistente
        additionalImageUrlsText: (initialData.imageUrls || [])
          .filter(url => url !== initialData.imageUrl)
          .join('\n'),
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: 0,
        imageUrl: '',
        imageUrls: [],
        contributedAmount: 0, // Default a 0 per nuovi prodotti
        originalUrl: '',
        category: '',
        isPriority: false, // Default a false per nuovi prodotti
        additionalImageUrlsText: '',
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let parsedValue: string | number = value;
    if (name === 'price' || name === 'contributedAmount') {
      parsedValue = parseFloat(value) || 0; // Gestisci NaN come 0
      // Impedisci valori negativi per prezzo e contributo
      if (parsedValue < 0) {
        parsedValue = 0;
      }
    }

    setFormData(prev => ({ ...prev, [name]: parsedValue }));

    if (errors[name as keyof ProductFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handlePriorityChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isPriority: checked }));
  };


  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ProductFormData, string>> = {};
    if (!formData.name.trim()) newErrors.name = 'Il nome è obbligatorio.';
    if (formData.price < 0) newErrors.price = 'Il prezzo non può essere negativo.';
    if (formData.contributedAmount < 0) newErrors.contributedAmount = 'Il contributo non può essere negativo.';
    if (formData.contributedAmount > formData.price) {
       // Permettiamo contributo > prezzo? Forse sì, per regali "extra". Rimuoviamo questo check.
       // newErrors.contributedAmount = 'Il contributo non può superare il prezzo.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    // Passa l'intero formData, inclusi imageUrls, contributedAmount e isPriority
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Campi esistenti... */}
      <div>
        <Label htmlFor="name">Nome Prodotto</Label>
        <Input id="name" name="name" value={formData.name} onChange={handleChange} className={errors.name ? 'border-red-500' : ''} />
        {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
      </div>
      <div>
        <Label htmlFor="description">Descrizione</Label>
        <Textarea id="description" name="description" value={formData.description || ''} onChange={handleChange} rows={3} />
      </div>
      <div>
        <Label htmlFor="price">Prezzo (€)</Label>
        <Input id="price" name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} className={errors.price ? 'border-red-500' : ''} />
        {errors.price && <p className="text-xs text-red-500">{errors.price}</p>}
      </div>

      {/* Campo ContributedAmount (solo in modifica) */}
      {initialData && (
        <div>
          <Label htmlFor="contributedAmount">Contribuito (€)</Label>
          <Input
            id="contributedAmount"
            name="contributedAmount"
            type="number"
            step="0.01"
            value={formData.contributedAmount}
            onChange={handleChange}
            className={errors.contributedAmount ? 'border-red-500' : ''}
          />
          {errors.contributedAmount && <p className="text-xs text-red-500">{errors.contributedAmount}</p>}
           <p className="mt-1 text-xs text-gray-500">Modifica solo se necessario per correggere l'importo.</p>
        </div>
      )}

      {/* Campo Priorità */}
      <div className="flex items-center justify-between">
        <Label htmlFor="isPriority">Segna come Prioritario</Label>
        <Switch
          id="isPriority"
          checked={formData.isPriority}
          onCheckedChange={handlePriorityChange}
        />
      </div>


      {/* Campi Immagini, URL Originale, Categoria... */}
       <div>
        <Label htmlFor="imageUrl">URL Immagine Principale</Label>
        <Input id="imageUrl" name="imageUrl" value={formData.imageUrl || ''} onChange={handleChange} placeholder="https://esempio.com/immagine_principale.jpg" />
      </div>
       <div>
        <Label htmlFor="additionalImageUrlsText">URL Immagini Aggiuntive (una per riga)</Label>
        <Textarea
          id="additionalImageUrlsText"
          name="additionalImageUrlsText"
          value={formData.additionalImageUrlsText || ''}
          onChange={handleChange}
          rows={4}
          placeholder="https://esempio.com/foto1.jpg&#10;https://esempio.com/foto2.jpg"
        />
         <p className="mt-1 text-xs text-gray-500">Incolla qui gli URL delle altre immagini.</p>
      </div>
       <div>
        <Label htmlFor="originalUrl">URL Originale Prodotto</Label>
        <Input id="originalUrl" name="originalUrl" value={formData.originalUrl || ''} onChange={handleChange} placeholder="https://sito-negozio.com/prodotto" />
      </div>
      <div>
        <Label htmlFor="category">Categoria</Label>
        <Input id="category" name="category" value={formData.category || ''} onChange={handleChange} placeholder="Es. Passeggio, Nanna, Pappa" />
      </div>


      {/* Pulsanti */}
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