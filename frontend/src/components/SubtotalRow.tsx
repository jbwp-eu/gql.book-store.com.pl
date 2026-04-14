import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

type SubtotalRowProps = {
  label: string;
  value: string;
};

const SubtotalRow = ({ label, value }: SubtotalRowProps) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      py: 0.5,
    }}
  >
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" fontWeight="medium">
      {value}
    </Typography>
  </Box>
);

export default SubtotalRow;
