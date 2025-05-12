import { Product } from '@/types/product';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge'; // Importa Badge
import { Banknote, CreditCard, Gift, Camera, CheckCircle2 } from 'lucide-react'; // Aggiunte Camera e CheckCircle2

type PaymentMethod = 'paypal' | 'satispay' | 'transfer';

interface ProductCardProps {
  product: Product;
  onOpenContributeModal: (product: Product, method: PaymentMethod) => void;
  onOpenDetailModal: (product: Product) => void;
}

const ProductCard = ({ product, onOpenContributeModal, onOpenDetailModal }: ProductCardProps) => {
  const progressPercentage = product.price > 0 ? Math.min(100, (product.contributedAmount / product.price) * 100) : 0; // Assicura max 100%
  const isCompleted = product.contributedAmount >= product.price;
  const hasMultipleImages = product.imageUrls && product.imageUrls.length > 1;

  const handleContributeClick = (method: PaymentMethod) => {
    onOpenContributeModal(product, method);
  };

  const handleDetailClick = () => {
    onOpenDetailModal(product);
  };

  return (
    // Aggiunte classi per transizioni e hover
    <Card className="w-full max-w-sm shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out hover:scale-[1.02] flex flex-col overflow-hidden">
      {/* Area cliccabile per dettagli */}
      <div onClick={handleDetailClick} className="cursor-pointer">
        <CardHeader className="p-0 relative"> {/* Rimosso padding, aggiunto relative */}
          <div className="aspect-square w-full bg-gray-100 overflow-hidden relative">
            <img
              src={product.imageUrl || "https://via.placeholder.com/300x300?text=Prodotto"}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" // Leggero zoom immagine su hover (richiede group su Card se si vuole attivare da Card hover)
            />
            {/* Indicatore immagini multiple */}
            {hasMultipleImages && !isCompleted && ( // Nascondi se completato per dare spazio al badge
              <Badge variant="secondary" className="absolute bottom-2 right-2 bg-black/60 text-white border-none text-xs px-1.5 py-0.5">
                <Camera className="h-3 w-3 mr-1" />
                {product.imageUrls?.length}
              </Badge>
            )}
            {/* Badge Completato */}
            {isCompleted && (
              <Badge className="absolute top-2 left-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white border-none shadow-md px-2.5 py-1">
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Completato!
              </Badge>
            )}
          </div>
           {/* Spostato Titolo e Descrizione fuori dall'immagine */}
           <div className="p-4">
             <CardTitle className="text-xl font-semibold text-gray-800">{product.name}</CardTitle>
             {product.description && <CardDescription className="text-sm text-gray-600 h-10 overflow-hidden mt-1">{product.description}</CardDescription>}
           </div>
        </CardHeader>
      </div>

      {/* Contenuto e Footer */}
      <CardContent className="p-4 flex-grow">
        <div className="mb-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-pink-500">Contributo: {product.contributedAmount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
            <span className="text-lg font-bold text-blue-600">{product.price.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
          </div>
          <Progress value={progressPercentage} className={`w-full h-3 ${isCompleted ? '[&>*]:bg-gradient-to-r [&>*]:from-green-400 [&>*]:to-emerald-500' : '[&>*]:bg-gradient-to-r [&>*]:from-pink-400 [&>*]:to-blue-400'}`} />
          <p className="text-xs text-gray-500 mt-1 text-right">{progressPercentage.toFixed(0)}% completato</p>
        </div>
      </CardContent>
      <CardFooter className="p-4 flex flex-col sm:flex-row justify-around gap-2 border-t mt-auto bg-gray-50/50">
        <Button
          variant="outline"
          className="w-full sm:w-auto border-blue-500 text-blue-500 hover:bg-blue-100 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => handleContributeClick('paypal')}
          title="Contribuisci con PayPal"
          disabled={isCompleted} // Disabilita se completato
        >
          <CreditCard className="mr-2 h-4 w-4" /> PayPal
        </Button>
        <Button
          variant="outline"
          className="w-full sm:w-auto border-pink-500 text-pink-500 hover:bg-pink-100 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => handleContributeClick('satispay')}
          title="Contribuisci con Satispay"
          disabled={isCompleted} // Disabilita se completato
        >
          <Gift className="mr-2 h-4 w-4" /> Satispay
        </Button>
        <Button
          variant="outline"
          className="w-full sm:w-auto border-gray-500 text-gray-500 hover:bg-gray-100 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => handleContributeClick('transfer')}
          title="Contribuisci con Bonifico"
          disabled={isCompleted} // Disabilita se completato
        >
          <Banknote className="mr-2 h-4 w-4" /> Bonifico
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;