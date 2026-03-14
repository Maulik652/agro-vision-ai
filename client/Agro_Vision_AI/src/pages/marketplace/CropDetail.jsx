import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion as Motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import {
  addCropToCart,
  fetchAICropInsights,
  fetchCropDetail,
  fetchCropReviews,
  fetchFarmerDetail,
  fetchSimilarCrops,
  submitCropReview
} from "../../api/cropDetailApi";
import ActionPanel from "../../components/cropDetail/ActionPanel";
import AIInsights from "../../components/cropDetail/AIInsights";
import CropGallery from "../../components/cropDetail/CropGallery";
import CropInfo from "../../components/cropDetail/CropInfo";
import FarmerCard from "../../components/cropDetail/FarmerCard";
import QualityMetrics from "../../components/cropDetail/QualityMetrics";
import ReviewSection from "../../components/cropDetail/ReviewSection";
import SimilarCrops from "../../components/cropDetail/SimilarCrops";
import { connectCropDetailSocket } from "../../realtime/cropDetailSocket";
import { useCropDetailStore } from "../../store/cropDetailStore";

const CropDetailSkeleton = () => (
  <div className="space-y-4">
    <div className="h-12 animate-pulse rounded-2xl bg-white" />
    <div className="grid gap-4 lg:grid-cols-[1.05fr,0.95fr]">
      <div className="h-112.5 animate-pulse rounded-3xl bg-white" />
      <div className="space-y-4">
        <div className="h-56 animate-pulse rounded-3xl bg-white" />
        <div className="h-56 animate-pulse rounded-3xl bg-white" />
      </div>
    </div>
    <div className="h-56 animate-pulse rounded-3xl bg-white" />
  </div>
);

