import dotenv from "dotenv";

dotenv.config({ path: new URL("../.env", import.meta.url).pathname });

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/"/g, "").replace(/\/$/, "");
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN?.replace(/"/g, "");

const buildHeaders = () => {
  const headers = {};
  if (UPSTASH_TOKEN) {
    headers.Authorization = `Bearer ${UPSTASH_TOKEN}`;
  }
  return headers;
};

const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      `Redis request failed: ${response.status} ${response.statusText} - ${JSON.stringify(data)}`
    );
  }
  return data;
};

const redis = UPSTASH_URL
  ? {
      get: async (key) => {
        const response = await fetch(
          `${UPSTASH_URL}/get/${encodeURIComponent(key)}`,
          {
            method: "GET",
            headers: buildHeaders(),
          }
        );
        const data = await handleResponse(response);
        return data.result;
      },
      set: async (key, value, ...args) => {
        const params = new URLSearchParams();

        if (args.length >= 2 && args[0] === "EX") {
          params.set("ex", args[1]);
        }

        const response = await fetch(
          `${UPSTASH_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}?${params.toString()}`,
          {
            method: "POST",
            headers: buildHeaders(),
          }
        );
        const data = await handleResponse(response);
        return data.result;
      },
      del: async (key) => {
        const response = await fetch(
          `${UPSTASH_URL}/del/${encodeURIComponent(key)}`,
          {
            method: "POST",
            headers: buildHeaders(),
          }
        );
        const data = await handleResponse(response);
        return data.result;
      },
    }
  : null;

export { redis };
