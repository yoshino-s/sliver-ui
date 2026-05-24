import createClient from "openapi-fetch";
import type { paths } from "./schema";

export type ApiClient = ReturnType<typeof createApiClient>;

export function createApiClient(baseUrl = getDefaultBaseUrl()) {
  return createClient<paths>({
    baseUrl,
  });
}

export const apiClient = createApiClient();

function getDefaultBaseUrl() {
  return import.meta.env.VITE_SLIVER_GATEWAY_URL || window.location.origin;
}
