import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/shared/ProtectedRoute";
import MainLayout from "./components/shared/MainLayout";
import { Toaster } from "react-hot-toast";

/* Guest Pages */
import Home from "./pages/Home";
import Features from "./pages/Features";
import AIInsights from "./pages/AIInsights";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Register from "./pages/Register";

/* Farmer Pages */
import FarmerDashboard from "./pages/farmer/FarmerDashboard";
import AIScan from "./pages/farmer/AIScan";
import Predictions from "./pages/farmer/Predictions";
import FarmerMarketplace from "./pages/farmer/Marketplace";
import SellCrop from "./pages/farmer/SellCrop";
import FarmerAdvisory from "./pages/farmer/Advisory";
import Weather from "./pages/farmer/Weather";
import FarmGPT from "./pages/farmer/FarmGPT";
import FarmManager from "./pages/farmer/FarmManager";
import CropCalendar from "./pages/farmer/CropCalendar";
import FarmFinance from "./pages/farmer/FarmFinance";
import Community from "./pages/farmer/Community";
import FarmerChat from "./pages/farmer/Chat";

/* Buyer Pages */
import BuyerDashboard from "./pages/buyer/BuyerDashboard";
import BuyerMarketplace from "./pages/buyer/Marketplace";
import BuyerCropDetail from "./pages/buyer/CropDetail";
import Orders from "./pages/buyer/Orders";
import OrderDetails from "./pages/buyer/OrderDetails";
import Cart from "./pages/buyer/Cart";
import Checkout from "./pages/buyer/Checkout";
import Payment from "./pages/buyer/Payment";
import Chat from "./pages/buyer/Chat";
import Wallet from "./pages/buyer/Wallet";
import Analytics from "./pages/buyer/Analytics";
import BuyerAdvisory from "./pages/buyer/Advisory";
import BuyerProfile from "./pages/buyer/BuyerProfile";

/* Expert Pages */
import ExpertDashboard from "./pages/expert/ExpertDashboard";
import ConsultationRequests from "./pages/expert/ConsultationRequests";
import ActiveConsultations from "./pages/expert/ActiveConsultations";
import ExpertAdvisory from "./pages/expert/Advisory";
import ExpertReports from "./pages/expert/Reports";
import Earnings from "./pages/expert/Earnings";
import Reviews from "./pages/expert/Reviews";
import Schedule from "./pages/expert/Schedule";

/* Shared */
import MarketplaceCropDetail from "./pages/marketplace/CropDetail";
import ConsultationRequestPage from "./pages/shared/ConsultationRequestPage";
import SchedulePage from "./pages/shared/SchedulePage";

/* Admin */
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersPage from "./pages/admin/UsersPage";
import FarmersPage from "./pages/admin/FarmersPage";
import MarketplacePage from "./pages/admin/MarketplacePage";
import OrdersPage from "./pages/admin/OrdersPage";
import PaymentsPage from "./pages/admin/PaymentsPage";
import AIInsightsPage from "./pages/admin/AIInsightsPage";
import ReviewsPage from "./pages/admin/ReviewsPage";
import FraudAlertsPage from "./pages/admin/FraudAlertsPage";
import ReportsPage from "./pages/admin/ReportsPage";
import ActivityLogsPage from "./pages/admin/ActivityLogsPage";
import AutomationRulesPage from "./pages/admin/AutomationRulesPage";
import NotificationsCenter from "./pages/admin/NotificationsCenter";
import SettingsPage from "./pages/admin/SettingsPage";
import ConsultationsPage from "./pages/admin/ConsultationsPage";
import ExpertsPage from "./pages/admin/ExpertsPage";
import AdvisoriesPage from "./pages/admin/AdvisoriesPage";
import WalletEscrowPage from "./pages/admin/WalletEscrowPage";
import CommunityPage from "./pages/admin/CommunityPage";
import SchemesPage from "./pages/admin/SchemesPage";
import ScanReportsPage from "./pages/admin/ScanReportsPage";
import ReviewAnalyticsPage from "./pages/admin/ReviewAnalyticsPage";
import PlatformAnalyticsPage from "./pages/admin/PlatformAnalyticsPage";
import BroadcastPage from "./pages/admin/BroadcastPage";

