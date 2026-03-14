import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";

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
import SatelliteMonitoring from "./pages/farmer/SatelliteMonitoring";
import FarmGPT from "./pages/farmer/FarmGPT";
import FarmManager from "./pages/farmer/FarmManager";
import CropCalendar from "./pages/farmer/CropCalendar";
import FarmFinance from "./pages/farmer/FarmFinance";
import Community from "./pages/farmer/Community";

/* Buyer Pages */
import BuyerDashboard from "./pages/buyer/BuyerDashboard";
import BuyerMarketplace from "./pages/buyer/Marketplace";
import BuyerOrders from "./pages/buyer/Orders";
import BuyerProfile from "./pages/buyer/Profile";
import Cart from "./pages/buyer/Cart";
import Checkout from "./pages/buyer/Checkout";
import Payment from "./pages/buyer/Payment";
import Chat from "./pages/buyer/Chat";
import Wallet from "./pages/buyer/Wallet";

/* Expert Pages */
import ExpertDashboard from "./pages/expert/ExpertDashboard";
import ExpertAdvisory from "./pages/expert/Advisory";
import ExpertReports from "./pages/expert/Reports";
import ExpertProfile from "./pages/expert/Profile";
import CropDetail from "./pages/marketplace/CropDetail";
import { Toaster } from "react-hot-toast";
import CropDetails from "./pages/buyer/CropDetails";

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
       <Toaster position="top-right" reverseOrder={false} />
        {/* Navbar */}
        <Navbar />

        {/* Page Content */}
        <div className="grow">
          <Routes>

            {/* ================= GUEST ROUTES ================= */}
            <Route path="/" element={<Home />} />
            <Route path="/features" element={<Features />} />
            <Route path="/ai" element={<AIInsights />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* ================= FARMER ROUTES ================= */}
            <Route element={<ProtectedRoute allowedRoles={["farmer"]} />}>

  <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
  <Route path="/farmer/scan" element={<AIScan />} />
  <Route path="/farmer/predictions" element={<Predictions />} />
  <Route path="/farmer/marketplace" element={<FarmerMarketplace />} />
  <Route path="/farmer/sell-crop" element={<SellCrop />} />
  <Route path="/farmer/advisory" element={<FarmerAdvisory />} />
  <Route path="/farmer/weather" element={<Weather />} />
  <Route path="/farmer/satellite-monitoring" element={<SatelliteMonitoring />} />
  <Route path="/farmer/farmgpt" element={<FarmGPT />} />
  <Route path="/farmer/farm-manager" element={<FarmManager />} />
  <Route path="/farmer/crop-calendar" element={<CropCalendar />} />
  <Route path="/farmer/finance" element={<FarmFinance />} />
  <Route path="/farmer/community" element={<Community />} />

</Route>

            <Route element={<ProtectedRoute allowedRoles={["farmer", "buyer"]} />}>
              <Route path="/marketplace/crop/:id" element={<CropDetail />} />
            </Route>

            {/* ================= BUYER ROUTES ================= */}
            <Route element={<ProtectedRoute allowedRoles={["buyer"]} />}>

  <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
  <Route path="/buyer/marketplace" element={<BuyerMarketplace />} />
  <Route path="/buyer/cropdetails" element={<CropDetails />} />
  <Route path="/buyer/cart" element={<Cart />} />
  <Route path="/buyer/checkout" element={<Checkout />} />
  <Route path="/buyer/payment" element={<Payment />} />
  <Route path="/buyer/orders" element={<BuyerOrders />} />
  <Route path="/buyer/chat" element={<Chat />} />
  <Route path="/buyer/wallet" element={<Wallet />} />
  <Route path="/buyer/profile" element={<BuyerProfile />} />

</Route>

            {/* ================= EXPERT ROUTES ================= */}
           <Route element={<ProtectedRoute allowedRoles={["expert"]} />}>

  <Route path="/expert/dashboard" element={<ExpertDashboard />} />
  <Route path="/expert/advisory" element={<ExpertAdvisory />} />
  <Route path="/expert/reports" element={<ExpertReports />} />
  <Route path="/expert/profile" element={<ExpertProfile />} />

</Route>
            {/* ================= 404 ================= */}
            <Route
              path="*"
              element={
                <h1 className="text-center mt-10 text-2xl font-semibold">
                  404 - Page Not Found
                </h1>
              }
            />

          </Routes>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </Router>
  );
}

export default App;