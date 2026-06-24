const API = 'http://localhost:3000';

const email = `smoke+${Date.now()}@example.com`;
const password = 'TestPass123!';

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, data: text };
  }
}

async function run() {
  try {
    console.log('Registering user...', email);
    await jsonFetch(`${API}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    console.log('Logging in...');
    const login = await jsonFetch(`${API}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const token = login.data?.token;
    if (!token) throw new Error('No token returned');
    console.log('Got token');

    const authHeaders = { Authorization: `Bearer ${token}` };

    console.log('Fetching an existing character to like/comment...');
    const chars = await jsonFetch(`${API}/api/characters?limit=1`);
    const character = chars.data?.characters?.[0];
    if (!character) {
      console.log('No characters available to like/comment. Skipping social tests.');
    } else {
      const charId = character._id || character.id;
      console.log('Toggling like on character', charId);
      const likeRes = await jsonFetch(`${API}/api/characters/${charId}/like`, {
        method: 'POST',
        headers: authHeaders,
      });
      console.log('Like response:', likeRes.data);

      console.log('Adding comment to character', charId);
      const commentRes = await jsonFetch(`${API}/api/characters/${charId}/comment`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Nice!' }),
      });
      console.log('Comment response:', commentRes.data);
    }

    console.log('Updating profile displayName...');
    const form = new URLSearchParams();
    form.append('displayName', 'Smoke Tester');
    const prof = await jsonFetch(`${API}/api/profile`, {
      method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Smoke Tester' }),
    });
    console.log('Profile update response:', prof.data);

    console.log('Smoke test completed successfully');
  } catch (err) {
    console.error('Smoke test failed:', err.message || err);
    process.exit(1);
  }
}

run();
