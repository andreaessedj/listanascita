import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import ProductForm, { ProductFormData } from '@/components/admin/ProductForm';
import BulkEmailModal from '@/components/admin/BulkEmailModal'; // Importa il nuovo modale
import SingleEmailModal from '@/components/admin/SingleEmailModal';
import { Product } from '@/types/product';
import { Skeleton } from "@/components/ui/skeleton";
import { showError, showSuccess } from '@/utils/toast';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Link } from 'react-router-dom';

// Definisci il tipo per i contributi
interface Contribution {
  id: string;
  product_id: string;
  amount: number;
  contributor_name: string;
  contributor_surname: string;
  contributor_email: string;
  message?: string;
  created_at: string;
}

const Admin = () => {
  const [loading, setLoading] = useState(true);
  // Stato per email singola
  const [isSingleEmailOpen, setIsSingleEmailOpen] = useState(false);
  const [isSendingSingleEmail, setIsSendingSingleEmail] = useState(false);
  const [singleRecipients, setSingleRecipients] = useState<{ email: string; name?: string | null }[]>([]);

  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [isContributionsModalOpen, setIsContributionsModalOpen] = useState(false);
  const [selectedProductContributions, setSelectedProductContributions] = useState<Contribution[]>([]);
  const [contributionsLoading, setContributionsLoading] = useState(false);
  const [contributionsError, setContributionsError] = useState<string | null>(null);

  // Stati per le statistiche
  const [totalPrice, setTotalPrice] = useState(0);
  const [totalContributed, setTotalContributed] = useState(0);
  const [totalRemaining, setTotalRemaining] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [completedProducts, setCompletedProducts] = useState(0);

  const [isExportingEmails, setIsExportingEmails] = useState(false); // Stato per il loading dell'esportazione

  // Stato per il modale email massive
  const [isBulkEmailModalOpen, setIsBulkEmailModalOpen] = useState(false);
  const [isSendingBulkEmail, setIsSendingBulkEmail] = useState(false);


  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('products')
        .select('*, image_urls, is_priority')
        .order('created_at', { ascending: false });

      if (supabaseError) throw supabaseError;

      const formattedProducts = data?.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.image_url,
        imageUrls: item.image_urls || [],
        contributedAmount: item.contributed_amount,
        category: item.category,
        originalUrl: item.original_url,
        createdAt: item.created_at,
        isPriority: item.is_priority,
      })) || [];

      setProducts(formattedProducts);

      // Calcola le statistiche
      const total = formattedProducts.reduce((sum, p) => sum + p.price, 0);
      const contributed = formattedProducts.reduce((sum, p) => sum + p.contributedAmount, 0);
      const remaining = total - contributed;
      const completed = formattedProducts.filter(p => p.contributedAmount >= p.price).length;

      setTotalPrice(total);
      setTotalContributed(contributed);
      setTotalRemaining(remaining);
      setTotalProducts(formattedProducts.length);
      setCompletedProducts(completed);

    } catch (err: any) {
      console.error("Errore caricamento prodotti (Admin):", err);
      setError("Impossibile caricare i prodotti.");
      showError("Impossibile caricare i prodotti.");
    } finally {
      setLoading(false);
    }
  };

  // Funzione per recuperare i contributi per un prodotto specifico
  const fetchContributionsForProduct = async (productId: string) => {
    setContributionsLoading(true);
    setContributionsError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('contributions')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: true });

      if (supabaseError) throw supabaseError;

      setSelectedProductContributions(data || []);
      setIsContributionsModalOpen(true); // Apri il modale dopo aver caricato i dati

    } catch (err: any) {
      console.error(`Errore caricamento contributi per prodotto ${productId}:`, err);
      setContributionsError("Impossibile caricare lo storico dei contributi.");
      showError("Impossibile caricare lo storico dei contributi.");
    } finally {
      setContributionsLoading(false);
    }
  };

  // Funzione per esportare le email
  const handleExportEmails = async () => {
    setIsExportingEmails(true);
    try {
      // Recupera tutte le email uniche dalla tabella 'contributions'
      const { data, error: supabaseError } = await supabase
        .from('contributions')
        .select('contributor_email');

      if (supabaseError) throw supabaseError;

      if (!data || data.length === 0) {
        showError("Nessuna email di contribuente trovata.");
        setIsExportingEmails(false);
        return;
      }

      // Estrai le email e rimuovi i duplicati
      const emails = data.map(item => item.contributor_email).filter(email => email); // Filtra eventuali null/undefined
      const uniqueEmails = Array.from(new Set(emails));

      // Formatta le email (una per riga)
      const emailList = uniqueEmails.join('\n');

      // Crea un Blob e un URL per il download
      const blob = new Blob([emailList], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);

      // Crea un link nascosto e simula il click per scaricare il file
      const a = document.createElement('a');
      a.href = url;
      a.download = 'contributor_emails.txt';
      document.body.appendChild(a);
      a.click();

      // Pulisci l'URL temporaneo e l'elemento link
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccess(`Esportate ${uniqueEmails.length} email uniche.`);

    } catch (err: any) {
      console.error("Errore durante l'esportazione delle email:", err);
      showError(`Errore durante l'esportazione: ${err.message || 'Errore sconosciuto'}`);
    } finally {
      setIsExportingEmails(false);
    }
  };

  
  // Carica elenco destinatari (email uniche) dai contributi
  const fetchSingleRecipients = async () => {
    try {
      const { data, error } = await supabase
        .from('contributions')
        .select('contributor_email, contributor_name, contributor_surname')
        .not('contributor_email', 'is', null);

      if (error) {
        console.error("Errore caricamento destinatari:", error);
        showError("Impossibile caricare i destinatari.");
        return;
      }

      const mapped = (data || []).filter((r: any) => r.contributor_email).map((r: any) => ({
        email: String(r.contributor_email).trim(),
        name: [r.contributor_name, r.contributor_surname].filter(Boolean).join(' ').trim() || null
      }));

      setSingleRecipients(mapped);
    } catch (e: any) {
      console.error("Errore inatteso nel caricamento destinatari:", e);
      showError("Errore inatteso nel caricamento dei destinatari.");
    }
  };

  const handleOpenSingleEmail = async () => {
    await fetchSingleRecipients();
    setIsSingleEmailOpen(true);
  };

  const handleCloseSingleEmail = () => setIsSingleEmailOpen(false);

  
const handleSendSingleEmail = async ({ subject, body, recipients }: { subject: string; body: string; recipients: string[] }) => {
    console.log('USING VERCEL API /api/send-email-single');
    console.log('DEBUG single email recipients:', recipients);
    setIsSendingSingleEmail(true);
    try {
      const res = await fetch('/api/send-email-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, recipients }),
      });

      let json: any = null;
      try { json = await res.json(); } catch (_e) { /* ignore parse errors */ }

      if (!res.ok) {
        const errMsg = (json && (json.error || json.message)) || res.statusText || 'Errore sconosciuto';
        console.error('Errore chiamata API /api/send-email-single:', errMsg);
        showError(`Errore durante l'invio dell'email: ${errMsg}`);
        return;
      }

      const count = json?.count ?? recipients.length ?? 1;
      const message = json?.ok ? `Email inviata a ${count} destinatario/i.` : 'Email inviata.';
      showSuccess(message);
      setIsSingleEmailOpen(false);
    } catch (err: any) {
      console.error('Errore generale durante l\'invio dell\'email singola:', err);
      showError(`Si è verificato un errore inatteso: ${err?.message || 'Errore sconosciuto'}`);
    } finally {
      setIsSendingSingleEmail(false);
    }
  };


export default Admin;