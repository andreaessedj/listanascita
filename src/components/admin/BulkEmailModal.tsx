import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail } from 'lucide-react';

interface BulkEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (subject: string, body: string) => Promise<void>;
  isLoading: boolean;
}

const BulkEmailModal = ({ isOpen, onClose, onSend, isLoading }: BulkEmailModalProps) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSubject('');
      setBody('');
      setError(null);
    }
  }, [isOpen]);

  const handleSendClick = async () => {
    if (!subject.trim() || !body.trim()) {
      setError("Oggetto e corpo dell'email non possono essere vuoti.");
      return;
    }
    setError(null);
    await onSend(subject, body);
    // La chiusura del modale e il reset dello stato di loading
    // saranno gestiti dalla funzione onSend in Admin.tsx
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invia Email a Tutti i Contribuenti</DialogTitle>
          <DialogDescription>
            Componi l'email da inviare a tutti coloro che hanno contribuito a un regalo.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="subject" className="text-right">
              Oggetto*
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="col-span-3"
              placeholder="Oggetto dell'email"
              disabled={isLoading}
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="body" className="text-right pt-2">
              Corpo Email*
            </Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="col-span-3"
              rows={8}
              placeholder="Scrivi qui il messaggio..."
              disabled={isLoading}
            />
          </div>
          {error && <p className="text-sm text-red-600 text-center col-span-4">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Annulla
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleSendClick}
            disabled={isLoading || !subject.trim() || !body.trim()}
          >
            {isLoading ? 'Invio...' : (
              <>
                <Mail className="mr-2 h-4 w-4" /> Invia Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkEmailModal;