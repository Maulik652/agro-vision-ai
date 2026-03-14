import { useMemo, useState } from "react";
import { ImagePlus, MessageCircle, Send, ShoppingCart, WalletCards } from "lucide-react";

const formatCurrency = (value) =>
	`₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(value || 0))}`;

const formatDate = (value) => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleTimeString("en-IN", {
		hour: "2-digit",
		minute: "2-digit"
	});
};

const MessageBubble = ({ message, isMine }) => {
	const isOffer = message.messageType === "offer";
	const isImage = message.messageType === "image";

	return (
		<div className={`max-w-[82%] rounded-xl px-3 py-2 text-sm ${isMine ? "ml-auto bg-green-600 text-white" : "bg-[#eef5ef] text-[#204d2c]"}`}>
			{isImage && message.imageUrl ? (
				<img src={message.imageUrl} alt="shared in chat" className="mb-1 max-h-36 w-full rounded-lg object-cover" />
			) : null}

			{isOffer ? (
				<div className={`rounded-lg border px-2.5 py-2 ${isMine ? "border-white/35 bg-white/10" : "border-[#d2e3d5] bg-white"}`}>
					<p className="font-semibold">Offer: {formatCurrency(message.offer?.amount || 0)} / kg</p>
					{message.offer?.quantity ? <p className="text-xs">Qty: {Number(message.offer.quantity).toLocaleString("en-IN")} kg</p> : null}
					{message.offer?.note ? <p className="mt-1 text-xs">{message.offer.note}</p> : null}
				</div>
			) : null}

			{message.text ? <p>{message.text}</p> : null}
			<p className={`mt-1 text-[11px] ${isMine ? "text-white/80" : "text-[#63816b]"}`}>{formatDate(message.createdAt)}</p>
		</div>
	);
};

