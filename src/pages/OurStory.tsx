import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

const OurStory = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 text-gray-700 relative overflow-hidden p-4 sm:p-8">
      <header className="py-8 text-center relative z-10 bg-white/30 backdrop-blur-sm mb-8 shadow-sm rounded-lg">
        <div className="inline-flex items-center justify-center p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg mb-2">
          <Heart className="h-8 w-8 text-pink-400" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-blue-600">
          La Nostra Storia
        </h1>
        <p className="mt-2 text-xl sm:text-2xl text-gray-600">Un piccolo racconto di noi</p>
      </header>

      <main className="container mx-auto px-4 py-8 relative z-10 bg-white/70 backdrop-blur-sm rounded-lg shadow-lg prose prose-lg max-w-none md:max-w-2xl lg:max-w-3xl mx-auto">
        <p>
          Qui potete raccontare la vostra storia: come vi siete conosciuti, i momenti speciali,
          il percorso che vi ha portato fin qui e l'attesa per il nuovo arrivo.
          Potete aggiungere aneddoti divertenti, date importanti e tutto ciò che
          volete condividere con i vostri cari.
        </p>
        <p>
          Sentitevi liberi di personalizzare questo spazio con i vostri ricordi e le vostre emozioni.
          Potete anche inserire delle foto!
        </p>
        {/* Esempio di come inserire una foto */}
        {/*
        <figure>
          <img src="/path/to/your/photo.jpg" alt="Una nostra foto" className="rounded-lg shadow-md mx-auto" />
          <figcaption className="text-center text-sm text-gray-500 mt-2">Un momento speciale per noi.</figcaption>
        </figure>
        */}
        <p>
          Grazie per essere parte di questo meraviglioso viaggio con noi!
        </p>

        <div className="mt-8 text-center">
          <Link to="/" className="text-blue-600 hover:underline text-lg">
            &larr; Torna alla Lista Nascita
          </Link>
        </div>
      </main>

      <footer className="py-8 text-center text-gray-500 relative z-10">
        <p>&copy; {new Date().getFullYear()} Ilaria & Andrea. Con amore.</p>
      </footer>
    </div>
  );
};

export default OurStory;