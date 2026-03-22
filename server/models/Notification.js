import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    type: {
      type: String,
      required: true,
      enum: [
        "offer_received", "offer_accepted", "offer_rejected",
        "order_update", "order_cancelled", "price_alert", "weather_alert",
        "crop_reminder", "harvest_ready", "payment_received",
        "new_offer", "scan_result", "system", "farmgpt", "admin_broadcast"
      ]
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    read: {
      type: Boolean,
      default: false
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "critical"],
      default: "normal"
    },
    link: String,
    expiresAt: Date
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

// Push new notifications in real-time
notificationSchema.post("save", function (doc) {
  if (!doc.__v || doc.__v === 0) {
    // Emit to admin namespace
    import("../realtime/adminNamespace.js")
      .then(({ emitAdminNotification }) => emitAdminNotification(doc.toObject()))
      .catch(() => {});
    // Emit to the user's personal socket room
    import("../realtime/socketServer.js")
      .then(({ getSocketServer }) => {
        const io = getSocketServer();
        if (io && doc.user) {
          io.to(`user:${String(doc.user)}`).emit("new_notification", doc.toObject());
        }
      })
      .catch(() => {});
  }
});

export default mongoose.model("Notification", notificationSchema);
