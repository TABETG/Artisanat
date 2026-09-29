import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductPage } from './pages/ProductPage';
import { ThankYouPage, CancelledPage } from './pages/CheckoutResultPages';
import { StoryPage } from './pages/StoryPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { ContactPage } from './pages/ContactPage';
import { ShippingPage, TermsPage, LegalPage, PrivacyPage, SellerTermsPage } from './pages/LegalPages';
import { NotFoundPage } from './pages/NotFoundPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { FaqPage } from './pages/FaqPage';
import { GiftCardPage } from './pages/GiftCardPage';
import { CustomOrderPage } from './pages/CustomOrderPage';
import { UnsubscribePage } from './pages/UnsubscribePage';
import { RealisationsPage } from './pages/RealisationsPage';
import { AccountPage } from './pages/AccountPage';
import { SellPage } from './pages/SellPage';
import { ArtisanProfilePage, ArtisansPage } from './pages/ArtisansPage';

// L'espace vendeur est chargé à part : les clients ne téléchargent pas son code.
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin').then((m) => ({ default: m.AdminLogin })));
const AdminNewPassword = lazy(() => import('./pages/admin/AdminNewPassword').then((m) => ({ default: m.AdminNewPassword })));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts').then((m) => ({ default: m.AdminProducts })));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews').then((m) => ({ default: m.AdminReviews })));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings').then((m) => ({ default: m.AdminSettings })));
const AdminProductForm = lazy(() => import('./pages/admin/AdminProductForm').then((m) => ({ default: m.AdminProductForm })));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders').then((m) => ({ default: m.AdminOrders })));
const AdminPromoCodes = lazy(() => import('./pages/admin/AdminPromoCodes').then((m) => ({ default: m.AdminPromoCodes })));
const AdminCustomers = lazy(() => import('./pages/admin/AdminCustomers').then((m) => ({ default: m.AdminCustomers })));
const AdminCustomRequests = lazy(() => import('./pages/admin/AdminCustomRequests').then((m) => ({ default: m.AdminCustomRequests })));
const AdminGiftCards = lazy(() => import('./pages/admin/AdminGiftCards').then((m) => ({ default: m.AdminGiftCards })));
const AdminReturns = lazy(() => import('./pages/admin/AdminReturns').then((m) => ({ default: m.AdminReturns })));
const AdminNewsletter = lazy(() => import('./pages/admin/AdminNewsletter').then((m) => ({ default: m.AdminNewsletter })));
const AdminMessages = lazy(() => import('./pages/admin/AdminMessages').then((m) => ({ default: m.AdminMessages })));
const AdminShipping = lazy(() => import('./pages/admin/AdminShipping').then((m) => ({ default: m.AdminShipping })));
const AdminTeam = lazy(() => import('./pages/admin/AdminTeam').then((m) => ({ default: m.AdminTeam })));
const AdminArtisans = lazy(() => import('./pages/admin/AdminArtisans').then((m) => ({ default: m.AdminArtisans })));
const AdminStockAlerts = lazy(() => import('./pages/admin/AdminStockAlerts').then((m) => ({ default: m.AdminStockAlerts })));

const Loading = () => <p className="p-8 text-stone-500">Chargement…</p>;

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="boutique" element={<ShopPage />} />
        <Route path="produit/:id" element={<ProductPage />} />
        <Route path="merci" element={<ThankYouPage />} />
        <Route path="commande-annulee" element={<CancelledPage />} />
        <Route path="notre-histoire" element={<StoryPage />} />
        <Route path="favoris" element={<FavoritesPage />} />
        <Route path="suivi-commande" element={<OrderTrackingPage />} />
        <Route path="questions-frequentes" element={<FaqPage />} />
        <Route path="carte-cadeau" element={<GiftCardPage />} />
        <Route path="sur-mesure" element={<CustomOrderPage />} />
        <Route path="desinscription" element={<UnsubscribePage />} />
        <Route path="nos-realisations" element={<RealisationsPage />} />
        <Route path="compte" element={<AccountPage />} />
        <Route path="vendre" element={<SellPage />} />
        <Route path="artisans" element={<ArtisansPage />} />
        <Route path="artisans/:slug" element={<ArtisanProfilePage />} />
        <Route path="conditions-vendeurs" element={<SellerTermsPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="livraison-et-retours" element={<ShippingPage />} />
        <Route path="conditions-generales-de-vente" element={<TermsPage />} />
        <Route path="mentions-legales" element={<LegalPage />} />
        <Route path="confidentialite" element={<PrivacyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="admin/connexion" element={<AdminLogin />} />
      <Route path="admin/nouveau-mot-de-passe" element={<AdminNewPassword />} />
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="produits" element={<AdminProducts />} />
        <Route path="produits/nouveau" element={<AdminProductForm />} />
        <Route path="produits/:id" element={<AdminProductForm />} />
        <Route path="commandes" element={<AdminOrders />} />
        <Route path="alertes" element={<AdminStockAlerts />} />
        <Route path="avis" element={<AdminReviews />} />
        <Route path="reglages" element={<AdminSettings />} />
        <Route path="codes-promo" element={<AdminPromoCodes />} />
        <Route path="clients" element={<AdminCustomers />} />
        <Route path="sur-mesure" element={<AdminCustomRequests />} />
        <Route path="cartes-cadeaux" element={<AdminGiftCards />} />
        <Route path="retours" element={<AdminReturns />} />
        <Route path="lettre" element={<AdminNewsletter />} />
        <Route path="messages" element={<AdminMessages />} />
        <Route path="livraison" element={<AdminShipping />} />
        <Route path="equipe" element={<AdminTeam />} />
        <Route path="artisans" element={<AdminArtisans />} />
      </Route>
    </Routes>
    </Suspense>
  );
}
