import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

const Navbar = () => {

  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const role = user?.role?.toLowerCase() || "guest";

  const [menuOpen, setMenuOpen] = useState(false);

  /* =========================
     Active Link Style
  ========================= */
  const navLinkStyle = ({ isActive }) =>
    `text-sm font-medium transition duration-300 whitespace-nowrap ${
      isActive
        ? "text-green-400"
        : "text-slate-200 hover:text-green-400"
    }`;


  /* =========================
     Role Based Links
  ========================= */

  const links = {
    guest: [
      { name: "Home", path: "/" },
      { name: "Features", path: "/features" },
      { name: "AI Insights", path: "/ai" },
      { name: "About", path: "/about" },
      { name: "Contact", path: "/contact" }
    ],

    farmer: [
      { name: "Dashboard", path: "/farmer/dashboard" },
      { name: "AI Scan", path: "/farmer/scan" },
      { name: "Predictions", path: "/farmer/predictions" },
      { name: "Advisory", path: "/farmer/advisory" },
      { name: "Marketplace", path: "/farmer/marketplace" },
      { name: "Sell Crop", path: "/farmer/sell-crop" },
      { name: "Weather", path: "/farmer/weather" },
      { name: "FarmGPT", path: "/farmer/farmgpt" }
    ],

    buyer: [
      { name: "Dashboard", path: "/buyer/dashboard" },
      { name: "Marketplace", path: "/buyer/marketplace" },
      { name: "Orders", path: "/buyer/orders" },
      { name: "Profile", path: "/buyer/profile" }
    ],

    expert: [
      { name: "Dashboard", path: "/expert/dashboard" },
      { name: "Advisory", path: "/expert/advisory" },
      { name: "Reports", path: "/expert/reports" },
      { name: "Profile", path: "/expert/profile" }
    ],

    admin: [
      { name: "Admin Dashboard", path: "/admin/dashboard" }
    ]
  };

  const navLinks = links[role] || links.guest;


  /* =========================
     Logout
  ========================= */

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleNavigate = (path) => {
    setMenuOpen(false);
    navigate(path);
  };


  return (

    <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#14532D]/95 border-b border-white/10">

      <div className="max-w-7xl mx-auto h-16 flex items-center justify-between px-6">

        {/* Logo */}
        <div
          onClick={() => handleNavigate("/")}
          className="text-lg font-semibold text-white cursor-pointer hover:text-green-400 transition"
        >
          🌿 AgroVision AI 🌿
        </div>


        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-5 lg:gap-6">

          {navLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              className={navLinkStyle}
            >
              {link.name}
            </NavLink>
          ))}

        </div>


        {/* Desktop Buttons */}
        <div className="hidden md:flex items-center gap-3">

          {!user ? (

            <>
              <button
                onClick={() => navigate("/login")}
                className="px-4 py-1.5 text-sm border border-white/30 text-white rounded-md hover:bg-white/10 transition"
              >
                Login
              </button>

              <button
                onClick={() => navigate("/register")}
                className="px-4 py-1.5 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 transition"
              >
                Get Started
              </button>
            </>

          ) : (

            <div className="flex items-center gap-4">

              {role === "farmer" && <NotificationBell />}

              <span className="text-white text-sm hidden lg:block">
                {user.name}
              </span>

              <button
                onClick={handleLogout}
                className="px-4 py-1.5 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition"
              >
                Logout
              </button>

            </div>

          )}

        </div>


        {/* Mobile Toggle */}
        <div className="md:hidden">

          <button onClick={() => setMenuOpen(!menuOpen)}>

            {menuOpen
              ? <X color="white" />
              : <Menu color="white" />
            }

          </button>

        </div>

      </div>


      {/* Mobile Menu */}
      {menuOpen && (

        <div className="md:hidden bg-[#14532D] py-4 flex flex-col items-center gap-3">

          {navLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              className={navLinkStyle}
              onClick={() => setMenuOpen(false)}
            >
              {link.name}
            </NavLink>
          ))}

          {!user ? (

            <>
              <button
                onClick={() => handleNavigate("/login")}
                className="text-white"
              >
                Login
              </button>

              <button
                onClick={() => handleNavigate("/register")}
                className="text-white"
              >
                Register
              </button>
            </>

          ) : (

            <>
              <span className="text-white text-sm">
                {user.name}
              </span>

              <button
                onClick={handleLogout}
                className="text-red-400"
              >
                Logout
              </button>
            </>

          )}

        </div>

      )}

    </nav>

  );

};

export default Navbar;