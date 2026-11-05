import { auth } from "./firebase";

const API_URL = import.meta.env.VITE_API_BASE_URL;

// Verify administrator connection with backend
export async function verifyBackendAdmin() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please log in as an administrator first.");
  }

  const idToken = await user.getIdToken();

  const response = await fetch(`${API_URL}/api/draw/test`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Backend verification failed.");
  }

  return data;
}

// Select and save the next lucky draw winner
export async function drawNextWinner() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please log in as an administrator first.");
  }

  const idToken = await user.getIdToken();

  const response = await fetch(`${API_URL}/api/draw/next`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Unable to select winner.");
  }

  return data;
}
