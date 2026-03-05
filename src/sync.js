const GIST_FILENAME = 'flashcard-trainer-data.json';
const API = 'https://api.github.com';

export async function findExistingGist(token) {
  const res = await fetch(`${API}/gists?per_page=100`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
  const gists = await res.json();
  return gists.find(g => g.files[GIST_FILENAME])?.id ?? null;
}

export async function fetchGist(token, gistId) {
  const res = await fetch(`${API}/gists/${gistId}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
  const gist = await res.json();
  const content = gist.files[GIST_FILENAME]?.content;
  if (!content) throw new Error('Data file not found in gist');
  return JSON.parse(content);
}

export async function pushGist(token, gistId, data) {
  const res = await fetch(`${API}/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: { [GIST_FILENAME]: { content: JSON.stringify(data) } },
    }),
  });
  if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
}

export async function createGist(token, data) {
  const res = await fetch(`${API}/gists`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: 'Flashcard Trainer — synced data',
      public: false,
      files: { [GIST_FILENAME]: { content: JSON.stringify(data) } },
    }),
  });
  if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
  const gist = await res.json();
  return gist.id;
}
