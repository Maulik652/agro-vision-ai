import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ProfilePanel from "../../components/profile/ProfilePanel";

/**
 * Dedicated buyer profile page at /buyer/profile.
 * Renders the full-screen ProfilePanel overlay on top of a minimal background.
 * Closing the panel navigates back to the dashboard.
 */
export default function BuyerProfile() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(false);
    navigate("/buyer/dashboard");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">
      <ProfilePanel open={open} onClose={handleClose} onLogout={handleLogout} />
    </div>
  );
}