const ActionPanel = ({
	crop,
	quantity,
	onQuantityChange,
	onAddToCart,
	onBuyNow,
	onStartChat,
	onSendMessage,
	chatMessages = [],
	currentUserId = "",
	isChatReady = false,
	isChatStarting = false,
	isSendingMessage = false,
	isAddingToCart = false,
	isBuyingNow = false
}) => {
	const [messageType, setMessageType] = useState("text");
	const [text, setText] = useState("");
	const [imageUrl, setImageUrl] = useState("");
	const [offerAmount, setOfferAmount] = useState("");
	const [offerQuantity, setOfferQuantity] = useState("");

	const total = useMemo(() => Number(quantity || 0) * Number(crop?.pricePerKg || 0), [quantity, crop?.pricePerKg]);

	const handleSendMessage = () => {
		if (!onSendMessage) return;

		if (messageType === "text" && text.trim().length < 1) return;
		if (messageType === "image" && !imageUrl.trim()) return;
		if (messageType === "offer" && !offerAmount) return;

		onSendMessage({
			messageType,
			text: text.trim(),
			imageUrl: imageUrl.trim(),
			offer: {
				amount: Number(offerAmount || 0),
				quantity: offerQuantity ? Number(offerQuantity) : null,
				note: text.trim()
			}
		});

		setText("");
		if (messageType === "image") setImageUrl("");
		if (messageType === "offer") {
			setOfferAmount("");
			setOfferQuantity("");
		}
	};

	return (
		<section className="space-y-4 rounded-3xl border border-[#d7ebda] bg-white p-4 shadow-[0_14px_30px_-22px_rgba(20,78,37,0.42)]">
			<h2 className="text-lg font-extrabold text-[#174a26]">Buyer Action Panel</h2>

			<div className="rounded-2xl border border-[#dcecdf] bg-[#f9fefb] p-3">
				<label htmlFor="quantity" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#5e8468]">
					Quantity (kg)
				</label>
				<div className="flex items-center gap-2">
					<input
						id="quantity"
						type="number"
						min="1"
						step="1"
						value={quantity}
						onChange={(event) => onQuantityChange?.(Number(event.target.value || 1))}
						className="w-full rounded-xl border border-[#cde0d1] bg-white px-3 py-2 text-sm text-[#234f2e] outline-none transition focus:border-green-400"
					/>
					<p className="text-sm font-extrabold text-[#1b4f29]">{formatCurrency(total)}</p>
				</div>
			</div>

			<div className="grid gap-2 sm:grid-cols-2">
				<button
					type="button"
					onClick={onAddToCart}
					disabled={isAddingToCart}
					className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
				>
					<ShoppingCart size={15} />
					{isAddingToCart ? "Adding..." : "Add to Cart"}
				</button>
				<button
					type="button"
					onClick={onBuyNow}
					disabled={isBuyingNow}
					className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f6cd2] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#0e5fb8] disabled:cursor-not-allowed disabled:opacity-60"
				>
					<WalletCards size={15} />
					{isBuyingNow ? "Processing..." : "Buy Now"}
				</button>
			</div>

			<div className="rounded-2xl border border-[#dcecdf] bg-[#f9fefb] p-3">
				<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
					<p className="inline-flex items-center gap-2 text-sm font-bold text-[#21592f]">
						<MessageCircle size={15} />
						Chat Farmer
					</p>
					<button
						type="button"
						onClick={onStartChat}
						disabled={isChatStarting}
						className="rounded-lg border border-[#cde0d1] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#2c6e3d] transition hover:bg-[#ecf8ee] disabled:opacity-60"
					>
						{isChatStarting ? "Connecting..." : isChatReady ? "Connected" : "Start Chat"}
					</button>
				</div>

				<div className="mb-2 h-48 space-y-2 overflow-y-auto rounded-xl border border-[#d9e9dc] bg-white p-2.5">
					{chatMessages.length ? (
						chatMessages.map((message) => (
							<MessageBubble
								key={message.id || `${message.createdAt}-${message.fromUserId}`}
								message={message}
								isMine={String(message.fromUserId || "") === String(currentUserId || "")}
							/>
						))
					) : (
						<p className="text-xs text-[#6e8e75]">No messages yet. Start chat to negotiate with farmer.</p>
					)}
				</div>

				<div className="mb-2 flex items-center gap-2">
					<select
						value={messageType}
						onChange={(event) => setMessageType(event.target.value)}
						className="rounded-lg border border-[#cde0d1] bg-white px-2 py-2 text-xs font-semibold text-[#315f3c]"
					>
						<option value="text">Text</option>
						<option value="image">Image</option>
						<option value="offer">Offer</option>
					</select>
				</div>

				{messageType === "image" ? (
					<div className="mb-2 flex items-center gap-2">
						<ImagePlus size={14} className="text-[#5e8367]" />
						<input
							type="url"
							value={imageUrl}
							onChange={(event) => setImageUrl(event.target.value)}
							placeholder="Paste image URL"
							className="w-full rounded-lg border border-[#cde0d1] bg-white px-3 py-2 text-xs outline-none transition focus:border-green-400"
						/>
					</div>
				) : null}

				{messageType === "offer" ? (
					<div className="mb-2 grid gap-2 sm:grid-cols-2">
						<input
							type="number"
							min="1"
							step="0.1"
							value={offerAmount}
							onChange={(event) => setOfferAmount(event.target.value)}
							placeholder="Offer ₹ / kg"
							className="rounded-lg border border-[#cde0d1] bg-white px-3 py-2 text-xs outline-none transition focus:border-green-400"
						/>
						<input
							type="number"
							min="1"
							step="1"
							value={offerQuantity}
							onChange={(event) => setOfferQuantity(event.target.value)}
							placeholder="Offer quantity (kg)"
							className="rounded-lg border border-[#cde0d1] bg-white px-3 py-2 text-xs outline-none transition focus:border-green-400"
						/>
					</div>
				) : null}

				<div className="flex gap-2">
					<input
						type="text"
						value={text}
						onChange={(event) => setText(event.target.value)}
						placeholder={messageType === "offer" ? "Offer note (optional)" : "Type your message"}
						className="w-full rounded-xl border border-[#cde0d1] bg-white px-3 py-2 text-sm outline-none transition focus:border-green-400"
					/>
					<button
						type="button"
						onClick={handleSendMessage}
						disabled={!isChatReady || isSendingMessage}
						className="inline-flex items-center gap-1 rounded-xl bg-[#2f7d3f] px-3 py-2 text-sm font-bold text-white transition hover:bg-[#266b35] disabled:cursor-not-allowed disabled:opacity-60"
					>
						<Send size={14} />
						Send
					</button>
				</div>
			</div>
		</section>
	);
};

export default ActionPanel;
