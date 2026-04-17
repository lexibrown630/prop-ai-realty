import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// 🔐 Supabase config (UPDATED)
const supabase = createClient(
  "https://jrmqdojsxjtkjpczaysp.supabase.co",
  "sb_publishable_1YMQSjBmwLytMgeewMHxPQ_guXEPe3v"
);

// =====================
// ROUTING ENGINE
// =====================
async function routeUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Not logged in → login
  if (!user) {
    window.location.href = "/src/login.html";
    return;
  }

  const email = user.email;

  // 2. Check subscription status
  const res = await fetch("/.netlify/functions/checkAccess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await res.json();

  // 3. Not paid → payment page
  if (!data.access) {
    window.location.href = "/src/payments.html";
    return;
  }

  // 4. Paid → dashboard (booking system)
  window.location.href = "/index.html";
}

routeUser();