function App() {
  return (
    <Router>
      <Toaster position="top-right" reverseOrder={false} />
      <Routes>

        {/* ================= ADMIN ROUTES (own layout — no Navbar/Footer) ================= */}
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="farmers" element={<FarmersPage />} />
            <Route path="marketplace" element={<MarketplacePage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="ai" element={<AIInsightsPage />} />
            <Route path="reviews" element={<ReviewsPage />} />
            <Route path="fraud" element={<FraudAlertsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="activity-logs" element={<ActivityLogsPage />} />
            <Route path="automation" element={<AutomationRulesPage />} />
            <Route path="notifications" element={<NotificationsCenter />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="consultations" element={<ConsultationsPage />} />
            <Route path="experts" element={<ExpertsPage />} />
            <Route path="advisories" element={<AdvisoriesPage />} />
            <Route path="wallet" element={<WalletEscrowPage />} />
            <Route path="community" element={<CommunityPage />} />
            <Route path="schemes" element={<SchemesPage />} />
            <Route path="scan-reports" element={<ScanReportsPage />} />
            <Route path="review-analytics" element={<ReviewAnalyticsPage />} />
            <Route path="platform-analytics" element={<PlatformAnalyticsPage />} />
            <Route path="broadcast" element={<BroadcastPage />} />
          </Route>
        </Route>

        {/* ================= MAIN LAYOUT (Navbar + Footer) ================= */}
        <Route element={<MainLayout />}>

          {/* Guest */}
          <Route path="/" element={<Home />} />
          <Route path="/features" element={<Features />} />
          <Route path="/ai" element={<AIInsights />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Farmer */}
          <Route element={<ProtectedRoute allowedRoles={["farmer"]} />}>
            <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
            <Route path="/farmer/scan" element={<AIScan />} />
            <Route path="/farmer/predictions" element={<Predictions />} />
            <Route path="/farmer/marketplace" element={<FarmerMarketplace />} />
            <Route path="/farmer/sell-crop" element={<SellCrop />} />
            <Route path="/farmer/advisory" element={<FarmerAdvisory />} />
            <Route path="/farmer/weather" element={<Weather />} />
            <Route path="/farmer/farmgpt" element={<FarmGPT />} />
            <Route path="/farmer/farm-manager" element={<FarmManager />} />
            <Route path="/farmer/crop-calendar" element={<CropCalendar />} />
            <Route path="/farmer/finance" element={<FarmFinance />} />
            <Route path="/farmer/community" element={<Community />} />
            <Route path="/farmer/chat" element={<FarmerChat />} />
            <Route path="/farmer/consultation" element={<ConsultationRequestPage />} />
            <Route path="/farmer/schedule" element={<SchedulePage />} />
          </Route>

          {/* Shared marketplace */}
          <Route element={<ProtectedRoute allowedRoles={["farmer", "buyer"]} />}>
            <Route path="/marketplace/crop/:id" element={<MarketplaceCropDetail />} />
          </Route>

          {/* Buyer */}
          <Route element={<ProtectedRoute allowedRoles={["buyer"]} />}>
            <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
            <Route path="/buyer/marketplace" element={<BuyerMarketplace />} />
            <Route path="/buyer/cropdetails" element={<BuyerCropDetail />} />
            <Route path="/buyer/orders" element={<Orders />} />
            <Route path="/buyer/orders/:orderId" element={<OrderDetails />} />
            <Route path="/buyer/cart" element={<Cart />} />
            <Route path="/buyer/checkout" element={<Checkout />} />
            <Route path="/buyer/payment" element={<Payment />} />
            <Route path="/buyer/chat" element={<Chat />} />
            <Route path="/buyer/wallet" element={<Wallet />} />
            <Route path="/buyer/analytics" element={<Analytics />} />
            <Route path="/buyer/consultation" element={<ConsultationRequestPage />} />
            <Route path="/buyer/schedule" element={<SchedulePage />} />
            <Route path="/buyer/advisory" element={<BuyerAdvisory />} />
            <Route path="/buyer/profile" element={<BuyerProfile />} />
          </Route>

          {/* Expert */}
          <Route element={<ProtectedRoute allowedRoles={["expert"]} />}>
            <Route path="/expert/dashboard" element={<ExpertDashboard />} />
            <Route path="/expert/consultation-requests" element={<ConsultationRequests />} />
            <Route path="/expert/active-consultations" element={<ActiveConsultations />} />
            <Route path="/expert/advisory" element={<ExpertAdvisory />} />
            <Route path="/expert/reports" element={<ExpertReports />} />
            <Route path="/expert/earnings" element={<Earnings />} />
            <Route path="/expert/reviews" element={<Reviews />} />
            <Route path="/expert/schedule" element={<Schedule />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<h1 className="text-center mt-10 text-2xl font-semibold">404 - Page Not Found</h1>} />

        </Route>

      </Routes>
    </Router>
  );
}

export default App;
