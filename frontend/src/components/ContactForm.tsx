import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Modal from "@mui/material/Modal";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import {
  graphqlJsonHeaders,
  localeFromI18nLanguage,
} from "../lib/graphqlHeaders";
import { graphqlHttpPost } from "../lib/graphqlClient";

type ContactFormProps = {
  open: boolean;
  onClose: () => void;
};

type FormState = {
  email: string;
  message: string;
};

type FormErrors = {
  email?: string;
  message?: string;
};

const CONTACT_MUTATION = `
  mutation SendContact($input: ContactMessageInput!) {
    sendContactMessage(input: $input) {
      success
      error
    }
  }
`;

const modalStyle = {
  position: "absolute" as const,
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  bgcolor: "background.paper",
  boxShadow: 24,
  borderRadius: 2,
  p: 4,
  width: "90%",
  maxWidth: 480,
};

const initialState: FormState = {
  email: "",
  message: "",
};

const ContactForm = ({ open, onClose }: ContactFormProps) => {
  const { t, i18n } = useTranslation();
  const [values, setValues] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setErrors({});
    setSubmitError(null);
    onClose();
  };

  const handleChange =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const validate = (formValues: FormState): FormErrors => {
    const nextErrors: FormErrors = {};

    if (!formValues.email) {
      nextErrors.email = t("contact.emailRequired");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email)) {
      nextErrors.email = t("contact.emailInvalid");
    }

    if (!formValues.message.trim()) {
      nextErrors.message = t("contact.messageRequired");
    }

    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await graphqlHttpPost({
        query: CONTACT_MUTATION,
        variables: {
          input: {
            email: values.email,
            message: values.message,
          },
        },
        headers: graphqlJsonHeaders(localeFromI18nLanguage(i18n.language)),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Request failed");
      }

      const json = await response.json();
      if (json.errors?.length) {
        throw new Error(json.errors[0]?.message ?? "GraphQL error");
      }

      const payload = json.data?.sendContactMessage as
        | { success: boolean; error?: string | null }
        | undefined;

      if (!payload?.success) {
        setSubmitError(payload?.error ?? t("contact.sendFailed"));
        return;
      }

      setValues(initialState);
      handleClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("contact.sendFailed");
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="contact-form-title"
      aria-describedby="contact-form-description"
    >
      <Box component="form" onSubmit={handleSubmit} sx={modalStyle}>
        <Stack spacing={2}>
          <Typography id="contact-form-title" variant="h6" component="h2">
            {t("contact.title")}
          </Typography>
          <Typography
            id="contact-form-description"
            variant="body2"
            color="text.secondary"
          >
            {t("contact.description")}
          </Typography>
          <TextField
            label={t("auth.email")}
            type="email"
            name="email"
            value={values.email}
            onChange={handleChange("email")}
            autoFocus
            fullWidth
            required
            error={Boolean(errors.email)}
            helperText={errors.email}
          />
          <TextField
            label={t("contact.messageLabel")}
            name="message"
            value={values.message}
            onChange={handleChange("message")}
            fullWidth
            required
            multiline
            minRows={4}
            error={Boolean(errors.message)}
            helperText={errors.message}
          />
          {submitError && (
            <Typography variant="body2" color="error">
              {submitError}
            </Typography>
          )}
          <Stack
            direction="row"
            spacing={1.5}
            justifyContent="flex-end"
            sx={{ pt: 1 }}
          >
            <Button
              variant="text"
              color="inherit"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t("contact.cancel")}
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? t("contact.sending") : t("contact.submit")}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Modal>
  );
};

export default ContactForm;
