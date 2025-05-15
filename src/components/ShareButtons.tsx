import React from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Facebook, Twitter, Whatsapp, Link as LinkIcon } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

interface ShareButtonsProps {
  title: string;
  text: string;
  url: string;
}

const ShareButtons = ({ title, text, url }: ShareButtonsProps) => {

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: text,
          url: url,
        });
        console.log('Contenuto condiviso con successo');
      } catch (error) {
        console.error('Errore durante la condivisione:', error);
        // Non mostrare un errore all'utente per una condivisione annullata
        if ((error as any).name !== 'AbortError') {
           showError('Impossibile condividere. Riprova.');
        }
      }
    } else {
      // Fallback per browser che non supportano l'API Web Share
      showError('Il tuo browser non supporta la condivisione diretta. Copia il link manualmente.');
      // Potresti aggiungere qui la logica per mostrare link diretti a social specifici
      console.log(`Condividi: ${title} - ${text} - ${url}`);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url)
      .then(() => {
        showSuccess('Link copiato negli appunti!');
      })
      .catch(err => {
        console.error('Errore nella copia del link:', err);
        showError('Impossibile copiare il link.');
      });
  };


  return (
    <div className="flex items-center space-x-2">
      {/* Pulsante di condivisione generico (usa Web Share API) */}
      {navigator.share && (
         <Button variant="outline" size="sm" onClick={handleShare} title="Condividi">
           <Share2 className="h-4 w-4 mr-1" /> Condividi
         </Button>
      )}

      {/* Pulsante per copiare il link */}
       <Button variant="outline" size="sm" onClick={handleCopyLink} title="Copia Link">
         <LinkIcon className="h-4 w-4 mr-1" /> Copia Link
       </Button>

       {/* Esempi di fallback per social specifici (opzionale, se non si usa Web Share API) */}
       {/*
       <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">
         <Button variant="outline" size="icon" title="Condividi su Facebook">
           <Facebook className="h-4 w-4" />
         </Button>
       </a>
       <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">
         <Button variant="outline" size="icon" title="Condividi su Twitter">
           <Twitter className="h-4 w-4" />
         </Button>
       </a>
       <a href={`whatsapp://send?text=${encodeURIComponent(text + ' ' + url)}`} data-action="share/whatsapp/share">
          <Button variant="outline" size="icon" title="Condividi su WhatsApp">
            <Whatsapp className="h-4 w-4" />
          </Button>
       </a>
       */}
    </div>
  );
};

export default ShareButtons;