const { createClient } = supabase;
const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const statusEl = document.getElementById("status");

async function checkConnection() {
  try {
    // Just calling getSession confirms the client can reach the Supabase auth endpoint.
    const { error } = await client.auth.getSession();
    if (error) throw error;
    statusEl.textContent = "Supabase 연결 성공 ✔";
    statusEl.className = "ok";
  } catch (err) {
    statusEl.textContent = "연결 실패: " + err.message;
    statusEl.className = "err";
  }
}

checkConnection();
