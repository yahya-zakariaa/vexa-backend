import jwt from "jsonwebtoken";
import { redis } from "../lib/redis.js";

const ensureSecret = (name) => {
  const val = process.env[name];
  if (!val) {
    throw new Error(`${name} is not defined. Set ${name} in your environment`);
  }
  return val;
};

export const generateTokens = async (userId, role) => {
  // Validate that secrets are configured
  const accessSecret = ensureSecret("ACCESS_TOKEN_SECRET");
  const refreshSecret = ensureSecret("REFRESH_TOKEN_SECRET");

  try {
    const access_token = jwt.sign({ userId, role }, accessSecret, {
      expiresIn: "6h",
    });

    const refresh_token = jwt.sign({ userId, role }, refreshSecret, {
      expiresIn: "7d",
    });

    // store tokens in redis if available
    try {
      if (redis) {
        await redis.set(
          `refresh_token:${userId}`,
          refresh_token,
          "EX",
          7 * 24 * 60 * 60
        );
        await redis.set(
          `access_token:${userId}`,
          access_token,
          "EX",
          1 * 24 * 60 * 60
        );
      }
    } catch (cacheErr) {
      console.warn(
        "Failed to store tokens in Redis:",
        cacheErr?.message || cacheErr
      );
    }

    return { access_token, refresh_token };
  } catch (error) {
    // Rethrow so callers can handle the error (don't swallow)
    console.error("error in create or store token:", error);
    throw error;
  }
};

export const deleteTokens = async (userId) => {
  try {
    if (redis) {
      await redis.del(`access_token:${userId}`);
      await redis.del(`refresh_token:${userId}`);
    }
  } catch (err) {
    console.warn("Failed to delete tokens from Redis:", err?.message || err);
  }
};

export const setCookies = (res, access_token, refresh_token) => {
  res.cookie("access_token", access_token, {
    httpOnly: true,
    sameSite: "None",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 3,
  });

  res.cookie("refresh_token", refresh_token, {
    httpOnly: true,
    sameSite: "None",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
};
