// Sidebar metric rolling digits animation.
document.addEventListener('DOMContentLoaded', function () {
  var metrics = Array.prototype.slice.call(document.querySelectorAll('.metric-value'));
  if (!metrics.length) return;

  var SLOT_HEIGHT = 1.05; // em, must match CSS

  function normalizeValue(value) {
    return String(value == null ? '' : value).replace(/\s+/g, '').trim();
  }

  function isDigit(ch) {
    return /^[0-9]$/.test(ch || '');
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

  function createDigitNode(oldDigit, nextDigit, animate) {
    var slot = document.createElement('span');
    slot.className = 'metric-roll-digit';

    var track = document.createElement('span');
    track.className = 'metric-roll-track';
    slot.appendChild(track);

    if (!animate || oldDigit === nextDigit) {
      var stable = document.createElement('span');
      stable.className = 'metric-roll-face';
      stable.textContent = String(nextDigit);
      track.appendChild(stable);
      return slot;
    }

    var steps = nextDigit >= oldDigit ? nextDigit - oldDigit : 10 - oldDigit + nextDigit;
    if (steps <= 0) {
      steps = 10;
    }

    for (var i = 0; i <= steps; i += 1) {
      var face = document.createElement('span');
      face.className = 'metric-roll-face';
      face.textContent = String((oldDigit + i) % 10);
      track.appendChild(face);
    }

    requestAnimationFrame(function () {
      track.classList.add('is-animating');
      track.style.transform = 'translateY(-' + (steps * SLOT_HEIGHT) + 'em)';
    });

    return slot;
  }

  function renderMetric(metric, rawValue, shouldAnimate) {
    var value = normalizeValue(rawValue);
    if (!value) return;

    var oldValue = metric.dataset.rollValue || '';
    var oldChars = oldValue.split('');
    var nextChars = value.split('');
    var oldOffset = oldChars.length - nextChars.length;
    var canAnimate = !!(shouldAnimate && oldChars.length);

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
      frag.appendChild(createDigitNode(oldDigit, nextDigit, canAnimate));
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
    if (initial) {
      renderMetric(metric, initial, false);
      bindMutationWatch(metric);
    }
  });
});
