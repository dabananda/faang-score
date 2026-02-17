// DOM elements
const usernameInput = document.getElementById('usernameInput');
const fetchBtn = document.getElementById('fetchBtn');
const resultCard = document.getElementById('resultCard');
const loadingSpinner = document.getElementById('loadingSpinner');
const resultContent = document.getElementById('resultContent');
const errorDisplay = document.getElementById('errorDisplay');
const avatarImg = document.getElementById('avatarImg');
const userName = document.getElementById('userName');
const userLogin = document.getElementById('userLogin').querySelector('span');
const linesCount = document.getElementById('linesCount');
const timeSpent = document.getElementById('timeSpent');
const commitsCount = document.getElementById('commitsCount');
const scoresGrid = document.getElementById('scoresGrid');
const similarUser = document.getElementById('similarUser');
const captureBtn = document.getElementById('captureBtn');
const shareRow = document.getElementById('shareRow');
const shareFb = document.getElementById('shareFb');
const shareTwitter = document.getElementById('shareTwitter');
const shareLinkedin = document.getElementById('shareLinkedin');
const shareIg = document.getElementById('shareIg');

// Store last fetched data and captured image blob
let lastUserData = null;
let capturedBlob = null;

// ---------- Company definitions (top 9) ----------
const companies = [
  {
    name: 'Google',
    brandBg: '#4285F4',
    brandText: '#FFFFFF',
    weights: { followers: 30, repos: 30, age: 20, bio: 10, twitter: 5, name: 5, location: 0 },
  },
  {
    name: 'Meta',
    brandBg: '#1877F2',
    brandText: '#FFFFFF',
    weights: {
      followers: 40,
      repos: 20,
      age: 10,
      bio: 10,
      twitter: 10,
      name: 5,
      location: 5,
    },
  },
  {
    name: 'Apple',
    brandBg: '#000000',
    brandText: '#FFFFFF',
    weights: {
      followers: 20,
      repos: 20,
      age: 15,
      bio: 20,
      twitter: 5,
      name: 10,
      location: 10,
    },
  },
  {
    name: 'Amazon',
    brandBg: '#FF9900',
    brandText: '#000000',
    weights: { followers: 25, repos: 25, age: 25, bio: 10, twitter: 5, name: 5, location: 5 },
  },
  {
    name: 'Netflix',
    brandBg: '#E50914',
    brandText: '#FFFFFF',
    weights: {
      followers: 35,
      repos: 15,
      age: 15,
      bio: 15,
      twitter: 10,
      name: 5,
      location: 5,
    },
  },
  {
    name: 'Microsoft',
    brandBg: '#00A4EF',
    brandText: '#FFFFFF',
    weights: { followers: 25, repos: 30, age: 20, bio: 10, twitter: 5, name: 5, location: 5 },
  },
  {
    name: 'Uber',
    brandBg: '#09091A',
    brandText: '#FFFFFF',
    weights: {
      followers: 30,
      repos: 20,
      age: 15,
      bio: 15,
      twitter: 10,
      name: 5,
      location: 5,
    },
  },
  {
    name: 'Airbnb',
    brandBg: '#FF5A5F',
    brandText: '#FFFFFF',
    weights: {
      followers: 20,
      repos: 20,
      age: 15,
      bio: 20,
      twitter: 10,
      name: 5,
      location: 10,
    },
  },
  {
    name: 'Tesla',
    brandBg: '#CC0000',
    brandText: '#FFFFFF',
    weights: { followers: 30, repos: 25, age: 20, bio: 10, twitter: 5, name: 5, location: 5 },
  },
];

// ---------- Curated list of FAANG developers ----------
const faangDevelopers = [
  { username: 'gaearon', name: 'Dan Abramov', company: 'Meta' },
  { username: 'acdlite', name: 'Andrew Clark', company: 'Meta' },
  { username: 'sophiebits', name: 'Sophie Alpert', company: 'Meta' },
  { username: 'zpao', name: 'Paul O’Shannessy', company: 'Meta' },
  { username: 'sebmarkbage', name: 'Sebastian Markbåge', company: 'Meta' },
  { username: 'rakyll', name: 'JBD', company: 'Google' },
  { username: 'campoy', name: 'Francesc Campoy', company: 'Google' },
  { username: 'adg', name: 'Andrew Gerrand', company: 'Google' },
  { username: 'jadekler', name: 'Jay DeKler', company: 'Google' },
  { username: 'vjeux', name: 'Vjeux', company: 'Meta' },
  { username: 'jordwalke', name: 'Jordan Walke', company: 'Meta' },
  { username: 'wincent', name: 'Greg Hurrell', company: 'Meta' },
  { username: 'kentcdodds', name: 'Kent C. Dodds', company: 'Remix' },
];

