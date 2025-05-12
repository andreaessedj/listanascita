import { Product } from '@/types/product';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Banknote, CreditCard, Gift, Camera } from 'lucide-react'; // Aggiunta Camera

type PaymentMethod = 'paypal' | 'satispay' | 'transfer';

interface ProductCardProps {
  product: Product;
  onOpenContributeModal: (product: Product, method: PaymentMethod) => void;
  onOpenDetailModal: (product: Product) => void; // Callback per aprire modale dettagli
}

const ProductCard = ({ product, onOpenContributeModal, onOpenDetailModal }: ProductCardProps) => {
  const progressPercentage = product.price > 0 ? (product.contributedAmount / product.price) * 100 : 0;
  const hasMultipleImages = product.imageUrls && product.imageUrls.length > 1;

  const handleContributeClick = (method: PaymentMethod) => {
    onOpenContributeModal(product, method);
  };

  const handleDetailClick = () => {
    onOpenDetailModal(product);
  };

  return (
    <Card className="w-full max-w-sm shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
      {/* Area cliccabile per dettagli */}
      <div onClick={handleDetailClick} className="cursor-pointer">
        <CardHeader className="p-4 relative"> {/* Aggiunto relative per posizionare l'icona */}
          <div className="aspect-square w-full bg-gray-100 rounded-md mb-4 overflow-hidden relative">
            <img
              src={product.imageUrl || "https://via.placeholder.com/300x300?text=Prodotto"}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {/* Indicatore immagini multiple */}
            {hasMultipleImages && (
              <div className="absolute bottom-2 right-2 bg-black/50 text-white p-1 rounded-full flex items-center text-xs">
                <Camera className="h-3 w-3 mr-1" />
                <span>{product.imageUrls?.length}</span>
              </div>
            )}
          </div>
          <CardTitle className="text-xl font-semibold text-gray-800">{product.name}</CardTitle>
          {/* Descrizione troncata qui */}
          {product.description && <CardDescription className="text-sm text-gray-600 h-10 overflow-hidden">{product.description}</CardDescription>}
        </CardHeader>
      </div>

      {/* Contenuto e Footer rimangono separati dall'area cliccabile per dettagli */}
      <CardContent className="p-4 flex-grow">
        <div className="mb-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-pink-500">Contributo: {product.contributedAmount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
            <span className="text-lg font-bold text-blue-600">{product.price.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
          </div>
          <Progress value={progressPercentage} className="w-full h-3 [&>*]:bg-gradient-to-r [&>*]:from-pink-400 [&>*]:to-blue-400" />
          <p className="text-xs text-gray-500 mt-1 text-right">{progressPercentage.toFixed(0)}% completato</p>
        </div>
      </CardContent>
      <CardFooter className="p-4 flex flex-col sm:flex-row justify-around gap-2 border-t mt-auto">
        <Button
          variant="outline"
          className="w-full sm:w-auto border-blue-500 text-blue-500 hover:bg-blue-50 flex-1"
          onClick={() => handleContributeClick('paypal')}
          title="Contribuisci con PayPal"
        >
          <CreditCard className="mr-2 h-4 w-4" /> PayPal
        </Button>
        <Button
          variant="outline"
          className="w-full sm:w-auto border-pink-500 text-pink-500 hover:bg-pink-50 flex-1"
          onClick={() => handleContributeClick('satispay')}
          title="Contribuisci con Satispay"
        >
          <Gift className="mr-2 h-4 w-4" /> Satispay
        </Button>
        <Button
          variant="outline"
          className="w-full sm:w-auto border-gray-500 text-gray-500 hover:bg-gray-50 flex-1"
          onClick={() => handleContributeClick('transfer')}
          title="Contribuisci con Bonifico"
        >
          <Banknote className="mr-2 h-4 w-4" /> Bonifico
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;