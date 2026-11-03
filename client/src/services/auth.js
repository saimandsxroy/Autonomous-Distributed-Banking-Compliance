import { apiRequest } from "./api";

export async function loginUser(email, password) {
  // Call /auth/login for stateless enterprise JWT
  let response;
  try {
    const res = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernameOrEmail: email, password }),
    });
    if (res.ok) {
      const data = await res.json();
      const token = data.token;
      localStorage.setItem("runestone_jwt_token", token);
      localStorage.setItem("jwt", token);
      localStorage.setItem("runestone_user_profile", JSON.stringify(data));
      localStorage.setItem("accountInfo", JSON.stringify(data));
      localStorage.setItem("runestone_active_persona", data.username);
      return { jwt: token, accountInfo: data };
    }
  } catch (err) {
    console.warn("Falling back to legacy login endpoint:", err);
  }

  // Fallback to legacy endpoint if /auth/login fails
  response = await apiRequest("/api/v1/user/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (response.jwt) {
    localStorage.setItem("jwt", response.jwt);
    localStorage.setItem("runestone_jwt_token", response.jwt);
    localStorage.setItem("accountInfo", JSON.stringify(response.accountInfo));
