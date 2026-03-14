const PaginationControls = ({ pageInfo, onLoadMore, canLoadMore, isLoadingMore }) => (
  <section className="rounded-2xl border border-[#d8e9dc] bg-white p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs font-semibold text-[#5f8268]">
        Page {Number(pageInfo.currentPage || 1)} of {Number(pageInfo.totalPages || 1)} · {Number(pageInfo.totalItems || 0)} crops
      </p>

      <button
        type="button"
        onClick={onLoadMore}
        disabled={!canLoadMore || isLoadingMore}
        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoadingMore ? "Loading more..." : canLoadMore ? "Load more" : "No more crops"}
      </button>
    </div>
  </section>
);

export default PaginationControls;
