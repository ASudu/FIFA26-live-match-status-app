// State variables
let matchesData = [];
let statsData = {};
let selectedMatchId = null;
let currentFilter = 'all'; // 'all', 'live', 'upcoming', 'finished'
let searchQuery = '';

// DOM Elements
const matchesContainer = document.getElementById('matchesContainer');
const searchInput = document.getElementById('searchInput');
const filterTabs = document.querySelectorAll('.filter-tab');
const refreshBtn = document.getElementById('refreshBtn');

// Details Panel Elements
const emptyDetails = document.getElementById('emptyDetails');
const activeDetails = document.getElementById('activeDetails');
const detailStage = document.getElementById('detailStage');
const detailGroup = document.getElementById('detailGroup');
const detailHomeName = document.getElementById('detailHomeName');
const detailAwayName = document.getElementById('detailAwayName');
const detailHomeFlag = document.getElementById('detailHomeFlag');
const detailAwayFlag = document.getElementById('detailAwayFlag');
const detailScoreHome = document.getElementById('detailScoreHome');
const detailScoreAway = document.getElementById('detailScoreAway');
const detailVsLabel = document.getElementById('detailVsLabel');
const detailMatchTime = document.getElementById('detailMatchTime');
const detailDate = document.getElementById('detailDate');
const detailStadium = document.getElementById('detailStadium');
const detailCity = document.getElementById('detailCity');
const detailReferee = document.getElementById('detailReferee');
const tweetTextarea = document.getElementById('tweetTextarea');
const btnTweet = document.getElementById('btnTweet');

// Stats Elements
const statTotal = document.getElementById('statTotal');
const statLive = document.getElementById('statLive');
const statPlayed = document.getElementById('statPlayed');
const statUpcoming = document.getElementById('statUpcoming');
const statGoals = document.getElementById('statGoals');
const progressText = document.getElementById('progressText');
const progressBarFill = document.getElementById('progressBarFill');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Refresh button
    refreshBtn.addEventListener('click', fetchData);

    // Search input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderMatches();
    });

    // Filter tabs
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.getAttribute('data-filter');
            renderMatches();
        });
    });

    // Tweet button
    btnTweet.addEventListener('click', () => {
        const text = tweetTextarea.value;
        if (text) {
            const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
            window.open(tweetUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
        }
    });
}

// Fetch matches from API
async function fetchData() {
    try {
        refreshBtn.classList.add('loading');
        refreshBtn.disabled = true;
        
        const response = await fetch('/api/matches');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        matchesData = data.matches || [];
        statsData = data.stats || {};
        
        updateStats();
        renderMatches();
        
        // If a match was previously selected, refresh its details
        if (selectedMatchId) {
            const updatedMatch = matchesData.find(m => m.idMatch === selectedMatchId);
            if (updatedMatch) {
                selectMatch(updatedMatch);
            } else {
                deselectMatch();
            }
        }
    } catch (error) {
        console.error('Error fetching matches:', error);
        alert('Failed to refresh match updates. Showing cached offline data instead.');
    } finally {
        setTimeout(() => {
            refreshBtn.classList.remove('loading');
            refreshBtn.disabled = false;
        }, 600);
    }
}

// Update stats counters
function updateStats() {
    statTotal.textContent = statsData.total || 0;
    statLive.textContent = statsData.live || 0;
    statPlayed.textContent = statsData.played || 0;
    statUpcoming.textContent = statsData.upcoming || 0;
    statGoals.textContent = statsData.goals || 0;
    
    // Update progress bar
    if (statsData.total > 0) {
        const percentage = Math.round((statsData.played / statsData.total) * 100);
        progressText.textContent = `${statsData.played} of ${statsData.total} matches completed (${percentage}%)`;
        progressBarFill.style.width = `${percentage}%`;
    }
    
    // Add glowing pulse to Live tab if there are active live matches
    const liveTab = document.querySelector('[data-filter="live"]');
    if (statsData.live > 0) {
        liveTab.classList.add('active-live');
    } else {
        liveTab.classList.remove('active-live');
    }
}

// Helper to format date nicely in local timezone
function formatLocalDate(utcDateStr) {
    if (!utcDateStr) return 'TBD';
    const date = new Date(utcDateStr);
    return date.toLocaleDateString(undefined, { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
    });
}

function formatLocalTime(utcDateStr) {
    if (!utcDateStr) return 'TBD';
    const date = new Date(utcDateStr);
    return date.toLocaleTimeString(undefined, { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
    });
}

