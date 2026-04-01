const TOKEN_KEY = "coinaty_auth_token";
const USER_ID_KEY = "coinaty_user_id";

export function saveAuthToken(userId: string, token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_ID_KEY, userId);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  const userId = localStorage.getItem(USER_ID_KEY);
  if (token && userId) {
    return {
      "Authorization": `Bearer ${token}`,
      "X-User-Id": userId,
    };
  }
  return {};
}
