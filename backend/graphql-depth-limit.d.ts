declare module "graphql-depth-limit" {
  import type { ValidationRule } from "graphql";
  const depthLimit: (
    maxDepth: number,
    options?: { ignore?: string[] | ((query: string) => boolean) }
  ) => ValidationRule;
  export = depthLimit;
}
