/// <reference path="./graphql-depth-limit.d.ts" />
import "./loadEnv.js";
import { randomUUID } from "node:crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import depthLimit from "graphql-depth-limit";
import { existsSync, mkdirSync } from "fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHandler } from "graphql-http/lib/use/express";
import { ruruHTML } from "ruru/server";
import Stripe from "stripe";
import schema from "./schema/schema.js";
import root from "./schema/resolvers.js";
import { verifyToken } from "./auth/jwt.js";
import { imagesDir, uploadMiddleware } from "./utils/upload.js";
import { parseLocaleFromHeaders } from "./i18n/locales.js";
import { makeT } from "./i18n/t.js";
import { tryInsertStripeEventId } from "./models/stripeWebhookEvent.js";
import { applyStripeWebhookEvent } from "./stripe/applyWebhookEvent.js";
import { logger } from "./utils/logger.js";

const backendDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDistDir = path.join(backendDir, "../../frontend/dist");
const frontendIndexHtml = path.join(frontendDistDir, "index.html");

function getAuthHeader(headers: { authorization?: string }) {
  return headers.authorization ?? null;
}

function numEnv(name: string, defaultVal: number): number {
  const v = process.env[name];
  if (v == null || v === "") return defaultVal;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : defaultVal;
}

const graphqlWindowMs = numEnv("GRAPHQL_RATE_LIMIT_WINDOW_MS", 60_000);
const graphqlMax = numEnv("GRAPHQL_RATE_LIMIT_MAX", 200);
const sensitiveWindowMs = numEnv(
  "GRAPHQL_SENSITIVE_RATE_LIMIT_WINDOW_MS",
  900_000
);
const sensitiveMax = numEnv("GRAPHQL_SENSITIVE_RATE_LIMIT_MAX", 20);
const graphqlMaxDepth = numEnv("GRAPHQL_MAX_DEPTH", 12);

const graphqlRateLimiter = rateLimit({
  windowMs: graphqlWindowMs,
  limit: graphqlMax,
  standardHeaders: true,
  legacyHeaders: false,
});

const sensitiveGraphqlLimiter = rateLimit({
  windowMs: sensitiveWindowMs,
  limit: sensitiveMax,
  standardHeaders: true,
  legacyHeaders: false,
});

const SENSITIVE_OPERATIONS = new Set([
  "Login",
  "Register",
  "SendContact",
]);

function graphqlRateLimitChain(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (req.path !== "/graphql" || req.method !== "POST") {
    next();
    return;
  }
  const op = req.body?.operationName;
  if (typeof op === "string" && SENSITIVE_OPERATIONS.has(op)) {
    sensitiveGraphqlLimiter(req, res, (err?: unknown) => {
      if (err) {
        next(err);
        return;
      }
      graphqlRateLimiter(req, res, next);
    });
    return;
  }
  graphqlRateLimiter(req, res, next);
}

const app = express();

if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

const frontendOrigin = process.env.FRONTEND_ORIGIN?.trim();
app.use(frontendOrigin ? cors({ origin: frontendOrigin }) : cors());

app.use((req, res, next) => {
  const id = randomUUID();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: false,
    // Allow embedding /images (and other responses) from the Vite dev origin
    // (different port = different origin). Default same-origin blocks <img cross-origin>.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.post(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const rid = req.requestId;
    const signature = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripeSecret = process.env.STRIPE_SECRET_KEY;

    if (!signature || typeof signature !== "string") {
      res.status(400).send("Missing stripe signature");
      return;
    }
    if (!webhookSecret || !stripeSecret) {
      res.status(500).send("Stripe is not configured");
      return;
    }

    let event: Stripe.Event;
    try {
      const stripe = new Stripe(stripeSecret);
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret
      );
    } catch (err) {
      logger.error("stripe webhook signature invalid", err, undefined, rid);
      res.status(400).send(
        err instanceof Error ? err.message : "Invalid webhook payload"
      );
      return;
    }

    logger.info(
      "stripe webhook received",
      { eventId: event.id, eventType: event.type },
      rid
    );

    if (!tryInsertStripeEventId(event.id)) {
      logger.info(
        "stripe webhook duplicate skipped",
        { eventId: event.id },
        rid
      );
      res.status(200).json({ received: true });
      return;
    }

    try {
      applyStripeWebhookEvent(event);
    } catch (err) {
      logger.error("stripe webhook handler failed", err, { eventId: event.id }, rid);
    }

    res.status(200).json({ received: true });
  }
);

app.use(express.json());
app.use(graphqlRateLimitChain);

// Ensure the images directory exists and serve it as static files.
if (!existsSync(imagesDir)) {
  mkdirSync(imagesDir, { recursive: true });
}

app.use("/images", express.static(imagesDir));

const getImageBaseUrl = (port: number | string) => {
  const fromEnv = process.env.IMAGE_BASE_URL;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, "");
  }
  return `http://localhost:${port}/images`;
};

// Simple REST endpoint for uploading a single product image file.
app.post("/api/upload-image", uploadMiddleware, (req, res) => {
  const file = (req as express.Request & { file?: Express.Multer.File }).file;
  if (!file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const port = process.env.PORT ?? 4000;
  const baseUrl = getImageBaseUrl(port);
  const filename = file.filename;

  res.json({
    id: filename,
    path: `/images/${filename}`,
    url: `${baseUrl}/${filename}`,
  });
});

app.get("/graphiql", (_req, res) => {
  res.type("html");
  res.end(ruruHTML({ endpoint: "/graphql" }));
});

app.all(
  "/graphql",
  createHandler({
    schema,
    rootValue: root,
    validationRules: [depthLimit(graphqlMaxDepth)],
    context: async (req, _res) => {
      const auth = getAuthHeader(req.headers as { authorization?: string });
      const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
      const payload = token ? verifyToken(token) : null;
      const locale = parseLocaleFromHeaders(req.headers);
      return {
        userId: payload?.userId ?? null,
        locale,
        t: makeT(locale),
      };
    },
    onOperation: (_req, _args, result) => {
      if (
        result &&
        typeof result === "object" &&
        !(result as { data?: { __schema?: unknown } }).data?.__schema
      ) {
        // optional response logging
      }
      return result;
    },
  })
);

const isProduction = process.env.NODE_ENV === "production";

if (isProduction && existsSync(frontendIndexHtml)) {
  app.use(express.static(frontendDistDir, { index: false }));
  app.use((req, res, next) => {
    if (req.method !== "GET") {
      next();
      return;
    }
    const urlPath = req.path;
    if (
      urlPath.startsWith("/graphql") ||
      urlPath.startsWith("/graphiql") ||
      urlPath.startsWith("/webhooks/") ||
      urlPath.startsWith("/api/") ||
      urlPath.startsWith("/images/") ||
      urlPath.startsWith("/socket.io")
    ) {
      next();
      return;
    }
    res.sendFile(frontendIndexHtml, (err) => {
      if (err) next(err);
    });
  });
} else {
  if (isProduction) {
    logger.warn(
      "Production SPA missing: frontend/dist/index.html — run `npm run build` from the repo root"
    );
  }
  app.get("/", (_req, res) => {
    res.redirect(302, "/graphiql");
  });
}

export { app };
