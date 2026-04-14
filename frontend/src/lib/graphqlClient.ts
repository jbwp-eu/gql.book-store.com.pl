/** GraphQL HTTP endpoint from env (same default as previous per-module constants). */
export function getGraphqlHttpUrl(): string {
  return import.meta.env.VITE_GRAPHQL_URL ?? "http://localhost:4000/graphql";
}

/** Base URL for sibling REST routes (e.g. `/api/upload-image`) when GraphQL is at `/graphql`. */
export function getGraphqlHttpBaseUrl(): string {
  return getGraphqlHttpUrl().replace(/\/graphql\/?$/, "");
}

export type GraphqlResponse<T> = {
  data?: T;
  errors?: readonly { message: string }[];
};

function mergeHeaders(base: Headers, extra?: HeadersInit): Headers {
  const out = new Headers(base);
  if (!extra) return out;
  const h = new Headers(extra);
  h.forEach((value, key) => out.set(key, value));
  return out;
}

export type GraphqlHttpPostParams = {
  query: string;
  variables?: Record<string, unknown>;
  headers?: HeadersInit;
  signal?: AbortSignal;
};

/** POST to the GraphQL endpoint; use when you need `Response.ok` or status before parsing JSON. */
export function graphqlHttpPost(
  params: GraphqlHttpPostParams
): Promise<Response> {
  const headers = mergeHeaders(
    new Headers({ "Content-Type": "application/json" }),
    params.headers
  );
  return fetch(getGraphqlHttpUrl(), {
    method: "POST",
    headers,
    body: JSON.stringify({
      query: params.query,
      variables: params.variables,
    }),
    signal: params.signal,
  });
}

/** POST and parse JSON body (typical GraphQL `{ data, errors }` shape). */
export async function graphqlRequest<T = unknown>(
  params: GraphqlHttpPostParams
): Promise<GraphqlResponse<T>> {
  const res = await graphqlHttpPost(params);
  return (await res.json()) as GraphqlResponse<T>;
}
