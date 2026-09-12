// src/api/auth.js
import { getCookie } from "../utils/cookies";

export async function loginUser(username, password, remember_me = false) {
    const tabSession = sessionStorage.getItem('tab_session');
    const response = await fetch("/api/login/", {
        method: "POST",
        credentials: "include", // Sends cookies
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken"),
            ...(tabSession ? { "X-Tab-Session": tabSession } : {}),
        },
        
        body: JSON.stringify({ username, password, remember_me }), 
    });

    const data = await response.json();
    return data;
}