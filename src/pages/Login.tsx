// Rimuovi useEffect
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
// Rimuovi useUser e useSupabaseClient (se ancora presente)
// Rimuovi useNavigate
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Login = () => {
  // Rimuovi useUser, supabaseClient, navigate
  // Rimuovi useEffect per il redirect

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-gray-700">
            Accesso Area Riservata
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase} // Usa l'istanza importata
            appearance={{ theme: ThemeSupa }}
            providers={[]}
            theme="light"
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Indirizzo Email',
                  password_label: 'Password',
                  button_label: 'Accedi',
                  loading_button_label: 'Accesso in corso...',
                  social_provider_text: 'Accedi con {{provider}}',
                  link_text: 'Hai già un account? Accedi',
                  confirmation_text: 'Controlla la tua email per il link di conferma'
                },
                sign_up: {
                  email_label: 'Indirizzo Email',
                  password_label: 'Password',
                  button_label: 'Registrati',
                  loading_button_label: 'Registrazione in corso...',
                  social_provider_text: 'Registrati con {{provider}}',
                  link_text: 'Non hai un account? Registrati',
                  confirmation_text: 'Controlla la tua email per il link di verifica'
                },
                forgotten_password: {
                  email_label: 'Indirizzo Email',
                  password_label: 'Password',
                  button_label: 'Invia istruzioni per reset password',
                  loading_button_label: 'Invio istruzioni...',
                  link_text: 'Password dimenticata?',
                   confirmation_text: 'Controlla la tua email per il link di reset password'
                },
                 update_password: {
                  password_label: "Nuova password",
                  password_input_placeholder: "La tua nuova password",
                  button_label: "Aggiorna password",
                  loading_button_label: "Aggiornamento password...",
                  confirmation_text: "La tua password è stata aggiornata"
                },
              },
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;