// ---------- Deterministic pick from faangDevelopers based on username ----------
function getSimilarUser(data) {
  const login = data.login;
  let hash = 0;
  for (let i = 0; i < login.length; i++) {
    hash = (hash << 5) - hash + login.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % faangDevelopers.length;
  const dev = faangDevelopers[index];
  return `@${dev.username} (${dev.name}) – ${dev.company}`;
}

// ---------- Compute raw metrics (0-100) ----------
function computeRawMetrics(data) {
  const followersScore = Math.min(100, (data.followers || 0) / 10);
  const reposScore = Math.min(100, (data.public_repos || 0) * 2);
  const created = new Date(data.created_at);
  const ageInYears = (new Date() - created) / (1000 * 60 * 60 * 24 * 365);
  const ageScore = Math.min(100, ageInYears * 10);
  const bioScore = data.bio ? 100 : 0;
  const twitterScore = data.twitter_username ? 100 : 0;
  const nameScore = data.name ? 100 : 0;
  const locationScore = data.location ? 100 : 0;
  return {
    followersScore,
    reposScore,
    ageScore,
    bioScore,
    twitterScore,
    nameScore,
    locationScore,
  };
}

// ---------- Compute company scores ----------
function computeCompanyScores(data) {
  const metrics = computeRawMetrics(data);
  return companies.map((company) => {
    const { weights } = company;
    let score = 0;
    score += metrics.followersScore * (weights.followers / 100);
    score += metrics.reposScore * (weights.repos / 100);
    score += metrics.ageScore * (weights.age / 100);
    score += metrics.bioScore * (weights.bio / 100);
    score += metrics.twitterScore * (weights.twitter / 100);
    score += metrics.nameScore * (weights.name / 100);
    score += metrics.locationScore * (weights.location / 100);
    score = Math.min(100, Math.max(0, Math.round(score)));
    return {
      company: company.name,
      score,
      brandBg: company.brandBg,
      brandText: company.brandText,
    };
  });
}

// ---------- Estimate fun stats ----------
function computeStats(data) {
  const repos = data.public_repos || 1;
  const gists = data.public_gists || 0;
  const followers = data.followers || 0;
  const accountAge = (new Date() - new Date(data.created_at)) / (1000 * 60 * 60 * 24 * 365);
  const lines = Math.round(repos * 2000 + gists * 200 + followers * 10);
  const hours = Math.round(lines / 100);
  const commits = Math.round(repos * accountAge * 30 + followers * 2);
  return { lines, hours, commits };
}

// ---------- Render the company scores grid ----------
function renderScores(scores) {
  let html = '';
  scores.forEach((item) => {
    html += `
                    <div class="company-card rounded-xl p-3 shadow-sm flex flex-col items-center" 
                         style="background-color: ${item.brandBg}; color: ${item.brandText};">
                        <div class="text-sm font-semibold opacity-90 mb-1">${item.company}</div>
                        <div class="text-2xl font-bold">${item.score}%</div>
                    </div>
                `;
  });
  scoresGrid.innerHTML = html;
}

// Update UI with user data
function displayUserData(data, newCalculation = true) {
  avatarImg.src = data.avatar_url;
  userName.textContent = data.name || data.login;
  userLogin.textContent = data.login;

  const stats = computeStats(data);
  linesCount.textContent = stats.lines.toLocaleString();
  timeSpent.textContent = stats.hours.toLocaleString() + ' hrs';
  commitsCount.textContent = stats.commits.toLocaleString();

  const scores = computeCompanyScores(data);
  renderScores(scores);

  similarUser.textContent = getSimilarUser(data);

  loadingSpinner.classList.add('hidden');
  resultContent.classList.remove('hidden');
  errorDisplay.classList.add('hidden');
  resultCard.classList.remove('hidden');
  shareRow.classList.add('hidden'); // hide share row until new capture
  capturedBlob = null;

  if (newCalculation) {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#a855f7', '#ec4899'],
    });
  }

  lastUserData = data;
}

