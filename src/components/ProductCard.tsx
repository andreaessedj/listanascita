import { Product } from '@/types/product';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Banknote, CreditCard, Gift } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onContribute: (productId: string, method: 'paypal' | 'satispay' | 'transfer') => void;
}

const ProductCard = ({ product, onContribute }: ProductCardProps) => {
  const progressPercentage = product.price > 0 ? (product.contributedAmount / product.price) * 100 : 0;

  return (
    <Card className="w-full max-w-sm shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="p-4">
        <div className="aspect-square w-full bg-gray-100 rounded-md mb-4 overflow-hidden">
          <img 
            src={product.imageUrl || "https://via.placeholder.com/300x300?text=Prodotto"} 
            alt={product.name} 
            className="w-full h-full object-cover"
          />
        </div>
        <CardTitle className="text-xl font-semibold text-gray-800">{product.name}</CardTitle>
        {product.description && <CardDescription className="text-sm text-gray-600 h-10 overflow-hidden">{product.description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-4">
        <div className="mb-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-pink-500">Contributo: {product.contributedAmount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
            <span className="text-lg font-bold text-blue-600">{product.price.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
          </div>
          <Progress value={progressPercentage} className="w-full h-3 [&>*]:bg-gradient-to-r [&>*]:from-pink-400 [&>*]:to-blue-400" />
          <p className="text-xs text-gray-500 mt-1 text-right">{progressPercentage.toFixed(0)}% completato</p>
        </div>
      </CardContent>
      <CardFooter className="p-4 flex flex-col sm:flex-row justify-around gap-2">
        <Button 
          variant="outline" 
          className="w-full sm:w-auto border-blue-500 text-blue-500 hover:bg-blue-50"
          onClick={() => onContribute(product.id, 'paypal')}
          title="Contribuisci con PayPal"
        >
          <CreditCard className="mr-2 h-4 w-4" /> PayPal
        </Button>
        <Button 
          variant="outline" 
          className="w-full sm:w-auto border-pink-500 text-pink-500 hover:bg-pink-50"
          onClick={() => onContribute(product.id, 'satispay')}
          title="Contribuisci con Satispay"
        >
          <Gift className="mr-2 h-4 w-4" /> Satispay
        </Button>
        <Button 
          variant="outline" 
          className="w-full sm:w-auto border-gray-500 text-gray-500 hover:bg-gray-50"
          onClick={() => onContribute(product.id, 'transfer')}
          title="Contribuisci con Bonifico"
        >
          <Banknote className="mr-2 h-4 w-4" /> Bonifico
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;