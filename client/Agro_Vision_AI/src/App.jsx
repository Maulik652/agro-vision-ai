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
import FarmerAdvisory from "./pages/farmer/Advisory";
import Weather from "./pages/farmer/Weather";

/* Buyer Pages */
import BuyerDashboard from "./pages/buyer/BuyerDashboard";
import BuyerMarketplace from "./pages/buyer/Marketplace";
import BuyerOrders from "./pages/buyer/Orders";
import BuyerProfile from "./pages/buyer/Profile";

/* Expert Pages */
import ExpertDashboard from "./pages/expert/ExpertDashboard";
import ExpertAdvisory from "./pages/expert/Advisory";
import ExpertReports from "./pages/expert/Reports";
import ExpertProfile from "./pages/expert/Profile";
import { Toaster } from "react-hot-toast";

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
  <Route path="/farmer/advisory" element={<FarmerAdvisory />} />
  <Route path="/farmer/weather" element={<Weather />} />

</Route>

            {/* ================= BUYER ROUTES ================= */}
            <Route element={<ProtectedRoute allowedRoles={["farmer"]} />}>

  <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
  <Route path="/farmer/scan" element={<AIScan />} />
  <Route path="/farmer/predictions" element={<Predictions />} />
  <Route path="/farmer/marketplace" element={<FarmerMarketplace />} />
  <Route path="/farmer/advisory" element={<FarmerAdvisory />} />
  <Route path="/farmer/weather" element={<Weather />} />

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