(function () {
  var panel = document.querySelector(".onestep-inline-panel");
  if (!panel) {
    return;
  }

  var fields = Array.prototype.slice.call(panel.querySelectorAll("input, textarea"));
  var uploadBtn = panel.querySelector("[data-onestep-upload]");
  var storageKey = "tools-onestep-form-v1";

  function saveForm() {
    var payload = fields.map(function (field) {
      return field.value || "";
    });
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (err) {
      // Ignore storage failures.
    }
  }

  function restoreForm() {
    var raw = null;
    try {
      raw = localStorage.getItem(storageKey);
    } catch (err) {
      raw = null;
    }

    if (!raw) {
      return;
    }

    try {
      var values = JSON.parse(raw);
      if (!Array.isArray(values)) {
        return;
      }
      fields.forEach(function (field, index) {
        if (typeof values[index] === "string") {
          field.value = values[index];
        }
      });
    } catch (err) {
      // Ignore malformed data.
    }
  }

  restoreForm();
  fields.forEach(function (field) {
    field.addEventListener("input", saveForm);
  });

  if (uploadBtn) {
    uploadBtn.addEventListener("click", saveForm);
  }
})();
