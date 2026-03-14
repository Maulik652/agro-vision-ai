import { create } from "zustand";
import { persist } from "zustand/middleware";

const toNumber = (value, fallback = 0) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Cart state for crop detail page.
 * Item key includes both cropId and farmerId so one cart can hold multi-farmer orders.
 */
export const useCropDetailStore = create(
	persist(
		(set, get) => ({
			cartItems: [],
			upsertCartFromServer: (serverCart) => {
				const items = Array.isArray(serverCart?.items) ? serverCart.items : [];

				set({
					cartItems: items.map((item) => ({
						cropId: String(item.cropId || ""),
						farmerId: String(item.farmerId || ""),
						cropName: item.cropName || "Crop",
						image: item.image || "",
						pricePerKg: toNumber(item.pricePerKg, 0),
						quantity: toNumber(item.quantity, 0),
						note: item.note || ""
					}))
				});
			},
			addLocalItem: (item) => {
				set((state) => {
					const key = `${String(item.cropId)}::${String(item.farmerId)}`;
					const index = state.cartItems.findIndex(
						(existing) => `${existing.cropId}::${existing.farmerId}` === key
					);

					if (index < 0) {
						return {
							cartItems: [
								...state.cartItems,
								{
									cropId: String(item.cropId),
									farmerId: String(item.farmerId),
									cropName: item.cropName || "Crop",
									image: item.image || "",
									pricePerKg: toNumber(item.pricePerKg, 0),
									quantity: toNumber(item.quantity, 0),
									note: item.note || ""
								}
							]
						};
					}

					const nextItems = [...state.cartItems];
					nextItems[index] = {
						...nextItems[index],
						quantity: Number((toNumber(nextItems[index].quantity, 0) + toNumber(item.quantity, 0)).toFixed(2))
					};

					return { cartItems: nextItems };
				});
			},
			clearCart: () => set({ cartItems: [] }),
			getCartCount: () => get().cartItems.length
		}),
		{
			name: "crop-detail-cart-store",
			partialize: (state) => ({
				cartItems: state.cartItems
			})
		}
	)
);
