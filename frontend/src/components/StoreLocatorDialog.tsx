import { useMemo, useState, type ChangeEvent } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import Box from "@mui/material/Box";

type StoreLocation = {
  id: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  openingHours?: string;
};

const STORES: StoreLocation[] = [
  {
    id: "waw-centrum",
    name: "Book Store - Warszawa Centrum",
    addressLine1: "ul. Marszałkowska 10",
    city: "Warszawa",
    postalCode: "00-590",
    country: "Polska",
    openingHours: "Pon–Pt 10:00–19:00, Sb 10:00–16:00",
  },
  {
    id: "krk-rynek",
    name: "Book Store - Kraków Rynek",
    addressLine1: "ul. Grodzka 25",
    city: "Kraków",
    postalCode: "31-001",
    country: "Polska",
    openingHours: "Pon–Pt 10:00–18:00, Sb 10:00–15:00",
  },
  {
    id: "gdn-old-town",
    name: "Book Store - Gdańsk Stare Miasto",
    addressLine1: "ul. Długa 50",
    city: "Gdańsk",
    postalCode: "80-827",
    country: "Polska",
    openingHours: "Pon–Pt 10:00–18:00",
  },
];

type StoreLocatorDialogProps = {
  open: boolean;
  onClose: () => void;
};

const buildMapsUrl = (store: StoreLocation) => {
  const query = `${store.name}, ${store.addressLine1}, ${store.postalCode} ${store.city}, ${store.country}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

const StoreLocatorDialog = ({ open, onClose }: StoreLocatorDialogProps) => {
  const [search, setSearch] = useState("");

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  const filteredStores = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return STORES;
    }

    return STORES.filter((store) => {
      const haystack = [
        store.name,
        store.addressLine1,
        store.addressLine2,
        store.city,
        store.postalCode,
        store.country,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [search]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="store-locator-title"
    >
      <DialogTitle id="store-locator-title">Find a store near you</DialogTitle>
      <DialogContent dividers>
        <TextField
          autoFocus
          margin="dense"
          label="City or postal code"
          placeholder="Type city or postal code"
          fullWidth
          value={search}
          onChange={handleSearchChange}
          variant="outlined"
          size="small"
        />
        <Box mt={2}>
          {filteredStores.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No stores found. Try another city or postal code.
            </Typography>
          ) : (
            <List dense>
              {filteredStores.map((store) => (
                <ListItem
                  key={store.id}
                  alignItems="flex-start"
                  divider
                  disableGutters
                  secondaryAction={
                    <Button
                      component={Link}
                      href={buildMapsUrl(store)}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="contained"
                      size="small"
                    >
                      Directions
                    </Button>
                  }
                >
                  <ListItemText
                    primary={
                      <Typography
                        variant="subtitle2"
                        fontWeight="fontWeightBold"
                      >
                        {store.name}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" color="text.primary">
                          {store.addressLine1}
                        </Typography>
                        <Typography variant="body2" color="text.primary">
                          {store.postalCode} {store.city}
                        </Typography>
                        <Typography variant="body2" color="text.primary">
                          {store.country}
                        </Typography>
                        {store.openingHours && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            mt={0.5}
                          >
                            {store.openingHours}
                          </Typography>
                        )}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default StoreLocatorDialog;
