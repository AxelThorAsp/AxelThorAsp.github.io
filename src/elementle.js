// Elementle game logic
// Depends on global ELEMENTS and ANCIENT_YEAR from src/elements.js

(function () {
    'use strict';

    const MAX_GUESSES = 5;
    const GAME_URL = 'https://axelthorasp.github.io/elementle.html';

    // Numeric closeness thresholds
    const THRESHOLDS = {
        atomicNumber: 5,
        atomicMass: 15,
        group: 1,
        period: 1,
        discoveryYear: 25,
    };

    // ----- Date / RNG -----

    function todayUTCString() {
        const now = new Date();
        const y = now.getUTCFullYear();
        const m = String(now.getUTCMonth() + 1).padStart(2, '0');
        const d = String(now.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    // Deterministic hash -> integer
    function hashString(str) {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619) >>> 0;
        }
        return h >>> 0;
    }

    function pickDailyAnswer(dateStr) {
        const idx = hashString(dateStr) % ELEMENTS.length;
        return ELEMENTS[idx];
    }

    // ----- Persistence -----

    const STORAGE_PREFIX = 'elementle:';

    function loadState(dateStr) {
        try {
            const raw = localStorage.getItem(STORAGE_PREFIX + dateStr);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    function saveState(dateStr, state) {
        try {
            localStorage.setItem(STORAGE_PREFIX + dateStr, JSON.stringify(state));
        } catch (e) {
            // ignore quota / privacy errors
        }
    }

    // ----- Lookups -----

    const byKey = new Map();
    ELEMENTS.forEach(el => {
        byKey.set(el.name.toLowerCase(), el);
        byKey.set(el.symbol.toLowerCase(), el);
    });

    function findElement(input) {
        if (!input) return null;
        return byKey.get(input.trim().toLowerCase()) || null;
    }

    // ----- Feedback computation -----

    function compareNumeric(guess, answer, threshold) {
        if (guess === answer) return { result: 'exact', arrow: '' };
        const diff = answer - guess;
        const arrow = diff > 0 ? '▲' : '▼';
        if (Math.abs(diff) <= threshold) return { result: 'close', arrow };
        return { result: 'far', arrow };
    }

    function compareCategorical(guess, answer) {
        return guess === answer
            ? { result: 'exact', arrow: '' }
            : { result: 'far', arrow: '' };
    }

    function computeFeedback(guess, answer) {
        return {
            symbol:        compareCategorical(guess.symbol, answer.symbol),
            atomicNumber:  compareNumeric(guess.atomicNumber, answer.atomicNumber, THRESHOLDS.atomicNumber),
            atomicMass:    compareNumeric(guess.atomicMass, answer.atomicMass, THRESHOLDS.atomicMass),
            group:         compareNumeric(guess.group, answer.group, THRESHOLDS.group),
            period:        compareNumeric(guess.period, answer.period, THRESHOLDS.period),
            discoveryYear: compareNumeric(guess.discoveryYear, answer.discoveryYear, THRESHOLDS.discoveryYear),
            state:         compareCategorical(guess.state, answer.state),
        };
    }

    function formatYear(year) {
        return year === ANCIENT_YEAR ? 'Ancient' : String(year);
    }

    // ----- DOM -----

    const els = {
        puzzleDate:     document.getElementById('puzzle-date'),
        guessesLeft:    document.getElementById('guesses-left'),
        input:          document.getElementById('guess-input'),
        suggestions:    document.getElementById('suggestions'),
        submitBtn:      document.getElementById('submit-btn'),
        errorMsg:       document.getElementById('error-msg'),
        grid:           document.getElementById('guess-grid'),
        endgame:        document.getElementById('endgame'),
        endgameTitle:   document.getElementById('endgame-title'),
        endgameDetail:  document.getElementById('endgame-detail'),
        shareBtn:       document.getElementById('share-btn'),
        shareFeedback:  document.getElementById('share-feedback'),
    };

    // ----- State -----

    const dateStr = todayUTCString();
    const answer = pickDailyAnswer(dateStr);

    let game = loadState(dateStr) || {
        date: dateStr,
        guessSymbols: [], // array of element symbols (in order)
        finished: false,
        won: false,
    };

    // ----- Rendering -----

    const COLUMN_ORDER = [
        { key: 'symbol',        format: el => el.symbol },
        { key: 'atomicNumber',  format: el => String(el.atomicNumber) },
        { key: 'atomicMass',    format: el => el.atomicMass.toFixed(2) },
        { key: 'group',         format: el => String(el.group) },
        { key: 'period',        format: el => String(el.period) },
        { key: 'discoveryYear', format: el => formatYear(el.discoveryYear) },
        { key: 'state',         format: el => el.state },
    ];

    function renderRow(guessEl) {
        const fb = computeFeedback(guessEl, answer);
        const row = document.createElement('div');
        row.className = 'guess-row';

        COLUMN_ORDER.forEach(col => {
            const cell = document.createElement('div');
            const f = fb[col.key];
            cell.className = `tile ${f.result}`;
            const value = document.createElement('div');
            value.className = 'tile-value';
            value.textContent = col.format(guessEl);
            cell.appendChild(value);
            if (f.arrow) {
                const arrow = document.createElement('div');
                arrow.className = 'tile-arrow';
                arrow.textContent = f.arrow;
                cell.appendChild(arrow);
            }
            row.appendChild(cell);
        });

        els.grid.appendChild(row);
    }

    function renderAllGuesses() {
        els.grid.innerHTML = '';
        game.guessSymbols.forEach(sym => {
            const el = findElement(sym);
            if (el) renderRow(el);
        });
        const used = game.guessSymbols.length;
        els.guessesLeft.textContent = String(Math.max(0, MAX_GUESSES - used));
    }

    function renderHeaderDate() {
        els.puzzleDate.textContent = dateStr;
    }

    function showError(msg) {
        els.errorMsg.textContent = msg;
        if (msg) setTimeout(() => {
            if (els.errorMsg.textContent === msg) els.errorMsg.textContent = '';
        }, 3500);
    }

    function showEndgame() {
        const guessCount = game.guessSymbols.length;
        if (game.won) {
            els.endgameTitle.textContent = 'You got it! 🎉';
            els.endgameDetail.innerHTML =
                `Solved in ${guessCount}/${MAX_GUESSES}. Today's element was ` +
                `<strong>${answer.name} (${answer.symbol})</strong>. Come back tomorrow!`;
        } else {
            els.endgameTitle.textContent = 'Out of guesses';
            els.endgameDetail.innerHTML =
                `Today's element was <strong>${answer.name} (${answer.symbol})</strong>. ` +
                `<a href="https://en.wikipedia.org/wiki/${encodeURIComponent(answer.name)}" target="_blank" rel="noopener">Read more</a>.`;
        }
        els.endgame.hidden = false;
        els.input.disabled = true;
        els.submitBtn.disabled = true;
    }

    // ----- Share -----

    const EMOJI = { exact: '🟩', close: '🟨', far: '🟥' };

    // Columns shown in share grid (excludes the symbol column to keep it 6-wide)
    const SHARE_COLUMNS = ['atomicNumber', 'atomicMass', 'group', 'period', 'discoveryYear', 'state'];

    function buildShareText() {
        const guessCount = game.guessSymbols.length;
        const score = game.won ? `${guessCount}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
        const lines = [`Elementle ${dateStr}  ${score}`];
        game.guessSymbols.forEach(sym => {
            const el = findElement(sym);
            if (!el) return;
            const fb = computeFeedback(el, answer);
            const row = SHARE_COLUMNS.map(k => EMOJI[fb[k].result]).join('');
            lines.push(row);
        });
        lines.push(GAME_URL);
        return lines.join('\n');
    }

    async function handleShare() {
        const text = buildShareText();
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                fallbackCopy(text);
            }
            els.shareFeedback.textContent = 'Copied!';
            setTimeout(() => { els.shareFeedback.textContent = ''; }, 2000);
        } catch (e) {
            els.shareFeedback.textContent = 'Copy failed';
        }
    }

    function fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }

    // ----- Submit flow -----

    function submitGuess() {
        if (game.finished) return;
        const raw = els.input.value;
        const guess = findElement(raw);
        if (!guess) {
            showError('Unknown element. Try a name or symbol from the periodic table (1-92).');
            return;
        }
        if (game.guessSymbols.includes(guess.symbol)) {
            showError('You already guessed that element.');
            return;
        }

        game.guessSymbols.push(guess.symbol);
        renderRow(guess);
        els.input.value = '';
        hideSuggestions();

        const used = game.guessSymbols.length;
        els.guessesLeft.textContent = String(Math.max(0, MAX_GUESSES - used));

        if (guess.symbol === answer.symbol) {
            game.won = true;
            game.finished = true;
        } else if (used >= MAX_GUESSES) {
            game.finished = true;
        }

        saveState(dateStr, game);

        if (game.finished) showEndgame();
    }

    // ----- Autocomplete -----

    let activeSuggestionIndex = -1;
    let currentSuggestions = [];

    function updateSuggestions() {
        const q = els.input.value.trim().toLowerCase();
        if (!q) {
            hideSuggestions();
            return;
        }
        currentSuggestions = ELEMENTS
            .filter(el =>
                el.name.toLowerCase().startsWith(q) ||
                el.symbol.toLowerCase() === q ||
                el.symbol.toLowerCase().startsWith(q))
            .filter(el => !game.guessSymbols.includes(el.symbol))
            .slice(0, 8);

        if (currentSuggestions.length === 0) {
            hideSuggestions();
            return;
        }

        els.suggestions.innerHTML = '';
        currentSuggestions.forEach((el, i) => {
            const li = document.createElement('li');
            li.textContent = `${el.symbol} — ${el.name}`;
            li.addEventListener('mousedown', (e) => {
                e.preventDefault();
                els.input.value = el.name;
                hideSuggestions();
                submitGuess();
            });
            els.suggestions.appendChild(li);
        });
        activeSuggestionIndex = -1;
        els.suggestions.hidden = false;
    }

    function hideSuggestions() {
        els.suggestions.hidden = true;
        els.suggestions.innerHTML = '';
        currentSuggestions = [];
        activeSuggestionIndex = -1;
    }

    function highlightSuggestion(idx) {
        const items = els.suggestions.querySelectorAll('li');
        items.forEach((li, i) => li.classList.toggle('active', i === idx));
    }

    els.input.addEventListener('input', updateSuggestions);
    els.input.addEventListener('focus', updateSuggestions);
    els.input.addEventListener('blur', () => setTimeout(hideSuggestions, 120));

    els.input.addEventListener('keydown', (e) => {
        if (!els.suggestions.hidden && currentSuggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeSuggestionIndex = (activeSuggestionIndex + 1) % currentSuggestions.length;
                highlightSuggestion(activeSuggestionIndex);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeSuggestionIndex = (activeSuggestionIndex - 1 + currentSuggestions.length) % currentSuggestions.length;
                highlightSuggestion(activeSuggestionIndex);
                return;
            }
            if (e.key === 'Tab' && activeSuggestionIndex >= 0) {
                e.preventDefault();
                els.input.value = currentSuggestions[activeSuggestionIndex].name;
                hideSuggestions();
                return;
            }
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            if (activeSuggestionIndex >= 0 && currentSuggestions[activeSuggestionIndex]) {
                els.input.value = currentSuggestions[activeSuggestionIndex].name;
            }
            hideSuggestions();
            submitGuess();
        } else if (e.key === 'Escape') {
            hideSuggestions();
        }
    });

    els.submitBtn.addEventListener('click', submitGuess);
    els.shareBtn.addEventListener('click', handleShare);

    // ----- Init -----

    renderHeaderDate();
    renderAllGuesses();
    if (game.finished) showEndgame();
})();
