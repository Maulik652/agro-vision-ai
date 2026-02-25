import React from "react";
import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-linear-to-b from-[#14532D] to-[#052e16] text-white mt-20">

      {/* MAIN SECTION */}
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-12">

        {/* BRAND */}
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            🌿 AgroVision_AI 🌿
          </h2>

          <p className="text-sm text-green-200 mt-4 leading-relaxed">
            Empowering Agriculture with Artificial Intelligence.
            Smart insights, precision farming, and intelligent
            decision support for modern farmers.
          </p>

          <p className="text-xs text-green-400 mt-3 italic">
            Smart Farming • Smart Future • Smart Farmers
          </p>
        </div>

        {/* NAVIGATION */}
        <div>
          <h3 className="text-sm font-semibold text-green-300 mb-4 uppercase tracking-wider">
            Navigation
          </h3>

          <ul className="space-y-3 text-sm text-green-100">
            <li><FooterLink to="/">Home</FooterLink></li>
            <li><FooterLink to="/features">Features</FooterLink></li>
            <li><FooterLink to="/ai">AI Insights</FooterLink></li>
            <li><FooterLink to="/about">About</FooterLink></li>
            <li><FooterLink to="/contact">Contact</FooterLink></li>
          </ul>
        </div>

        {/* PLATFORM */}
        <div>
          <h3 className="text-sm font-semibold text-green-300 mb-4 uppercase tracking-wider">
            Platform
          </h3>

          <ul className="space-y-3 text-sm text-green-100">
            <li><FooterLink to="/smart-farming">Smart Farming</FooterLink></li>
            <li><FooterLink to="/crop-monitoring">Crop Monitoring</FooterLink></li>
            <li><FooterLink to="/marketplace">Marketplace</FooterLink></li>
            <li><FooterLink to="/advisory">Expert Advisory</FooterLink></li>
            <li><FooterLink to="/ai-predictions">AI Predictions</FooterLink></li>
          </ul>
        </div>

        {/* CONTACT + NEWSLETTER */}
        <div>
          <h3 className="text-sm font-semibold text-green-300 mb-4 uppercase tracking-wider">
            Contact
          </h3>

          <ul className="space-y-2 text-sm text-green-100">
            <li>📍 Surat, Gujarat, India</li>
            <li>📧 support@agrovision.ai</li>
            <li>📞 +91 XXXXX XXXXX</li>
          </ul>

          {/* NEWSLETTER */}
          <div className="mt-6">
            <p className="text-sm text-green-300 mb-2">
              Subscribe for Updates
            </p>

            <div className="flex">
              <input
                type="email"
                placeholder="Enter email"
                className="px-3 py-2 text-sm rounded-l-md text-black outline-none w-full"
              />
              <button className="bg-[#22C55E] px-4 py-2 text-sm rounded-r-md hover:bg-green-400 transition">
                Subscribe
              </button>
            </div>
          </div>

          {/* SOCIAL ICONS */}
          <div className="flex gap-3 mt-6">
            <SocialIcon href="https://facebook.com">
              <Facebook size={16} />
            </SocialIcon>

            <SocialIcon href="https://twitter.com">
              <Twitter size={16} />
            </SocialIcon>

            <SocialIcon href="https://instagram.com">
              <Instagram size={16} />
            </SocialIcon>

            <SocialIcon href="https://linkedin.com">
              <Linkedin size={16} />
            </SocialIcon>
          </div>
        </div>
      </div>

      {/* DIVIDER */}
      <div className="border-t border-green-900"></div>

      {/* BOTTOM SECTION */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center text-xs text-green-300 gap-4">

        <div className="flex gap-6">
          <FooterLink to="/privacy">Privacy Policy</FooterLink>
          <FooterLink to="/terms">Terms of Service</FooterLink>
          <FooterLink to="/help">Help Center</FooterLink>
        </div>

        <div>
          © {new Date().getFullYear()} AgroVision_AI. All rights reserved.
        </div>

      </div>
    </footer>
  );
};

/* Internal Link Component */
const FooterLink = ({ to, children }) => (
  <Link
    to={to}
    className="hover:text-white hover:translate-x-1 transition-all duration-200 cursor-pointer"
  >
    {children}
  </Link>
);

/* Social External Link Component */
const SocialIcon = ({ href, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="
      p-2
      rounded-md
      bg-green-800/40
      hover:bg-[#22C55E]
      hover:scale-110
      hover:-translate-y-1
      transition-all
      duration-300
      cursor-pointer
    "
  >
    {children}
  </a>
);

export default Footer;