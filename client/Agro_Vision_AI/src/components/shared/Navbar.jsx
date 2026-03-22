import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, X, ShoppingCart } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "./NotificationBell";
import useCartStore from "../../store/cartStore.js";
import { fetchCart } from "../../services/cartAPI.js";
import ProfileAvatar   from "../profile/ProfileAvatar.jsx";
import ProfileDropdown from "../profile/ProfileDropdown.jsx";
import ProfilePanel    from "../profile/ProfilePanel.jsx";
import LanguageSwitcher from "./LanguageSwitcher.jsx";

const Navbar = () => {

  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const role = user?.role?.toLowerCase() || "guest";

  const [menuOpen,       setMenuOpen]       = useState(false);
  const [dropdownOpen,   setDropdownOpen]   = useState(false);
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);
  const { cart, setCart, getItemCount } = useCartStore();
  const cartCount = getItemCount();

  // Load cart count once when buyer logs in
  useEffect(() => {
    if (role === "buyer" && !cart) {
      fetchCart().then(setCart).catch(() => {});
    }
  }, [role, cart, setCart]);

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
      { name: "Dashboard",     path: "/farmer/dashboard"     },
      { name: "AI Scan",       path: "/farmer/scan"          },
      { name: "Predictions",   path: "/farmer/predictions"   },
      { name: "Advisory",      path: "/farmer/advisory"      },
      { name: "Marketplace",   path: "/farmer/marketplace"   },
      { name: "Sell Crop",     path: "/farmer/sell-crop"     },
      { name: "Weather",       path: "/farmer/weather"       },
      { name: "FarmGPT",       path: "/farmer/farmgpt"       },
      { name: "Consultation",  path: "/farmer/consultation"  },
      { name: "Chat",          path: "/farmer/chat"          },
    ],

    buyer: [
      { name: "Dashboard",    path: "/buyer/dashboard"    },
      { name: "Marketplace",  path: "/buyer/marketplace"  },

      { name: "Cart",         path: "/buyer/cart"         },
      { name: "Checkout",     path: "/buyer/checkout"     },
      { name: "Payment",      path: "/buyer/payment"      },
      { name: "Orders",       path: "/buyer/orders"       },
      { name: "Chat",         path: "/buyer/chat"         },
      { name: "Wallet",       path: "/buyer/wallet"       },
      { name: "Analytics",    path: "/buyer/analytics"    },
      { name: "Advisory",     path: "/buyer/advisory"     },
      { name: "Consultation", path: "/buyer/consultation" },
    ],

    expert: [
      { name: "Dashboard",              path: "/expert/dashboard"              },
      { name: "Consultation Requests",  path: "/expert/consultation-requests"  },
      { name: "Active Consultations",   path: "/expert/active-consultations"   },
      { name: "Advisory",               path: "/expert/advisory"               },
      { name: "Reports",                path: "/expert/reports"                },
      { name: "Earnings",               path: "/expert/earnings"               },
      { name: "Reviews",                path: "/expert/reviews"                },
      { name: "Schedule",               path: "/expert/schedule"               },
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
    <>
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
        <div className="hidden md:flex items-center gap-4 lg:gap-5 overflow-x-auto scrollbar-none flex-1 mx-6 justify-center">

          {navLinks.map((link) => (
            link.name === "Cart" ? (
              <NavLink key={link.name} to={link.path} className={navLinkStyle}>
                <span className="inline-flex items-center gap-1.5">
                  <ShoppingCart size={15} />
                  Cart
                  {cartCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-green-400 text-[#14532D] text-[10px] font-bold leading-none shrink-0">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </span>
              </NavLink>
            ) : (
              <NavLink key={link.name} to={link.path} className={navLinkStyle}>
                {link.name}
              </NavLink>
            )
          ))}

        </div>


        {/* Desktop Buttons */}
        <div className="hidden md:flex items-center gap-3">

          {/* Language switcher — always visible */}
          <LanguageSwitcher compact />

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

            <div className="flex items-center gap-3">

              {(role === "farmer" || role === "buyer") && <NotificationBell />}

              {/* Profile avatar + dropdown */}
              <div className="relative">
                <ProfileAvatar
                  user={user}
                  onClick={() => setDropdownOpen((v) => !v)}
                />
                <ProfileDropdown
                  user={user}
                  open={dropdownOpen}
                  onClose={() => setDropdownOpen(false)}
                  onOpenProfile={() => setProfilePanelOpen(true)}
                  onLogout={handleLogout}
                />
              </div>

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
            link.name === "Cart" ? (
              <NavLink key={link.name} to={link.path} className={navLinkStyle} onClick={() => setMenuOpen(false)}>
                <span className="inline-flex items-center gap-1.5">
                  <ShoppingCart size={14} />
                  Cart
                  {cartCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-green-400 text-[#14532D] text-[10px] font-bold leading-none shrink-0">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </span>
              </NavLink>
            ) : (
              <NavLink key={link.name} to={link.path} className={navLinkStyle} onClick={() => setMenuOpen(false)}>
                {link.name}
              </NavLink>
            )
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

            <div className="flex flex-col items-center gap-3 pt-1">
              <ProfileAvatar
                user={user}
                size="sm"
                onClick={() => { setMenuOpen(false); setProfilePanelOpen(true); }}
              />
              <p className="text-white/70 text-xs">{user.name}</p>
              <button
                onClick={() => { setMenuOpen(false); setProfilePanelOpen(true); }}
                className="text-xs text-green-400 font-medium"
              >
                View Profile
              </button>
              <button onClick={handleLogout} className="text-xs text-red-400">
                Sign Out
              </button>
            </div>

          )}

          {/* Language switcher in mobile menu */}
          <div className="pt-2">
            <LanguageSwitcher />
          </div>

        </div>

      )}

    </nav>

    {/* Profile panel — renders outside nav, over full page */}
    {user && (
      <ProfilePanel
        open={profilePanelOpen}
        onClose={() => setProfilePanelOpen(false)}
        onLogout={handleLogout}
      />
    )}
    </>
  );
};

export default Navbar;