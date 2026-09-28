import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductPage } from './pages/ProductPage';
import { ThankYouPage, CancelledPage } from './pages/CheckoutResultPages';
import { StoryPage } from './pages/StoryPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { ContactPage } from './pages/ContactPage';
import { ShippingPage, TermsPage, LegalPage, PrivacyPage } from './pages/LegalPages';
import { NotFoundPage } from './pages/NotFoundPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminNewPassword } from './pages/admin/AdminNewPassword';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminReviews } from './pages/admin/AdminReviews';
import { AdminSettings } from './pages/admin/AdminSettings';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { FaqPage } from './pages/FaqPage';
import { AdminProductForm } from './pages/admin/AdminProductForm';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminStockAlerts } from './pages/admin/AdminStockAlerts';

export default function App() {
  return (
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
      </Route>
    </Routes>
  );
}
