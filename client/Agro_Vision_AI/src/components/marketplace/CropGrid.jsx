import CropCard from "./CropCard";

const CropGrid = ({
  crops,
  isLoading,
  isFetchingNextPage,
  onViewDetails,
  onChatFarmer,
  onAddToCart,
  addingCropId,
  isAdding
}) => {
  if (isLoading) {
    return (
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={`crop-skeleton-${index}`} className="h-96 animate-pulse rounded-2xl bg-white" />
        ))}
      </section>
    );
  }

  if (!crops.length) {
    return (
      <section className="rounded-2xl border border-dashed border-[#d2e5d6] bg-white p-6 text-center text-sm text-[#5f8268]">
        No crops found for selected filters.
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {crops.map((crop) => (
          <CropCard
            key={crop.id}
            crop={crop}
            onViewDetails={onViewDetails}
            onChatFarmer={onChatFarmer}
            onAddToCart={onAddToCart}
            isAdding={Boolean(isAdding && addingCropId === crop.id)}
          />
        ))}
      </div>

      {isFetchingNextPage ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`crop-next-skeleton-${index}`} className="h-96 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default CropGrid;
