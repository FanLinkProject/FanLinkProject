/**
 * 인증 API (로그인, 회원가입, 로그아웃)
 * axios 사용
 */
import axios from "axios";
import { BASE_URL } from "@/lib/api";

const authClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

/**
 * 로그인
 * @param {{ email: string, password: string }}
 * @returns {Promise<{ accessToken: string, refreshToken?: string, role?: string }>}
 */
export async function login({ email, password }) {
  const { data } = await authClient.post("/api/auth/login", { email, password });
  return data;
}

/**
 * 로그아웃
 * @param {string} refreshToken
 */
export async function logout(refreshToken) {
  await authClient.post("/api/auth/logout", null, {
    params: { refreshToken },
  });
}