const CropDetail = () => {
  const { id: cropId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const token = localStorage.getItem("token");
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const currentUserId = String(user?._id || "");
  const canSubmitReview = ["buyer", "admin"].includes(String(user?.role || "").toLowerCase());

  const [quantity, setQuantity] = useState(1);
  const [chatMessages, setChatMessages] = useState([]);
  const [conversationId, setConversationId] = useState("");
  const [isChatReady, setIsChatReady] = useState(false);
  const [isChatStarting, setIsChatStarting] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const socketRef = useRef(null);

  const upsertCartFromServer = useCropDetailStore((state) => state.upsertCartFromServer);

  const cropQuery = useQuery({
    queryKey: ["crop-detail", cropId],
    queryFn: () => fetchCropDetail(cropId),
    enabled: Boolean(cropId),
    staleTime: 60_000
  });

  const crop = cropQuery.data?.crop || null;
  const farmerFromCrop = cropQuery.data?.farmer || null;
  const farmerId = String(crop?.farmerId || farmerFromCrop?.id || "");

  const farmerQuery = useQuery({
    queryKey: ["crop-detail-farmer", farmerId],
    queryFn: () => fetchFarmerDetail(farmerId),
    enabled: Boolean(farmerId),
    staleTime: 2 * 60 * 1000
  });

  const reviewsQuery = useQuery({
    queryKey: ["crop-detail-reviews", cropId],
    queryFn: () => fetchCropReviews(cropId, { page: 1, limit: 8 }),
    enabled: Boolean(cropId),
    staleTime: 30_000
  });

  const similarQuery = useQuery({
    queryKey: ["crop-detail-similar", cropId],
    queryFn: () => fetchSimilarCrops(cropId, { limit: 10 }),
    enabled: Boolean(cropId),
    staleTime: 60_000
  });

  const insightsQuery = useQuery({
    queryKey: ["crop-detail-ai-insights", cropId],
    queryFn: () => fetchAICropInsights(cropId),
    enabled: Boolean(cropId),
    staleTime: 60_000
  });

  const addToCartMutation = useMutation({
    mutationFn: (payload) => addCropToCart(payload),
    onSuccess: (response) => {
      upsertCartFromServer(response?.cart);
      toast.success(response?.message || "Added to cart");
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Unable to add crop to cart");
    }
  });

  const buyNowMutation = useMutation({
    mutationFn: (payload) => addCropToCart({ ...payload, buyNow: true }),
    onSuccess: (response) => {
      upsertCartFromServer(response?.cart);
      toast.success(response?.message || "Ready for instant purchase");
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Unable to process buy now");
    }
  });

  const reviewMutation = useMutation({
    mutationFn: (payload) => submitCropReview(cropId, payload),
    onSuccess: () => {
      toast.success("Review submitted");
      queryClient.invalidateQueries({ queryKey: ["crop-detail-reviews", cropId] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Unable to submit review");
    }
  });

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (!token) {
      return undefined;
    }

    const nextSocket = connectCropDetailSocket(token);
    socketRef.current = nextSocket;

    const handleReceiveMessage = (payload = {}) => {
      if (payload.type === "error") {
        toast.error(payload.message || "Chat error");
        return;
      }

      if (payload.type === "history") {
        setConversationId(payload.conversationId || "");
        setChatMessages(Array.isArray(payload.messages) ? payload.messages : []);
        setIsChatReady(true);
        return;
      }

      if (payload.type === "message" && payload.message) {
        setConversationId(payload.conversationId || "");
        setIsChatReady(true);
        setChatMessages((previous) => {
          const messageId = String(payload.message.id || "");
          if (!messageId) return previous;
          if (previous.some((row) => String(row.id) === messageId)) return previous;
          return [...previous, payload.message];
        });
        return;
      }

      if (payload.type === "incoming" && payload.message) {
        setChatMessages((previous) => {
          const messageId = String(payload.message.id || "");
          if (!messageId || previous.some((row) => String(row.id) === messageId)) return previous;
          return [...previous, payload.message];
        });
      }
    };

    nextSocket.on("receive_message", handleReceiveMessage);

    return () => {
      nextSocket.off("receive_message", handleReceiveMessage);
      nextSocket.disconnect();
      if (socketRef.current === nextSocket) {
        socketRef.current = null;
      }
    };
  }, [token]);

  const startChat = () => {
    const socket = socketRef.current;
    if (!socket || !crop || !farmerId) {
      toast.error("Chat not available right now");
      return;
    }

    setIsChatStarting(true);
    socket.emit(
      "start_chat",
      {
        cropId,
        farmerId,
        targetUserId: farmerId
      },
      (ack) => {
        setIsChatStarting(false);
        if (!ack?.success) {
          toast.error(ack?.message || "Unable to start chat");
          return;
        }
        setIsChatReady(true);
        setConversationId(ack.conversationId || "");
        setChatMessages(Array.isArray(ack.messages) ? ack.messages : []);
      }
    );
  };

  const sendChatMessage = (payload) => {
    const socket = socketRef.current;
    if (!socket || !crop || !farmerId) {
      toast.error("Chat not connected");
      return;
    }

    if (!isChatReady) {
      toast.error("Start chat first");
      return;
    }

    setIsSendingMessage(true);
    socket.emit(
      "send_message",
      {
        conversationId,
        cropId,
        farmerId,
        targetUserId: farmerId,
        ...payload
      },
      (ack) => {
        setIsSendingMessage(false);
        if (!ack?.success) {
          toast.error(ack?.message || "Unable to send message");
        }
      }
    );
  };

  const handleAddToCart = () => {
    if (!crop || !farmerId) return;

    addToCartMutation.mutate({
      cropId: crop.id,
      farmerId,
      quantity,
      note: ""
    });
  };

  const handleBuyNow = () => {
    if (!crop || !farmerId) return;

    buyNowMutation.mutate({
      cropId: crop.id,
      farmerId,
      quantity,
      note: ""
    });
  };

  const pageLoading = cropQuery.isLoading;
  const pageError = cropQuery.error?.response?.data?.message || cropQuery.error?.message;

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-[#f5fff6] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <CropDetailSkeleton />
        </div>
      </div>
    );
  }

  if (pageError || !crop) {
    return (
      <div className="min-h-screen bg-[#f5fff6] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {pageError || "Unable to load crop detail"}
        </div>
      </div>
    );
  }

  const farmer = farmerQuery.data?.farmer || farmerFromCrop;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f3fff4,#fbfffb)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <Motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-2"
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#cde1d1] bg-white px-3 py-2 text-sm font-semibold text-[#2a6b3a] transition hover:bg-[#eef8f0]"
          >
            <ArrowLeft size={15} />
            Back to Marketplace
          </button>
        </Motion.div>

        <section className="grid gap-4 lg:grid-cols-[1.05fr,0.95fr]">
          <CropGallery images={crop.images} cropName={crop.cropName} />

          <div className="space-y-4">
            <CropInfo crop={crop} />
            <FarmerCard
              farmer={farmer}
              onChatFarmer={startChat}
              onViewFarmerProfile={() => toast.success("Farmer profile page is managed by your app shell")}
            />
            <ActionPanel
              crop={crop}
              quantity={quantity}
              onQuantityChange={(next) => setQuantity(Math.max(1, next || 1))}
              onAddToCart={handleAddToCart}
              onBuyNow={handleBuyNow}
              onStartChat={startChat}
              onSendMessage={sendChatMessage}
              chatMessages={chatMessages}
              currentUserId={currentUserId}
              isChatReady={isChatReady}
              isChatStarting={isChatStarting}
              isSendingMessage={isSendingMessage}
              isAddingToCart={addToCartMutation.isPending}
              isBuyingNow={buyNowMutation.isPending}
            />
          </div>
        </section>

        <AIInsights
          insights={insightsQuery.data?.insights || null}
          source={insightsQuery.data?.source || "fallback"}
        />

        <QualityMetrics metrics={crop.qualityMetrics} />

        <ReviewSection
          reviews={reviewsQuery.data?.reviews || []}
          avgRating={reviewsQuery.data?.avgRating || 0}
          canSubmit={canSubmitReview}
          onSubmitReview={(payload) => reviewMutation.mutate(payload)}
          isSubmitting={reviewMutation.isPending}
        />

        <SimilarCrops
          crops={similarQuery.data?.similarCrops || []}
          onViewCrop={(nextCropId) => navigate(`/marketplace/crop/${nextCropId}`)}
        />
      </div>
    </main>
  );
};

export default CropDetail;
