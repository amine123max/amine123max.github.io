// Sidebar metric rolling digits animation.
// Uses per-digit timing and right-to-left carry-style sequencing.
document.addEventListener('DOMContentLoaded', function () {
  var metrics = Array.prototype.slice.call(document.querySelectorAll('.metric-value'));
  if (!metrics.length) return;

  var SLOT_HEIGHT = 1.18; // em, must match CSS
  var DIGIT_STEP_MS = 130; // per digit-step duration
  var ENTRY_REPLAY_DELAY_MS = 220;
  var ENTRY_REPLAY_RETRY_MS = 180;
  var ENTRY_REPLAY_MAX_RETRIES = 8;
  var entryReplayAttempts = 0;

  function normalizeValue(value) {
    return String(value == null ? '' : value).replace(/\s+/g, '').trim();
  }

  function isDigit(ch) {
    return /^[0-9]$/.test(ch || '');
  }

  function isMetricVisible(metric) {
    if (!metric) return false;
    var style = window.getComputedStyle(metric);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
      return false;
    }
    var rect = metric.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return false;
    return rect.right > 0 &&
      rect.left < window.innerWidth &&
      rect.bottom > 0 &&
      rect.top < window.innerHeight;
  }

  function hasPendingEntryReplay() {
    return metrics.some(function (metric) {
      return metric.dataset.rollEntryPlayed !== '1';
    });
  }

  function buildSeedValue(value) {
    // Entry animation baseline: all digits start from 0.
    return String(value || '').replace(/[0-9]/g, '0');
  }

  function calcDigitSteps(oldDigit, nextDigit) {
    var steps = nextDigit >= oldDigit ? nextDigit - oldDigit : 10 - oldDigit + nextDigit;
    return steps <= 0 ? 10 : steps;
  }

  function parseRollNumberModel(value) {
    var text = normalizeValue(value);
    var hasK = /k$/i.test(text);
    var digitsOnly = text.replace(/[^0-9]/g, '');
    var numeric = digitsOnly ? Number(digitsOnly) : 0;
    return {
      mode: hasK ? 'k10' : 'int',
      value: Number.isFinite(numeric) ? numeric : 0
    };
  }

  function buildDigitOrderMap(chars) {
    var orderByIndex = [];
    var order = 0;
    for (var i = chars.length - 1; i >= 0; i -= 1) {
      if (!isDigit(chars[i])) continue;
      orderByIndex[i] = order;
      order += 1;
    }
    return orderByIndex;
  }

  function applyLengthClass(metric, value) {
    var lenClasses = metric.className.match(/\bmetric-roll-len-\d+\b/g) || [];
    for (var i = 0; i < lenClasses.length; i += 1) {
      metric.classList.remove(lenClasses[i]);
    }

    var len = (value || '').length;
    if (len >= 5) {
      metric.classList.add('metric-roll-len-' + Math.min(len, 8));
    }
  }

  function createCharNode(ch) {
    var node = document.createElement('span');
    node.className = 'metric-roll-char';
    node.textContent = ch;
    return node;
  }

  function createDigitNode(oldDigit, nextDigit, animate, timing) {
    var slot = document.createElement('span');
    slot.className = 'metric-roll-digit';

    var track = document.createElement('span');
    track.className = 'metric-roll-track';
    slot.appendChild(track);

    var hasEffectiveSteps = !!(timing && timing.steps > 0);
    if (!animate || (oldDigit === nextDigit && !hasEffectiveSteps)) {
      var stable = document.createElement('span');
      stable.className = 'metric-roll-face';
      stable.textContent = String(nextDigit);
      track.appendChild(stable);
      return slot;
    }

    var steps = timing && timing.steps ? timing.steps : calcDigitSteps(oldDigit, nextDigit);
    for (var i = 0; i <= steps; i += 1) {
      var face = document.createElement('span');
      face.className = 'metric-roll-face';
      face.textContent = String((oldDigit + i) % 10);
      track.appendChild(face);
    }

    requestAnimationFrame(function () {
      if (timing) {
        track.style.setProperty('--metric-roll-duration', timing.duration + 'ms');
        track.style.setProperty('--metric-roll-delay', timing.delay + 'ms');
      }
      track.classList.add('is-animating');
      track.style.transform = 'translateY(-' + (steps * SLOT_HEIGHT) + 'em)';
    });

    return slot;
  }

  function buildDigitTimings(oldChars, nextChars, oldOffset, animate, oldValue, nextValue) {
    var timings = [];
    if (!animate) return timings;

    var oldModel = parseRollNumberModel(oldValue);
    var nextModel = parseRollNumberModel(nextValue);
    var useCarrySteps = oldModel.mode === nextModel.mode && nextModel.value >= oldModel.value;
    var digitOrderMap = buildDigitOrderMap(nextChars);

    if (useCarrySteps) {
      for (var j = nextChars.length - 1; j >= 0; j -= 1) {
        var nextChCarry = nextChars[j];
        if (!isDigit(nextChCarry)) continue;

        var oldChCarry = oldChars[j + oldOffset] || '0';
        var oldDigitCarry = isDigit(oldChCarry) ? Number(oldChCarry) : 0;
        var nextDigitCarry = Number(nextChCarry);
        var order = digitOrderMap[j] || 0;
        var weight = Math.pow(10, order);
        var carrySteps = Math.floor(nextModel.value / weight) - Math.floor(oldModel.value / weight);

        if (carrySteps <= 0) {
          var fallbackSteps = oldDigitCarry === nextDigitCarry ? 0 : calcDigitSteps(oldDigitCarry, nextDigitCarry);
          timings[j] = {
            steps: fallbackSteps,
            duration: fallbackSteps * DIGIT_STEP_MS,
            delay: 0
          };
          continue;
        }

        var remainder = oldModel.value % weight;
        var offsetUnits = weight === 1 ? 0 : (remainder === 0 ? weight : (weight - remainder));
        var spanUnits = ((carrySteps - 1) * weight) + 1;
        timings[j] = {
          steps: carrySteps,
          duration: spanUnits * DIGIT_STEP_MS,
          delay: offsetUnits * DIGIT_STEP_MS
        };
      }
      return timings;
    }

    var accumulatedDelay = 0;
    for (var i = nextChars.length - 1; i >= 0; i -= 1) {
      var nextCh = nextChars[i];
      if (!isDigit(nextCh)) continue;

      var oldCh = oldChars[i + oldOffset] || '0';
      var oldDigit = isDigit(oldCh) ? Number(oldCh) : 0;
      var nextDigit = Number(nextCh);
      var steps = calcDigitSteps(oldDigit, nextDigit);

      var duration = steps * DIGIT_STEP_MS;

      timings[i] = {
        steps: steps,
        duration: duration,
        delay: accumulatedDelay
      };

      // Lower digit flips first; higher digit waits for carry-like sequence.
      accumulatedDelay += duration;
    }

    return timings;
  }

  function renderMetric(metric, rawValue, shouldAnimate) {
    var value = normalizeValue(rawValue);
    if (!value) return;

    var oldValue = metric.dataset.rollValue || '';
    var oldChars = oldValue.split('');
    var nextChars = value.split('');
    var oldOffset = oldChars.length - nextChars.length;
    var canAnimate = !!(shouldAnimate && oldChars.length);
    var digitTimings = buildDigitTimings(oldChars, nextChars, oldOffset, canAnimate, oldValue, value);

    var frag = document.createDocumentFragment();

    for (var i = 0; i < nextChars.length; i += 1) {
      var nextCh = nextChars[i];
      var oldCh = oldChars[i + oldOffset] || '0';

      if (!isDigit(nextCh)) {
        frag.appendChild(createCharNode(nextCh));
        continue;
      }

      var oldDigit = isDigit(oldCh) ? Number(oldCh) : 0;
      var nextDigit = Number(nextCh);
      frag.appendChild(createDigitNode(oldDigit, nextDigit, canAnimate, digitTimings[i]));
    }

    metric.dataset.rollSyncing = '1';
    metric.classList.add('metric-roll');
    applyLengthClass(metric, value);
    metric.textContent = '';
    metric.appendChild(frag);
    metric.dataset.rollValue = value;

    setTimeout(function () {
      metric.dataset.rollSyncing = '0';
    }, 0);
  }

  function replayMetricOnEntry(metric) {
    if (!isMetricVisible(metric)) return false;
    if (metric.dataset.rollEntryPlayed === '1') return false;

    var targetValue = metric.dataset.rollValue || normalizeValue(metric.textContent);
    if (!targetValue) {
      metric.dataset.rollEntryPlayed = '1';
      return false;
    }

    var seedValue = buildSeedValue(targetValue);
    metric.dataset.rollValue = seedValue;
    renderMetric(metric, targetValue, true);
    metric.dataset.rollEntryPlayed = '1';
    return true;
  }

  function replayEntryMetrics() {
    var replayedCount = 0;
    metrics.forEach(function (metric) {
      if (replayMetricOnEntry(metric)) {
        replayedCount += 1;
      }
    });
    return replayedCount > 0;
  }

  function tryReplayEntryMetrics() {
    if (!hasPendingEntryReplay()) return;
    replayEntryMetrics();
    if (!hasPendingEntryReplay()) return;

    entryReplayAttempts += 1;
    if (entryReplayAttempts >= ENTRY_REPLAY_MAX_RETRIES) return;
    setTimeout(tryReplayEntryMetrics, ENTRY_REPLAY_RETRY_MS);
  }

  function bindMutationWatch(metric) {
    var observer = new MutationObserver(function () {
      if (metric.dataset.rollSyncing === '1') {
        return;
      }

      var nextValue = normalizeValue(metric.textContent);
      if (!nextValue || nextValue === (metric.dataset.rollValue || '')) {
        return;
      }

      renderMetric(metric, nextValue, true);
    });

    observer.observe(metric, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  metrics.forEach(function (metric) {
    var initial = normalizeValue(metric.textContent);
    if (!initial) return;

    metric.dataset.rollEntryPlayed = '0';
    renderMetric(metric, initial, false);
    bindMutationWatch(metric);
  });

  setTimeout(tryReplayEntryMetrics, ENTRY_REPLAY_DELAY_MS);
  window.addEventListener('load', function () {
    entryReplayAttempts = 0;
    setTimeout(tryReplayEntryMetrics, 100);
  });
  window.addEventListener('mobile:sidebar-opened', function () {
    entryReplayAttempts = 0;
    setTimeout(tryReplayEntryMetrics, 120);
  });
});
