import "dotenv/config";

const BASE = "http://localhost:3000";

async function register(username) {
  const password = "password123";
  const res = await fetch(`${BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      email: `${username}@example.com`,
      password,
    }),
  });
  const j = await res.json();
  const cookie = res.headers.get("set-cookie");
  return { j, cookie };
}

async function callWithCookie(path, cookie, method = "GET") {
  const r = await fetch(`${BASE}${path}`, { headers: { cookie }, method });
  const j = await r.json().catch(() => null);
  return { status: r.status, json: j };
}

async function main() {
  const ua = `uA${Date.now()}`;
  const ub = `uB${Date.now()}`;

  console.log("register A", ua);
  let r = await register(ua);
  console.log(r.j);
  const cookieA = r.cookie;

  console.log("A initial target");
  console.log(await callWithCookie("/api/wordle/target", cookieA));

  for (let i = 1; i <= 4; i++) {
    console.log("A finish", i);
    console.log(await callWithCookie("/api/wordle/finish", cookieA, "POST"));
  }

  console.log("A target after finishes");
  console.log(await callWithCookie("/api/wordle/target", cookieA));

  console.log("logout A");
  console.log(await callWithCookie("/logout", cookieA));

  console.log("register B", ub);
  r = await register(ub);
  console.log(r.j);
  const cookieB = r.cookie;

  console.log("B target initially");
  console.log(await callWithCookie("/api/wordle/target", cookieB));

  console.log("B finish once");
  console.log(await callWithCookie("/api/wordle/finish", cookieB, "POST"));

  console.log("logout B");
  console.log(await callWithCookie("/logout", cookieB));

  console.log("re-login A");
  // login
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: ua, password: "password123" }),
  });
  const loginJson = await res.json();
  const cookieA2 = res.headers.get("set-cookie");
  console.log("login A", loginJson);

  console.log("A target after re-login");
  console.log(await callWithCookie("/api/wordle/target", cookieA2));

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
