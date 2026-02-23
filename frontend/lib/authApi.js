/**
 * Auth and verification API helpers.
 * - Uses BASE_URL directly.
 * - Login/signup/verification requests are sent without Authorization header.
 */

import { BASE_URL } from "./api";

function getNetworkErrorMessage() {
  return `Cannot connect to server. Check backend status. (URL: ${BASE_URL})`;
}

function isNetworkError(err) {
  return err?.message === "Failed to fetch" || err?.name === "TypeError";
}

/**
 * Login
 * @returns {{ accessToken, refreshToken, ... }}
 */
export async function login(email, password) {
  let res;
  try {
    res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch (e) {
    if (isNetworkError(e)) throw new Error(getNetworkErrorMessage());
    throw e;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || "Login failed.");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Exchange OAuth callback code to JWT tokens.
 * @returns {{ accessToken, refreshToken, ... }}
 */
export async function exchangeOAuthCode(code) {
  let res;
  try {
    res = await fetch(`${BASE_URL}/api/auth/oauth/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
  } catch (e) {
    if (isNetworkError(e)) throw new Error(getNetworkErrorMessage());
    throw e;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || "OAuth login failed.");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Signup
 * @param {object} body SignupRequest payload
 */
export async function signup(body) {
  let res;
  try {
    res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    if (isNetworkError(e)) throw new Error(getNetworkErrorMessage());
    throw e;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || "Signup failed.");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Logout
 * - Invalidates refresh token on server.
 * - Clears local tokens even on network errors.
 */
export async function logout() {
  const refreshToken =
    typeof window !== "undefined" ? localStorage.getItem("refreshToken") ?? "" : "";

  if (refreshToken) {
    try {
      await fetch(`${BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
    } catch (_) {
      // Ignore network errors and still clear local tokens.
    }
  }

  if (typeof window !== "undefined") {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }
}

/**
 * Send email verification code.
 */
export async function sendEmailCode(email) {
  let res;
  try {
    res = await fetch(`${BASE_URL}/api/verification/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch (e) {
    if (isNetworkError(e)) throw new Error(getNetworkErrorMessage());
    throw e;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || "Failed to send email verification code.");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Verify email code.
 */
export async function verifyEmailCode(email, code) {
  let res;
  try {
    res = await fetch(`${BASE_URL}/api/verification/email/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
  } catch (e) {
    if (isNetworkError(e)) throw new Error(getNetworkErrorMessage());
    throw e;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || "Email verification failed.");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Send phone verification code.
 */
export async function sendPhoneCode(phoneNumber) {
  let res;
  try {
    res = await fetch(`${BASE_URL}/api/verification/phone/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber }),
    });
  } catch (e) {
    if (isNetworkError(e)) throw new Error(getNetworkErrorMessage());
    throw e;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || "Failed to send phone verification code.");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Verify phone code.
 */
export async function verifyPhoneCode(phoneNumber, code) {
  let res;
  try {
    res = await fetch(`${BASE_URL}/api/verification/phone/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber, code }),
    });
  } catch (e) {
    if (isNetworkError(e)) throw new Error(getNetworkErrorMessage());
    throw e;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || "Phone verification failed.");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
