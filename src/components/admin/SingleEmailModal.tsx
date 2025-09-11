import { useMemo, useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Recipient = { email: string; name?: string | null };

type SingleEmailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  recipients: Recipient[];
  onSend: (args: { subject: string; body: string; recipients: string[] }) => Promise<void> | void;
  isLoading?: boolean;
};

export default function SingleEmailModal({
  isOpen,
  onClose,
  recipients,
  onSend,
  isLoading = false,
}: SingleEmailModalProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedEmail, setSelectedEmail] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const uniqueRecipients = useMemo(() => {
    const seen = new Set<string>();
    return recipients.filter(r => {
      if (!r.email) return false;
      const key = r.email.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [recipients]);

  useEffect(() => {
    if (!useCustom && !selectedEmail && uniqueRecipients.length > 0) {
      setSelectedEmail(uniqueRecipients[0].email);
    }
  }, [useCustom, selectedEmail, uniqueRecipients]);


  const emailToSend = useCustom ? customEmail.trim() : selectedEmail.trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

  const disabledReason = !subject.trim()
    ? "Inserisci un oggetto"
    : !body.trim()
      ? "Inserisci un testo"
      : !emailToSend
        ? "Seleziona o inserisci un'email"
        : !emailRegex.test(emailToSend)
          ? "Email non valida"
          : null;

  const canSend = !isLoading && !disabledReason;

  const handleSubmit = async () => {
    await onSend({ subject: subject.trim(), body: body.trim(), recipients: [emailToSend] });
    setSubject("");
    setBody("");
    setSelectedEmail("");
    setCustomEmail("");
    setUseCustom(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invia email a un singolo utente</DialogTitle>
          <DialogDescription>
            Usa lo stesso template del Bulk Email, ma scegli un destinatario specifico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Destinatario</Label>

            {!useCustom ? (
              <select
                id="recipient"
                className="w-full border rounded-md p-2"
                value={selectedEmail}
                onChange={(e) => setSelectedEmail(e.target.value)}
              >
                <option value="">— Seleziona destinatario —</option>
                {uniqueRecipients.map((r) => (
                  <option key={r.email} value={r.email}>
                    {r.name ? `${r.name} <${r.email}>` : r.email}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id="customEmail"
                placeholder="nome@esempio.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
              />
            )}

            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <input
                id="useCustom"
                type="checkbox"
                checked={useCustom}
                onChange={(e) => setUseCustom(e.target.checked)}
              />
              <Label htmlFor="useCustom" className="cursor-pointer">Inserisci email manualmente</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Oggetto</Label>
            <Input
              id="subject"
              placeholder="Oggetto dell'email"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Contenuto</Label>
            <Textarea
              id="body"
              placeholder="Scrivi qui il testo dell'email…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
            />
          </div>
        </div>

        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button >Annulla</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!canSend}>
            {isLoading ? "Invio…" : (
              <>
                Invia Email
              </>
            )}
          </Button>
          {disabledReason && (
            <p className="text-sm text-muted-foreground mt-2">{disabledReason}</p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
