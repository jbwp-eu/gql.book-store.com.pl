import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  // Pin,
} from "@vis.gl/react-google-maps";
import { useState } from "react";

type StoreMapProps = {
  lat: number;
  lng: number;
  title: string;
};

const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID ?? "undefined";

const StoreMap = ({ lat, lng /* title */ }: StoreMapProps) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const [open, setOpen] = useState(false);

  if (!apiKey) {
    return (
      <Typography variant="body2" color="text.secondary">
        Map is unavailable. Please configure VITE_GOOGLE_MAPS_API_KEY.
      </Typography>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <Box
        sx={{
          width: "100%",
          height: 300,
          borderRadius: 1,
          border: 1,
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        <Map
          defaultZoom={15}
          defaultCenter={{ lat, lng }}
          // Map ID from Google Cloud
          mapId={mapId}
          style={{ width: "100%", height: "100%" }}
        >
          <AdvancedMarker position={{ lat, lng }} onClick={() => setOpen(true)}>
            {/* <Pin
                background={"#FBBC04"}
                glyphColor={"#ffffff"}
                borderColor={"#000"}
            /> */}
            <div
              style={{
                position: "relative",
                transform: "translate(-50%, -100%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  background: "linear-gradient(135deg, #2563eb, #38bdf8)",
                  color: "#fff",
                  padding: "6px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.35)",
                  whiteSpace: "nowrap",
                }}
              >
                Store
              </div>
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "7px solid transparent",
                  borderRight: "7px solid transparent",
                  borderTop: "8px solid #2563eb",
                  filter: "drop-shadow(0 4px 6px rgba(15, 23, 42, 0.35))",
                  marginTop: -1,
                }}
              />
            </div>
          </AdvancedMarker>
          {open && (
            <InfoWindow
              position={{ lat, lng }}
              onCloseClick={() => setOpen(false)}
              style={{
                backgroundColor: "#38bdf8",
                color: "#fff",
                borderRadius: "10px",
                padding: "10px",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              Physical store location coming soon.
            </InfoWindow>
          )}
        </Map>
      </Box>
    </APIProvider>
  );
};

export default StoreMap;
