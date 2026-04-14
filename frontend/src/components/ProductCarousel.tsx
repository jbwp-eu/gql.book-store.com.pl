import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { Link } from "react-router";
import Box from "@mui/material/Box";
import { useLocale } from "../hooks/useLocalizedPath";
import { withLocalePath } from "../i18n/locales";
import IconButton from "@mui/material/IconButton";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";
import { resolveImageUrl } from "../utils/imageUrl";
import { useTranslation } from "react-i18next";

const AUTOPLAY_DELAY_MS = 4500;
const GAP_PX = 2;

export type CarouselItem = {
  productId: string;
  banner: string;
};

const ProductCarousel = ({ items }: { items: CarouselItem[] }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const firstSlideRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isProgrammaticScrollRef = useRef(false);

  const [index, setIndex] = useState(0);

  // Calculate the number of pixels to scroll for each carousel step.
  // This is the width of the first slide plus the fixed gap between slides.
  // If firstSlideRef.current is null, assume a width of 0.
  const getStep = () => (firstSlideRef.current?.offsetWidth ?? 0) + GAP_PX;

  useLayoutEffect(() => {
    const step = getStep();
    if (step > 0 && containerRef.current) {
      // Mark that the next scroll event is initiated programmatically,
      // so scroll listeners can ignore it and avoid feedback loops.
      isProgrammaticScrollRef.current = true;
      containerRef.current.scrollLeft = index * step;
      const t = setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 50);
      return () => clearTimeout(t);
    }
  }, [index]);

  useEffect(() => {
    if (items.length <= 1) return;

    const startAutoplay = () => {
      intervalRef.current = setInterval(() => {
        setIndex((i) => (i >= items.length - 1 ? 0 : i + 1));
      }, AUTOPLAY_DELAY_MS);
    };

    startAutoplay();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [items.length]);

  const handleMouseEnter = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (items.length <= 1) return;
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      setIndex((i) => (i >= items.length - 1 ? 0 : i + 1));
    }, AUTOPLAY_DELAY_MS);
  };

  const goPrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const goNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIndex((prev) => (prev + 1) % items.length);
  };

  if (items.length === 0) return null;

  const slideHeight = 250;

  return (
    <Box
      sx={{ position: "relative", mb: 2 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="region"
      aria-roledescription="carousel"
      aria-label={t("carousel.featured")}
    >
      <Box
        ref={containerRef}
        sx={{
          display: "flex",
          gap: GAP_PX,
          // These are standard CSS properties, not MUI-specific—they are passed to the Box component via the sx prop,
          // which allows writing regular CSS styles in JS/TS object notation.
          // - overflowX: "auto" enables horizontal scrolling when needed.
          // - scrollSnapType: "x mandatory" applies a CSS scroll snap behavior to the container horizontally.
          // - scrollBehavior: "smooth" animates scroll actions smoothly instead of instantly.
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          scrollBehavior: "smooth",
          py: 1,
          "&::-webkit-scrollbar": { height: 8 },
          "&::-webkit-scrollbar-thumb": {
            borderRadius: 4,
            bgcolor: "action.hover",
          },
        }}
      >
        {items.map(({ productId, banner }, i) => (
          <Box
            key={`${productId}-${banner}`}
            ref={i === 0 ? firstSlideRef : undefined}
            sx={{
              flex: "0 0 auto",
              // width: "50%",
              width: "100%",
              height: slideHeight,
              scrollSnapAlign: "start",
              scrollSnapStop: "always",
            }}
          >
            <Box
              component={Link}
              to={withLocalePath(locale, `/product/${productId}`)}
              sx={{
                display: "block",
                height: "100%",
                overflow: "hidden",
                borderRadius: 2,
                textDecoration: "none",
                color: "inherit",
                transition: "transform 0.2s ease-in-out",
                "&:hover": { transform: "scale(1.02)" },
              }}
            >
              <Box
                component="img"
                src={resolveImageUrl(banner) ?? undefined}
                alt=""
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: {
                    xs: "cover", // Best for small screens, avoids cropping and fits banners in carousel space
                    md: "contain", // For >=sm, fill the box while cropping as needed for visual engagement
                  },
                  display: "block",
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </Box>
          </Box>
        ))}
      </Box>

      {items.length > 1 && (
        <>
          <IconButton
            aria-label={t("carousel.previousSlide")}
            onClick={goPrev}
            sx={{
              position: "absolute",
              left: 0,
              top: "50%",
              transform: "translateY(-50%)",
              bgcolor: "background.paper",
              boxShadow: 1,
              "&:hover": { bgcolor: "action.hover" },
              "&:disabled": { opacity: 0.5 },
            }}
          >
            <ChevronLeft />
          </IconButton>
          <IconButton
            aria-label={t("carousel.nextSlide")}
            onClick={goNext}
            sx={{
              position: "absolute",
              right: 0,
              top: "50%",
              transform: "translateY(-50%)",
              bgcolor: "background.paper",
              boxShadow: 1,
              "&:hover": { bgcolor: "action.hover" },
              "&:disabled": { opacity: 0.5 },
            }}
          >
            <ChevronRight />
          </IconButton>
          {/* 
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: 0.9,
              mt: 1,
            }}
          >
            {items.map((_, i) => (
              <Box
                key={i}
                component="button"
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={index === i ? "true" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIndex(i);
                }}
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  border: "none",
                  p: 0,
                  cursor: "pointer",
                  bgcolor: index === i ? "secondary.main" : "secondary.light",
                  opacity: index === i ? 1 : 0.8,
                  "&:hover": { opacity: 1 },
                }}
              />
            ))}
          </Box> */}
        </>
      )}
    </Box>
  );
};

export default ProductCarousel;
