import { apiFetch } from "./client";

interface LoginPayload {
  email: string;
  password: string;
}

interface SignupPayload {
  full_name: string;
  email: string;
  password: string;
  roll_no?: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

interface UserResponse {
  id: string;
  full_name: string;
  email: string;
  roll_no?: string;
  role?: string;
}

export async function login(payload: LoginPayload) {
  const tokenData: TokenResponse = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  // Save the token so subsequent apiFetch calls send it automatically
  localStorage.setItem("access_token", tokenData.access_token);

  // Now fetch the actual user profile using that token
  const user: UserResponse = await apiFetch("/auth/me");

  return { user: { name: user.full_name, email: user.email } };
}

export async function signup(payload: SignupPayload) {
  return apiFetch("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  }) as Promise<UserResponse>;
}

export async function getMe() {
  return apiFetch("/auth/me") as Promise<UserResponse>;
}

export function logout() {
  localStorage.removeItem("access_token");
}