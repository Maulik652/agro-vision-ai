import { motion } from "framer-motion";
import { Mail, Phone, MapPin } from "lucide-react";
import { useState } from "react";

export default function Contact() {

  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // future backend integration here

    setSuccess("Message sent successfully!");

    setForm({
      name: "",
      email: "",
      message: "",
    });
  };

  return (
    <>
      
        <title>Contact | AgroVision AI</title>
        <meta
          name="description"
          content="Contact AgroVision AI for smart agriculture solutions and support."
        />
     

      <div className="min-h-screen bg-[#F8FAF5] px-6 py-20 flex items-center justify-center">

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl w-full bg-white rounded-3xl shadow-xl p-8 md:p-14 grid md:grid-cols-2 gap-10"
        >

          {/* LEFT */}
          <div>

            <h1 className="text-4xl font-bold mb-4">
              Contact Us 🌿
            </h1>

            <p className="text-slate-600 mb-8">
              Have questions? Our team is ready to help you with smart farming solutions.
            </p>

            <div className="space-y-6">

              <div className="flex items-center gap-4">
                <Mail className="text-green-700" />
                <span>support@agrovision.ai</span>
              </div>

              <div className="flex items-center gap-4">
                <Phone className="text-green-700" />
                <span>+91 XXXXX XXXXX</span>
              </div>

              <div className="flex items-center gap-4">
                <MapPin className="text-green-700" />
                <span>India — Smart Agriculture Innovation Center</span>
              </div>

            </div>

          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-5">

            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Full Name"
              className="w-full border px-4 py-3 rounded-xl focus:ring-2 focus:ring-green-400 outline-none"
            />

            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="Email Address"
              className="w-full border px-4 py-3 rounded-xl focus:ring-2 focus:ring-green-400 outline-none"
            />

            <textarea
              name="message"
              rows="4"
              value={form.message}
              onChange={handleChange}
              required
              placeholder="Your Message"
              className="w-full border px-4 py-3 rounded-xl focus:ring-2 focus:ring-green-400 outline-none"
            />

            <button
              type="submit"
              className="w-full bg-green-700 hover:bg-green-800 text-white py-3 rounded-xl transition"
            >
              Send Message
            </button>

            {success && (
              <p className="text-green-600 text-sm">
                {success}
              </p>
            )}

          </form>

        </motion.div>

      </div>
    </>
  );
}