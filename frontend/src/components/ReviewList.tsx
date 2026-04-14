import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import StarIcon from "@mui/icons-material/Star";
import toast from "react-hot-toast";
import { useAppSelector } from "../store/hooks";
import { getAuthHeader } from "../../utils/auth";
import { currentLocaleLoginHref } from "../i18n/locales";
import { graphqlFetchHeaders } from "../lib/graphqlHeaders";
import { graphqlHttpPost } from "../lib/graphqlClient";
import { useLocale } from "../hooks/useLocalizedPath";
import { useTranslation } from "react-i18next";

export type Review = {
  id: string;
  createdAt: string;
  rating: number;
  comment: string;
  user: { id?: string; name: string };
  product: { id: string; title: string };
};

const MAX_COMMENT_LEN = 120;

const CREATE_REVIEW_MUTATION = `
  mutation CreateReview($input: CreateReviewInput!) {
    createReview(input: $input) {
      id
      createdAt
      rating
      comment
      user {
        id
        name
      }
      product {
        id
        title
      }
    }
  }
`;

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-CA");
}

function truncateComment(comment: string, maxLen: number = MAX_COMMENT_LEN) {
  if (comment.length <= maxLen) return comment;
  return comment.slice(0, maxLen) + "…";
}

function clampRating(value: number): number {
  // Backend uses Int, but we defensively clamp in case the data shape changes.
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(5, Math.round(value)));
}

function Stars({ rating }: { rating: number }) {
  const safeRating = clampRating(rating);

  return (
    <Box sx={{ display: "flex", gap: 0.25, alignItems: "center" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <StarIcon
          key={i}
          fontSize="small"
          sx={{
            color: i < safeRating ? "#ffc107" : "action.disabled",
          }}
        />
      ))}
    </Box>
  );
}

function StarsPicker({
  rating,
  onChange,
}: {
  rating: number;
  onChange: (next: number) => void;
}) {
  const { t } = useTranslation();
  const safeRating = clampRating(rating);

  return (
    <Box sx={{ display: "flex", gap: 0.25, alignItems: "center" }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const value = i + 1;
        const isSelected = value <= safeRating;
        return (
          <IconButton
            key={value}
            aria-label={t("reviews.ariaRate", { n: value })}
            onClick={() => onChange(value)}
            size="small"
            sx={{ p: 0.25 }}
          >
            <StarIcon
              fontSize="small"
              sx={{ color: isSelected ? "#ffc107" : "action.disabled" }}
            />
          </IconButton>
        );
      })}
    </Box>
  );
}

type ReviewListProps = {
  productId: string;
  reviews: Review[];
  onSubmitted?: () => void;
};

const ReviewList = ({ productId, reviews, onSubmitted }: ReviewListProps) => {
  const locale = useLocale();
  const { t } = useTranslation();
  const userId = useAppSelector((s) => s.auth.userInfo.id);
  const alreadyReviewed =
    Boolean(userId) &&
    (reviews ?? []).some((r) => r.user?.id != null && r.user.id === userId);
  const canWrite = Boolean(userId) && !alreadyReviewed;

  const [draftRating, setDraftRating] = useState(5);
  const [draftComment, setDraftComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!canWrite) {
      window.location.href = currentLocaleLoginHref();
      return;
    }

    const auth = getAuthHeader();
    if (!auth) {
      window.location.href = currentLocaleLoginHref();
      return;
    }
    const headers = graphqlFetchHeaders(locale, auth);

    const comment = draftComment.trim();
    if (comment.length < 3) {
      toast.error(t("reviews.commentShort"));
      return;
    }

    const rating = clampRating(draftRating);
    if (rating < 1) {
      toast.error(t("reviews.selectRating"));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await graphqlHttpPost({
        query: CREATE_REVIEW_MUTATION,
        variables: {
          input: {
            productId,
            rating,
            comment,
          },
        },
        headers,
      });

      const json = await response.json();
      if (!response.ok || json.errors) {
        const message =
          json.errors?.[0]?.message ?? t("reviews.submitFailed");
        throw new Error(message);
      }

      toast.success(t("reviews.submitted"));
      setDraftRating(5);
      setDraftComment("");
      onSubmitted?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("reviews.submitFailed")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxHeight: 260, overflowY: "auto", pr: 1, pb: 1 }}>
      {canWrite && (
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
          sx={{
            borderRadius: 2,
            border: 1,
            borderColor: "divider",
            px: 1.5,
            py: 1.25,
            bgcolor: "background.paper",
            mb: 2,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            {t("reviews.writeTitle")}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <StarsPicker rating={draftRating} onChange={setDraftRating} />
          </Box>

          <TextField
            label={t("reviews.comment")}
            value={draftComment}
            onChange={(e) => setDraftComment(e.target.value)}
            multiline
            minRows={3}
            fullWidth
            size="small"
            helperText={`${draftComment.trim().length}/2000`}
            sx={{ mb: 1 }}
          />

          <Button
            type="submit"
            variant="contained"
            size="small"
            disabled={isSubmitting || draftComment.trim().length < 3}
            sx={{ width: "100%", borderRadius: 2 }}
          >
            {isSubmitting ? t("reviews.submitting") : t("reviews.submit")}
          </Button>
        </Box>
      )}

      {(!reviews || reviews.length === 0) && (
        <Box sx={{ py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t("reviews.none")}
          </Typography>
        </Box>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {(reviews ?? []).map((review) => (
          <Box
            key={review.id}
            sx={{
              borderRadius: 2,
              border: 1,
              borderColor: "divider",
              px: 1.5,
              py: 1.25,
              bgcolor: "background.paper",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 2,
                mb: 0.5,
              }}
            >
              <Stars rating={review.rating} />
              <Typography variant="caption" color="text.secondary">
                {formatDate(review.createdAt)}
              </Typography>
            </Box>

            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {review.user?.name ?? t("reviews.anonymous")}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              {truncateComment(review.comment ?? "")}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default ReviewList;
