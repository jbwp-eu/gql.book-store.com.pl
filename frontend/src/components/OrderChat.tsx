import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useState } from "react";
import { getAuthHeader } from "../../utils/auth";
import { useLocale } from "../hooks/useLocalizedPath";
import { graphqlFetchHeaders } from "../lib/graphqlHeaders";
import { graphqlHttpPost } from "../lib/graphqlClient";
import { connectSocketWithAuth } from "../socket/socket";

const CHAT_MESSAGES_QUERY = `
  query ChatMessages($orderId: ID!) {
    chatMessages(orderId: $orderId) {
      id
      orderId
      content
      createdAt
      sender {
        id
        name
        isAdmin
      }
    }
  }
`;

type ChatMessage = {
  id: string;
  orderId: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    isAdmin: boolean;
  };
};

type Props = {
  orderId: string;
  currentUserId?: string | null;
};

export default function OrderChat({ orderId, currentUserId }: Props) {
  const locale = useLocale();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = useMemo(
    () => draft.trim().length > 0 && draft.trim().length <= 1000 && !sending,
    [draft, sending]
  );

  useEffect(() => {
    let mounted = true;
    const auth = getAuthHeader();
    if (!auth) {
      setError("Login required");
      setLoading(false);
      return;
    }
    const headers = graphqlFetchHeaders(locale, auth);

    const loadMessages = async () => {
      try {
        const response = await graphqlHttpPost({
          query: CHAT_MESSAGES_QUERY,
          variables: { orderId },
          headers,
        });
        const json = (await response.json()) as {
          data?: { chatMessages?: ChatMessage[] };
          errors?: { message?: string }[];
        };
        if (!mounted) return;
        if (!response.ok || json.errors) {
          setError(json.errors?.[0]?.message ?? "Failed to load chat");
        } else {
          setMessages(json.data?.chatMessages ?? []);
        }
      } catch {
        if (mounted) {
          setError("Failed to load chat");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadMessages();
    return () => {
      mounted = false;
    };
  }, [orderId, locale]);

  useEffect(() => {
    const socket = connectSocketWithAuth();

    const onMessage = (message: ChatMessage) => {
      if (message.orderId !== orderId) return;
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message]
      );
    };
    const onError = (payload: { message?: string }) => {
      if (payload?.message) {
        setError(payload.message);
      }
      setSending(false);
    };

    socket.on("chat:message", onMessage);
    socket.on("chat:error", onError);
    socket.emit("chat:join", { orderId });

    return () => {
      socket.off("chat:message", onMessage);
      socket.off("chat:error", onError);
    };
  }, [orderId]);

  const handleSend = () => {
    const content = draft.trim();
    if (!content || content.length > 1000) return;
    setSending(true);
    setError(null);
    const socket = connectSocketWithAuth();
    socket.emit("chat:send", {
      orderId,
      content,
      clientMessageId: crypto.randomUUID(),
    });
    setDraft("");
    setSending(false);
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Order chat
        </Typography>
        {loading ? (
          <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Stack spacing={1} sx={{ maxHeight: 240, overflowY: "auto", mb: 2 }}>
            {messages.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No messages yet.
              </Typography>
            ) : (
              messages.map((message) => {
                const own = currentUserId ? message.sender.id === currentUserId : false;
                return (
                  <Box
                    key={message.id}
                    sx={{
                      alignSelf: own ? "flex-end" : "flex-start",
                      maxWidth: "85%",
                      px: 1.5,
                      py: 1,
                      borderRadius: 1,
                      bgcolor: own ? "primary.light" : "grey.200",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {message.sender.name}
                      {message.sender.isAdmin ? " (admin)" : ""}
                      {" • "}
                      {new Date(message.createdAt).toLocaleString()}
                    </Typography>
                    <Typography variant="body2">{message.content}</Typography>
                  </Box>
                );
              })
            )}
          </Stack>
        )}
        {error ? (
          <Typography variant="body2" color="error" sx={{ mb: 1 }}>
            {error}
          </Typography>
        ) : null}
        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            size="small"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message..."
          />
          <Button variant="contained" onClick={handleSend} disabled={!canSend}>
            Send
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
