import { useState } from "react";
import { MessageSquareText, Star } from "lucide-react";

const renderStars = (rating = 0) =>
	Array.from({ length: 5 }).map((_, index) => (
		<Star
			key={`star-${index}`}
			size={14}
			className={index < rating ? "text-amber-500" : "text-gray-300"}
			fill={index < rating ? "currentColor" : "none"}
		/>
	));

const formatDate = (value) => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "N/A";
	return date.toLocaleDateString("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric"
	});
};

const ReviewSection = ({ reviews = [], avgRating = 0, canSubmit = false, onSubmitReview, isSubmitting = false }) => {
	const [rating, setRating] = useState(5);
	const [reviewText, setReviewText] = useState("");

	const handleSubmit = (event) => {
		event.preventDefault();
		if (!onSubmitReview) return;
		onSubmitReview({ rating, reviewText: reviewText.trim() });
		setReviewText("");
	};

	return (
		<section className="rounded-3xl border border-[#d7ebda] bg-white p-4 shadow-[0_14px_30px_-22px_rgba(20,78,37,0.42)]">
			<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
				<h2 className="text-lg font-extrabold text-[#174a26]">Reviews & Ratings</h2>
				<div className="inline-flex items-center gap-1 rounded-full bg-[#fff7e8] px-3 py-1 text-sm font-bold text-[#8a6717]">
					{renderStars(Math.round(Number(avgRating || 0)))}
					<span className="ml-1">{Number(avgRating || 0).toFixed(1)}</span>
				</div>
			</div>

			<div className="space-y-2">
				{reviews.length ? (
					reviews.map((review) => (
						<article key={review.id} className="rounded-xl border border-[#deece1] bg-[#fbfffc] p-3">
							<div className="mb-1 flex items-center justify-between gap-2">
								<p className="font-semibold text-[#21592f]">{review.buyerName || "Buyer"}</p>
								<p className="text-xs text-[#6f8f76]">{formatDate(review.createdAt)}</p>
							</div>
							<div className="mb-1 inline-flex items-center gap-1">{renderStars(review.rating)}</div>
							<p className="text-sm text-[#3f6648]">{review.reviewText || "No review text"}</p>
						</article>
					))
				) : (
					<div className="rounded-xl border border-dashed border-[#d7e8da] bg-[#f8fdf9] p-4 text-sm text-[#5c8065]">
						No reviews yet for this crop.
					</div>
				)}
			</div>

			{canSubmit && (
				<form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-2xl border border-[#d9eadc] bg-[#f9fefb] p-3">
					<p className="inline-flex items-center gap-2 text-sm font-bold text-[#205a2f]">
						<MessageSquareText size={15} />
						Submit your review
					</p>

					<div className="flex items-center gap-2">
						<label htmlFor="rating" className="text-xs font-semibold uppercase tracking-wide text-[#64866d]">Rating</label>
						<select
							id="rating"
							value={rating}
							onChange={(event) => setRating(Number(event.target.value))}
							className="rounded-lg border border-[#cddfcf] bg-white px-2 py-1.5 text-sm"
						>
							<option value={5}>5 - Excellent</option>
							<option value={4}>4 - Good</option>
							<option value={3}>3 - Average</option>
							<option value={2}>2 - Poor</option>
							<option value={1}>1 - Bad</option>
						</select>
					</div>

					<textarea
						value={reviewText}
						onChange={(event) => setReviewText(event.target.value)}
						rows={3}
						required
						placeholder="Share your buying experience for this crop"
						className="w-full rounded-xl border border-[#cfe2d3] bg-white px-3 py-2 text-sm text-[#234f2e] outline-none transition focus:border-green-400"
					/>

					<button
						type="submit"
						disabled={isSubmitting || reviewText.trim().length < 3}
						className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isSubmitting ? "Submitting..." : "Submit Review"}
					</button>
				</form>
			)}
		</section>
	);
};

export default ReviewSection;
