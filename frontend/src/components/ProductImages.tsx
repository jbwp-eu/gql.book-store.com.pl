import { useState } from "react";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { resolveImageUrl } from "../utils/imageUrl";

const ProductImages = ({
  images,
  title = "",
}: {
  images: string[];
  title?: string;
}) => {
  const [current, setCurrent] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (!images || images.length === 0) {
    return (
      <Box
        sx={{
          aspectRatio: "3/4",
          bgcolor: "action.hover",
          borderRadius: 1,
        }}
      />
    );
  }

  const currentImage = images[current];
  const imageSrc = resolveImageUrl(currentImage) ?? undefined;

  return (
    <>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {imageSrc && (
          <Box
            component="img"
            src={imageSrc}
            alt={title}
            sx={{
              width: "100%",
              height: "auto",
              objectFit: "cover",
              borderRadius: 1,
              cursor: "pointer",
            }}
            onClick={() => setIsDialogOpen(true)}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 0,
          }}
        >
          {images.map((img, index) => {
            const src = resolveImageUrl(img);
            if (!src) return null;
            return (
              <Box
                key={img}
                onClick={() => setCurrent(index)}
                sx={{
                  width: "47%",
                  height: "auto",
                  flexShrink: 0,
                  borderRadius: 1,
                  overflow: "hidden",
                  border: 2,
                  borderColor: current === index ? "primary.main" : "divider",
                  cursor: "pointer",
                  "&:hover": {
                    borderColor: "primary.light",
                  },
                  "& img": {
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  },
                }}
              >
                <Box
                  component="img"
                  src={src}
                  alt=""
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </Box>
            );
          })}
        </Box>
      </Box>

      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        maxWidth="lg"
      >
        <DialogContent
          sx={{
            position: "relative",
            p: 0,
            bgcolor: "black",
            display: "inline-flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <IconButton
            aria-label="Close"
            onClick={() => setIsDialogOpen(false)}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              color: "common.white",
              zIndex: 1,
            }}
          >
            <CloseIcon />
          </IconButton>

          {imageSrc && (
            <Box
              component="img"
              src={imageSrc}
              alt={title}
              sx={{
                width: "auto",
                height: "auto",
                maxWidth: "100%",
                maxHeight: "90vh",
                objectFit: "contain",
                display: "block",
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProductImages;