function showError(message) {
  loadingSpinner.classList.add('hidden');
  resultContent.classList.add('hidden');
  errorDisplay.textContent = message;
  errorDisplay.classList.remove('hidden');
  resultCard.classList.remove('hidden');
  shareRow.classList.add('hidden');
}

function setLoading() {
  resultCard.classList.remove('hidden');
  loadingSpinner.classList.remove('hidden');
  resultContent.classList.add('hidden');
  errorDisplay.classList.add('hidden');
  shareRow.classList.add('hidden');
}

// Fetch user
async function fetchGitHubUser(username) {
  if (!username.trim()) {
    showError('Please enter a GitHub username.');
    return;
  }
  setLoading();
  try {
    const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`);
    if (response.status === 404) {
      showError(`User "${username}" not found.`);
      return;
    }
    if (response.status === 403) {
      showError('API rate limit exceeded. Try again in an hour.');
      return;
    }
    if (!response.ok) {
      showError(`Error: ${response.status} - ${response.statusText}`);
      return;
    }
    const data = await response.json();
    displayUserData(data, true);
  } catch (error) {
    showError('Network error. Check connection.');
  }
}

// Capture button: generate screenshot, download automatically, and show share row
captureBtn.addEventListener('click', async () => {
  if (!lastUserData) return;

  captureBtn.disabled = true;
  const originalText = captureBtn.textContent;
  captureBtn.textContent = '📸 Capturing...';

  try {
    const element = resultContent;
    element.classList.remove('fade-scale-enter');

    const canvas = await html2canvas(element, {
      scale: 3,
      backgroundColor: '#ffffff',
      allowTaint: false,
      useCORS: true,
      logging: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    element.classList.add('fade-scale-enter');

    // Convert to blob and trigger download
    canvas.toBlob((blob) => {
      capturedBlob = blob;
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `faang-${lastUserData.login}.png`;
      a.click();
      URL.revokeObjectURL(url);

      // Show share row
      shareRow.classList.remove('hidden');

      // Optional confetti
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
    }, 'image/png');
  } catch (error) {
    console.error('Capture error:', error);
    alert('Could not capture screenshot. Please try again.');
  } finally {
    captureBtn.disabled = false;
    captureBtn.textContent = originalText;
  }
});

// Share to Facebook (text + link)
shareFb.addEventListener('click', () => {
  if (!lastUserData) return;
  const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://github.com/' + lastUserData.login)}&quote=${encodeURIComponent('Check out my FAANG potential scorecard!')}`;
  window.open(url, '_blank', 'width=600,height=400');
});

// Share to Twitter (text + link)
shareTwitter.addEventListener('click', () => {
  if (!lastUserData) return;
  const text = `My FAANG potential scorecard for @${lastUserData.login} – check it out!`;
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent('https://github.com/' + lastUserData.login)}`;
  window.open(url, '_blank', 'width=600,height=400');
});

// Share to LinkedIn (text + link)
shareLinkedin.addEventListener('click', () => {
  if (!lastUserData) return;
  const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://github.com/' + lastUserData.login)}`;
  window.open(url, '_blank', 'width=600,height=400');
});

// Share to Instagram – copy image to clipboard (since direct share not possible)
shareIg.addEventListener('click', async () => {
  if (!capturedBlob) {
    alert('Please capture the image first.');
    return;
  }
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        [capturedBlob.type]: capturedBlob,
      }),
    ]);
    alert('Image copied to clipboard! You can now paste it on Instagram.');
  } catch (err) {
    console.error('Copy failed:', err);
    // Fallback: download the image
    const url = URL.createObjectURL(capturedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `faang-${lastUserData.login}.png`;
    a.click();
    URL.revokeObjectURL(url);
    alert('Image downloaded – you can now upload it to Instagram.');
  }
});

// Event listeners
fetchBtn.addEventListener('click', () => fetchGitHubUser(usernameInput.value));
usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') fetchGitHubUser(usernameInput.value);
});