// Render the list of matches
function renderMatches() {
    matchesContainer.innerHTML = '';
    
    const filteredMatches = matchesData.filter(m => {
        // Filter by Status
        if (currentFilter === 'live' && m.status !== 3) return false;
        if (currentFilter === 'upcoming' && m.status !== 1) return false;
        if (currentFilter === 'finished' && m.status !== 0) return false;
        
        // Filter by Search Query
        if (searchQuery) {
            const home = m.home.name.toLowerCase();
            const away = m.away.name.toLowerCase();
            const venue = m.stadium.toLowerCase();
            const city = m.city.toLowerCase();
            const stage = m.stage.toLowerCase();
            const group = m.group ? m.group.toLowerCase() : '';
            
            const matchNumStr = `#${m.matchNumber}`;
            
            return home.includes(searchQuery) || 
                   away.includes(searchQuery) || 
                   venue.includes(searchQuery) || 
                   city.includes(searchQuery) || 
                   stage.includes(searchQuery) ||
                   group.includes(searchQuery) ||
                   matchNumStr.includes(searchQuery);
        }
        
        return true;
    });
    
    if (filteredMatches.length === 0) {
        matchesContainer.innerHTML = `
            <div class="empty-details animate-fade-in">
                <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
                <h3>No matches found</h3>
                <p>Try refining your search or changing the filter tab.</p>
            </div>
        `;
        return;
    }
    
    filteredMatches.forEach(m => {
        const card = document.createElement('div');
        card.className = `match-card animate-fade-in ${selectedMatchId === m.idMatch ? 'selected' : ''} ${m.status === 3 ? 'live-card' : ''}`;
        card.setAttribute('data-id', m.idMatch);
        
        // Status Badge
        let badgeHtml = '';
        if (m.status === 3) {
            badgeHtml = `<span class="match-badge live"><i class="fa-solid fa-circle"></i> Live</span>`;
        } else if (m.status === 0) {
            badgeHtml = `<span class="match-badge finished">Finished</span>`;
        } else {
            badgeHtml = `<span class="match-badge upcoming">Upcoming</span>`;
        }
        
        // Score Display
        let scoreHtml = '';
        if (m.status === 0 || m.status === 3) {
            scoreHtml = `
                <div class="score-display ${m.status === 3 ? 'live-score' : ''}">
                    <span>${m.home.score}</span>
                    <span class="score-divider">-</span>
                    <span>${m.away.score}</span>
                </div>
            `;
        } else {
            scoreHtml = `
                <div class="score-display">
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight:500;">VS</span>
                </div>
            `;
        }
        
        // Flags
        const homeFlagUrl = m.home.flag || 'https://flagcdn.com/w80/un.png';
        const awayFlagUrl = m.away.flag || 'https://flagcdn.com/w80/un.png';
        
        // Time & Date format
        const dateFormatted = formatLocalDate(m.date);
        const timeFormatted = formatLocalTime(m.date);
        
        card.innerHTML = `
            <div class="card-header">
                <div class="match-meta">
                    <span class="match-no">#${m.matchNumber}</span>
                    <span class="match-stage">${m.stage} ${m.group ? `• ${m.group}` : ''}</span>
                </div>
                ${badgeHtml}
            </div>
            
            <div class="score-row">
                <div class="team-display home-team">
                    <span class="team-name" title="${m.home.name}">${m.home.name}</span>
                    <img class="team-flag" src="${homeFlagUrl}" alt="${m.home.name}" onerror="this.src='https://flagcdn.com/w80/un.png'">
                </div>
                
                ${scoreHtml}
                
                <div class="team-display away-team">
                    <img class="team-flag" src="${awayFlagUrl}" alt="${m.away.name}" onerror="this.src='https://flagcdn.com/w80/un.png'">
                    <span class="team-name" title="${m.away.name}">${m.away.name}</span>
                </div>
            </div>
            
            <div class="card-footer">
                <div class="venue-info">
                    <i class="fa-solid fa-location-dot"></i>
                    <span>${m.city}</span>
                </div>
                
                <div class="time-info ${m.status === 3 ? 'live-time' : ''}">
                    ${m.status === 3 ? `<i class="fa-regular fa-clock"></i> ${m.matchTime || "Live"}` : `${dateFormatted} at ${timeFormatted}`}
                </div>
            </div>
        `;
        
        // Click to Select Match
        card.addEventListener('click', () => {
            document.querySelectorAll('.match-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedMatchId = m.idMatch;
            selectMatch(m);
        });
        
        matchesContainer.appendChild(card);
    });
}

// Handle match selection
function selectMatch(m) {
    emptyDetails.style.display = 'none';
    activeDetails.style.display = 'flex';
    activeDetails.classList.add('animate-fade-in');
    
    // Populating basic text fields
    detailStage.textContent = m.stage;
    detailGroup.textContent = m.group ? `• ${m.group}` : '';
    detailHomeName.textContent = m.home.name;
    detailAwayName.textContent = m.away.name;
    detailStadium.textContent = m.stadium;
    detailCity.textContent = m.city;
    detailReferee.textContent = m.referee || 'TBD';
    
    // Flag images
    detailHomeFlag.src = m.home.flag || 'https://flagcdn.com/w80/un.png';
    detailAwayFlag.src = m.away.flag || 'https://flagcdn.com/w80/un.png';
    
    // Status and Time display
    if (m.status === 0 || m.status === 3) {
        detailScoreHome.style.display = 'block';
        detailScoreAway.style.display = 'block';
        detailScoreHome.textContent = m.home.score;
        detailScoreAway.textContent = m.away.score;
        detailVsLabel.style.display = 'none';
        
        if (m.status === 3) {
            detailMatchTime.style.display = 'inline-block';
            detailMatchTime.innerHTML = `<i class="fa-solid fa-circle" style="color: var(--accent-red); font-size: 0.55rem; vertical-align: middle; margin-right: 0.25rem; animation: pulse 1.5s infinite;"></i> ${m.matchTime || 'Live'}`;
        } else {
            detailMatchTime.style.display = 'inline-block';
            detailMatchTime.textContent = 'Finished';
        }
    } else {
        detailScoreHome.style.display = 'none';
        detailScoreAway.style.display = 'none';
        detailVsLabel.style.display = 'block';
        detailMatchTime.style.display = 'none';
    }
    
    // Date & Time formatting
    const fullDate = new Date(m.date);
    detailDate.textContent = fullDate.toLocaleString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
    
    // Set up Tweet Content based on status
    generateTweet(m);
}

// Deselect match card
function deselectMatch() {
    selectedMatchId = null;
    emptyDetails.style.display = 'flex';
    activeDetails.style.display = 'none';
}

// Generate pre-formatted Tweet text
function generateTweet(m) {
    let text = '';
    const flagHome = getFlagEmoji(m.home.id) || '⚽';
    const flagAway = getFlagEmoji(m.away.id) || '⚽';
    
    if (m.status === 3) {
        text = `🔥 FIFA World Cup 2026 Live Update!\n\n${flagHome} ${m.home.name} ${m.home.score} - ${m.away.score} ${m.away.name} ${flagAway}\n⏱️ Time: ${m.matchTime || 'Live'}\n📍 Venue: ${m.stadium}, ${m.city}\n\n#WorldCup2026 #FIFAWorldCup`;
    } else if (m.status === 0) {
        text = `🏆 FIFA World Cup 2026 Result!\n\n${flagHome} ${m.home.name} ${m.home.score} - ${m.away.score} ${m.away.name} ${flagAway}\n🏁 Match Finished\n📍 Venue: ${m.stadium}, ${m.city}\n\n#WorldCup2026 #FIFAWorldCup`;
    } else {
        const fullDate = new Date(m.date);
        const dateStr = fullDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const timeStr = fullDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        
        text = `⚽ FIFA World Cup 2026 Upcoming Match!\n\n${flagHome} ${m.home.name} vs ${m.away.name} ${flagAway}\n📅 Date: ${dateStr} at ${timeStr}\n📍 Venue: ${m.stadium}, ${m.city}\n\n#WorldCup2026 #FIFAWorldCup`;
    }
    
    tweetTextarea.value = text;
}

// Helper to translate Country code to emoji flag
function getFlagEmoji(countryCode) {
    if (!countryCode) return '';
    
    // Explicit cases for UK home nations in 3-letter codes
    if (countryCode === 'ENG') return '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
    if (countryCode === 'SCO') return '🏴󠁧󠁢󠁳󠁣󠁴󠁿';
    if (countryCode === 'WAL') return '🏴󠁧󠁢󠁷󠁬󠁳󠁿';
    if (countryCode === 'NIR') return '🇬🇧'; // Northern Ireland doesn't have an emoji, fallback to UK
    
    // Mapping of 3-letter to 2-letter codes for standard emoji generation
    const iso2Map = {
        'ALG': 'DZ', 'ARG': 'AR', 'AUS': 'AU', 'AUT': 'AT', 'BEL': 'BE',
        'BIH': 'BA', 'BRA': 'BR', 'CAN': 'CA', 'CIV': 'CI', 'COD': 'CD',
        'COL': 'CO', 'CPV': 'CV', 'CRO': 'HR', 'CUW': 'CW', 'CZE': 'CZ',
        'ECU': 'EC', 'EGY': 'EG', 'ESP': 'ES', 'FRA': 'FR', 'GER': 'DE',
        'GHA': 'GH', 'HAI': 'HT', 'IRN': 'IR', 'IRQ': 'IQ', 'JOR': 'JO',
        'JPN': 'JP', 'KOR': 'KR', 'KSA': 'SA', 'MAR': 'MA', 'MEX': 'MX',
        'NED': 'NL', 'NOR': 'NO', 'NZL': 'NZ', 'PAN': 'PA', 'PAR': 'PY',
        'POR': 'PT', 'QAT': 'QA', 'RSA': 'ZA', 'SEN': 'SN', 'SUI': 'CH',
        'SWE': 'SE', 'TUN': 'TN', 'TUR': 'TR', 'URU': 'UY', 'USA': 'US',
        'UZB': 'UZ'
    };
    
    const code = iso2Map[countryCode];
    if (!code) return '⚽';
    
    return code
        .toUpperCase()
        .replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
}
