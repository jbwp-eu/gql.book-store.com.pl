import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import StoreMap from "./StoreMap";
import type { StoreLocation } from "../types/storeLocation";

type StoreMapDialogProps = {
  open: boolean;
  onClose: () => void;
  storeLocation: StoreLocation | null;
};

const StoreMapDialog = ({
  open,
  onClose,
  storeLocation,
}: StoreMapDialogProps) => {
  const hasLocation =
    !!storeLocation &&
    typeof storeLocation.latitude === "number" &&
    typeof storeLocation.longitude === "number";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="store-map-dialog-title"
    >
      <DialogTitle id="store-map-dialog-title">
        How to get to our store
      </DialogTitle>
      <DialogContent dividers>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 1.5, textDecoration: "underline" }}
        >
          Physical store coming soon.
        </Typography>
        {hasLocation ? (
          <Box sx={{ mb: 1.5 }}>
            <StoreMap
              lat={storeLocation.latitude}
              lng={storeLocation.longitude}
              title={storeLocation.name}
            />
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Store location is not available at the moment. Please try again
            later.
          </Typography>
        )}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textDecoration: "underline", color: "error.main" }}
        >
          Use the map above to preview our future store location and plan your
          route.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StoreMapDialog;
