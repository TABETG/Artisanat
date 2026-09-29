import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { CartProvider } from './context/CartContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { SettingsProvider } from './context/SettingsContext';
import { CustomerProvider } from './context/CustomerContext';
import { MarketplaceProvider } from './context/MarketplaceContext';
import { ReviewsProvider } from './context/ReviewsContext';
import { BadgesProvider } from './context/BadgesContext';
// Polices hébergées avec le site : rien n'est chargé depuis Google (plus rapide, et conforme au RGPD)
import '@fontsource-variable/bricolage-grotesque/standard.css';
import '@fontsource-variable/newsreader/standard.css';
import '@fontsource-variable/newsreader/standard-italic.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <CustomerProvider>
        <MarketplaceProvider>
        <CartProvider>
          <FavoritesProvider>
            <ReviewsProvider>
              <BadgesProvider>
                <App />
              </BadgesProvider>
            </ReviewsProvider>
          </FavoritesProvider>
        </CartProvider>
        </MarketplaceProvider>
        </CustomerProvider>
      </SettingsProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
