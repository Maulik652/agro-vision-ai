import { z } from "zod";

const mongoId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid MongoDB ID");

const coerceInt = (min, max, def) =>
  z.preprocess((v) => (v === undefined || v === "" ? def : Number(v)), z.number().int().min(min).max(max));

export const startConversationSchema = z.object({
  farmerId: mongoId,
  cropId:   mongoId.optional(),
  cropName: z.string().max(100).optional(),
  orderId:  z.string().max(50).optional(),
});

export const sendMessageSchema = z.object({
  conversationId: mongoId,
  messageType:    z.enum(["text", "image", "order_reference"]).default("text"),
  text:           z.string().max(2000).optional(),
  imageUrl:       z.string().url().optional(),
  orderRef: z.object({
    orderId:     z.string().optional(),
    cropName:    z.string().optional(),
    quantity:    z.number().optional(),
    totalAmount: z.number().optional(),
  }).optional(),
});

export const getMessagesSchema = z.object({
  page:  coerceInt(1, 9999, 1),
  limit: coerceInt(1, 50, 30),
});
