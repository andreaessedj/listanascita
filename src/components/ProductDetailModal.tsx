import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"; // Importa componenti Carousel
import { Button } from '@/components/ui/button';
import { Product } from '@/types/product';
import { X } from 'lucide-react';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

const ProductDetailModal = ({ isOpen, onClose, product }: ProductDetailModalProps) => {
  if (!isOpen || !product) {
    return null;
  }

  // Usa imageUrls se disponibile e non vuoto, altrimenti usa imageUrl singolo se presente
  const imagesToShow = (product.imageUrls && product.imageUrls.length > 0)
    ? product.imageUrls
    : (product.imageUrl ? [product.imageUrl] : []);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl">{product.name}</DialogTitle>
        </DialogHeader>

        {/* Carousel Immagini */}
        {imagesToShow.length > 0 && (
          <div className="my-4 flex-shrink-0">
            <Carousel className="w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto">
              <CarouselContent>
                {imagesToShow.map((url, index) => (
                  <CarouselItem key={index}>
                    <div className="p-1">
                      <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
                        <img
                          src={url}
                          alt={`${product.name} - Immagine ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/400?text=Immagine+non+disponibile")}
                        />
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {imagesToShow.length > 1 && ( // Mostra controlli solo se c'è più di un'immagine
                <>
                  <CarouselPrevious className="absolute left-[-10px] sm:left-[-20px] top-1/2 -translate-y-1/2" />
                  <CarouselNext className="absolute right-[-10px] sm:right-[-20px] top-1/2 -translate-y-1/2" />
                </>
              )}
            </Carousel>
          </div>
        )}

        {/* Descrizione Completa */}
        <div className="flex-grow overflow-y-auto pr-2">
          <DialogDescription className="text-base text-gray-700 whitespace-pre-wrap">
            {product.description || "Nessuna descrizione fornita."}
          </DialogDescription>
        </div>

        {/* Pulsante Chiudi */}
        <DialogClose asChild className="absolute top-4 right-4 flex-shrink-0">
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Chiudi</span>
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailModal;