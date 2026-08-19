// src/api/auth.js
import { getCookie } from "../utils/cookies";

export async function loginUser(username, password) {
    const response = await fetch("/api/login/", {
        method: "POST",
        credentials: "include", // Sends cookies
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    return data;
}