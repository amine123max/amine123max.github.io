(function () {
  var panel = document.querySelector("[data-resume-inline]");
  if (!panel) {
    return;
  }

  var form = panel.querySelector("[data-resume-form]");
  var button = panel.querySelector("[data-resume-generate]");
  var statusBox = panel.querySelector("[data-resume-status]");
  var modeToggle = panel.querySelector("[data-input-toggle]");
  var importFileInput = panel.querySelector("[data-resume-import-file]");
  var importDropzone = panel.querySelector("[data-resume-import-dropzone]");
  var importDropzoneButton = panel.querySelector("[data-resume-dropzone-select]");
  var buttonInitialHTML = button ? button.innerHTML : "";
  var exportLoadingOverlay = null;
  var html2pdfLoader = null;
  var storageKey = "tools-resume-builder-form-v5";
  var persistFormState = false;
  var translationCache = Object.create(null);
  var importDragCounter = 0;
  var maxImportFileSize = 5 * 1024 * 1024;
  var supportedImportExtensions = [".txt", ".md", ".markdown", ".json"];
  var activeInputLang = "en";
  var supportedImportFields = [
    "nameEn",
    "nameZh",
    "name",
    "title",
    "email",
    "phone",
    "location",
    "github",
    "about",
    "campusExperience",
    "internshipExperience",
    "education",
    "skills",
    "projects"
  ];
  var importLabelAliases = {
    nameEn: ["english name", "name en", "name (en)", "英文名", "英文姓名", "姓名英文"],
    nameZh: ["chinese name", "name zh", "name (zh)", "中文名", "中文姓名", "姓名中文"],
    name: ["name", "full name", "姓名", "名字"],
    title: ["title", "job title", "position", "job", "职位", "职位标题", "岗位", "职称"],
    email: ["email", "mail", "e-mail", "邮箱", "邮箱地址"],
    phone: ["phone", "mobile", "telephone", "tel", "电话", "手机号", "联系电话"],
    location: ["location", "address", "city", "地区", "地点", "地址", "现居地"],
    github: ["github", "github link", "github url", "github链接", "github地址", "github主页"],
    about: ["about", "about me", "summary", "profile", "professional summary", "关于我", "个人简介", "自我介绍"],
    campusExperience: ["campus experience", "campus", "campus exp", "school experience", "校园经历", "在校经历", "竞赛经历"],
    internshipExperience: [
      "internship experience",
      "internship",
      "work experience",
      "实习经历",
      "工作经历",
      "实习"
    ],
    education: ["education", "educational background", "education background", "教育", "教育背景", "学习经历"],
    skills: ["skills", "skill", "tech stack", "技能", "专业技能", "技术栈"],
    projects: ["projects", "project", "project experience", "项目", "项目经历", "项目经验"]
  };
  var importLabelIndex = buildImportLabelIndex();
  var importAliasEntries = buildImportAliasEntries();

  function getCurrentLang() {
    return localStorage.getItem("site-lang") || "en";
  }

  function applyLang(root) {
    var lang = getCurrentLang();
    var items = root.querySelectorAll("[data-lang]");

    items.forEach(function (el) {
      var target = el.getAttribute("data-lang");
      el.style.display = target === lang ? "inline" : "none";
    });
  }

  function getField(name) {
    return form ? form.elements.namedItem(name) : null;
  }

  function getModeDefaults(lang) {
    return lang === "zh"
      ? {
          nameEn: "Amine",
          nameZh: "阿明",
          title: "研究生 | 智能科学与技术",
          email: "your-email@example.com",
          phone: "+86",
          location: "安徽, 中国",
          github: "https://github.com/your-id",
          about: "中文个人简介...",
          campusExperience: "校园竞赛/课题/团队角色\n描述你的贡献和成果...",
          internshipExperience: "公司/岗位/时间\n描述主要职责与成果...",
          education: "学历 - 学校 - 时间",
          skills: "Python，C++，ROS，强化学习",
          projects: "项目名称\n描述目标、方法与结果..."
        }
      : {
          nameEn: "Amine",
          nameZh: "阿明",
          title: "Graduate Student | Intelligent Science and Technology",
          email: "your-email@example.com",
          phone: "+86",
          location: "Anhui, China",
          github: "https://github.com/your-id",
          about: "Professional summary...",
          campusExperience: "Competition/Research/Team role\nDescribe contributions and outcomes...",
          internshipExperience: "Company/Role/Period\nDescribe key responsibilities and outcomes...",
          education: "Degree - University - Year",
          skills: "Python, C++, ROS, Reinforcement Learning",
          projects: "Project Name\nDescribe goals, methods, and results..."
        };
  }

  function getDefaultFormData(lang) {
    var defaults = getModeDefaults(lang);
    return {
      nameEn: "",
      nameZh: "",
      title: defaults.title,
      email: defaults.email,
      phone: defaults.phone,
      location: defaults.location,
      github: defaults.github,
      about: defaults.about,
      campusExperience: defaults.campusExperience,
      internshipExperience: defaults.internshipExperience,
      education: defaults.education,
      skills: defaults.skills,
      projects: defaults.projects
    };
  }

  function isDefaultTemplatePayload(payload) {
    if (!payload || typeof payload !== "object") {
      return false;
    }

    var defaultsEn = getDefaultFormData("en");
    var defaultsZh = getDefaultFormData("zh");
    var defaultLikeCount = 0;
    var customCount = 0;

    supportedImportFields.forEach(function (fieldName) {
      var value = typeof payload[fieldName] === "string" ? payload[fieldName].trim() : "";
      if (!value) {
        return;
      }

      if (value === defaultsEn[fieldName] || value === defaultsZh[fieldName]) {
        defaultLikeCount += 1;
      } else {
        customCount += 1;
      }
    });

    return customCount === 0 && defaultLikeCount >= 6;
  }

  function clearFormValues() {
    if (!form) {
      return;
    }
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) {
        return;
      }
      if ("value" in el) {
        el.value = "";
      }
    });
  }

  function clearTemplateLikeCurrentValues() {
    var current = collectData();
    if (!isDefaultTemplatePayload(current)) {
      return;
    }

    clearFormValues();
    try {
      localStorage.removeItem(storageKey);
    } catch (err) {
      // Ignore persistence failures.
    }
  }

  function setModePlaceholders() {
    var placeholderMap = getModeDefaults(activeInputLang);

    Object.keys(placeholderMap).forEach(function (key) {
      var field = getField(key);
      if (field) {
        field.placeholder = placeholderMap[key];
      }
    });

    var email = getField("email");
    var phone = getField("phone");
    var github = getField("github");

    if (email) {
      email.placeholder = placeholderMap.email;
    }
    if (phone) {
      phone.placeholder = placeholderMap.phone;
    }
    if (github) {
      github.placeholder = placeholderMap.github;
    }
  }

  function applyFormValues(data) {
    if (!form || !data) {
      return;
    }

    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) {
        return;
      }
      if (typeof data[el.name] === "string") {
        el.value = data[el.name];
      }
    });
  }

  function normalizeImportLabel(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[\s\u00a0]+/g, "")
      .replace(/[：:]/g, "")
      .replace(/[()（）\[\]【】{}]/g, "")
      .replace(/[_-]/g, "");
  }

  function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function stripMarkdownInlineFormatting(value) {
    return String(value || "")
      .replace(/`{1,3}([^`]+?)`{1,3}/g, "$1")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/__(.+?)__/g, "$1");
  }

  function stripListPrefix(value) {
    return stripMarkdownInlineFormatting(value)
      .replace(/^\s*[#]+\s*/, "")
      .replace(/^\s*[-*+•]\s+/, "")
      .replace(/^\s*\d+[\.)、]\s*/, "")
      .replace(/^\s*[一二三四五六七八九十]+[、.]\s*/, "")
      .trim();
  }

  function buildImportAliasEntries() {
    var entries = [];

    Object.keys(importLabelAliases).forEach(function (fieldName) {
      (importLabelAliases[fieldName] || []).forEach(function (alias) {
        var normalized = normalizeImportLabel(alias);
        if (!normalized) {
          return;
        }
        entries.push({
          field: fieldName,
          alias: String(alias).trim(),
          normalized: normalized
        });
      });
    });

    entries.sort(function (a, b) {
      return b.alias.length - a.alias.length;
    });

    return entries;
  }

  function detectFieldFromLine(line) {
    var stripped = stripListPrefix(line);
    if (!stripped) {
      return null;
    }

    for (var i = 0; i < importAliasEntries.length; i += 1) {
      var entry = importAliasEntries[i];
      var aliasPattern = escapeRegExp(entry.alias);

      var exactRe = new RegExp("^" + aliasPattern + "$", "i");
      if (exactRe.test(stripped)) {
        return { field: entry.field, value: "" };
      }

      var colonRe = new RegExp("^" + aliasPattern + "\\s*[:：-]\\s*(.+)$", "i");
      var colonMatch = stripped.match(colonRe);
      if (colonMatch) {
        return { field: entry.field, value: (colonMatch[1] || "").trim() };
      }

      var spaceRe = new RegExp("^" + aliasPattern + "\\s+(.+)$", "i");
      var spaceMatch = stripped.match(spaceRe);
      if (spaceMatch) {
        return { field: entry.field, value: (spaceMatch[1] || "").trim() };
      }

      if (/[\u4e00-\u9fff]/.test(entry.alias)) {
        var zhRe = new RegExp("^" + aliasPattern + "\\s*(.+)$", "i");
        var zhMatch = stripped.match(zhRe);
        if (zhMatch) {
          return { field: entry.field, value: (zhMatch[1] || "").trim() };
        }
      }
    }

    return null;
  }

  function stripMarkdownHeadingMarkers(value) {
    return stripMarkdownInlineFormatting(value)
      .replace(/^\s*#{1,6}\s*/, "")
      .replace(/\s*#{1,6}\s*$/, "")
      .trim();
  }

  function getFileExtension(name) {
    var value = String(name || "").trim().toLowerCase();
    var index = value.lastIndexOf(".");
    return index >= 0 ? value.slice(index) : "";
  }

  function isSupportedImportFile(file) {
    if (!file) {
      return false;
    }

    var ext = getFileExtension(file.name);
    if (supportedImportExtensions.indexOf(ext) >= 0) {
      return true;
    }

    var type = String(file.type || "").toLowerCase();
    if (type === "text/plain" || type === "application/json" || type === "text/markdown") {
      return true;
    }

    return false;
  }

  function buildImportLabelIndex() {
    var index = {};

    Object.keys(importLabelAliases).forEach(function (fieldName) {
      (importLabelAliases[fieldName] || []).forEach(function (alias) {
        var normalized = normalizeImportLabel(alias);
        if (normalized) {
          index[normalized] = fieldName;
        }
      });
    });

    return index;
  }

  function resolveFieldFromImportLabel(label) {
    var normalized = normalizeImportLabel(label);
    if (!normalized) {
      return null;
    }
    return importLabelIndex[normalized] || null;
  }

  function normalizeImportedValue(value) {
    if (value === null || typeof value === "undefined") {
      return "";
    }

    if (Array.isArray(value)) {
      return value
        .map(function (item) {
          return normalizeImportedValue(item);
        })
        .filter(Boolean)
        .join("\n");
    }

    if (typeof value === "object") {
      return Object.keys(value)
        .map(function (key) {
          var item = normalizeImportedValue(value[key]);
          if (!item) {
            return "";
          }
          return key + ": " + item;
        })
        .filter(Boolean)
        .join("\n");
    }

    return String(value).replace(/\r/g, "").trim();
  }

  function extractFromJsonPayload(payload) {
    var source = payload;
    if (Array.isArray(source)) {
      source = source.find(function (item) {
        return item && typeof item === "object";
      }) || source[0] || {};
    }

    if (!source || typeof source !== "object") {
      return {};
    }

    var extracted = {};
    var keys = Object.keys(source);

    supportedImportFields.forEach(function (fieldName) {
      if (typeof source[fieldName] !== "undefined") {
        extracted[fieldName] = normalizeImportedValue(source[fieldName]);
        return;
      }

      for (var i = 0; i < keys.length; i += 1) {
        var key = keys[i];
        if (resolveFieldFromImportLabel(key) === fieldName) {
          extracted[fieldName] = normalizeImportedValue(source[key]);
          break;
        }
      }
    });

    return extracted;
  }

  function parseStructuredDocumentText(raw) {
    var lines = String(raw || "").replace(/\r/g, "").split("\n");
    var result = {};
    var activeField = null;

    function appendLine(fieldName, value) {
      var text = stripMarkdownHeadingMarkers(value);
      if (!text) {
        return;
      }
      result[fieldName] = result[fieldName] ? result[fieldName] + "\n" + text : text;
    }

    lines.forEach(function (line) {
      var rawLine = line || "";
      var compactLine = stripListPrefix(rawLine);
      var detected = detectFieldFromLine(compactLine);

      if (detected && detected.field) {
        activeField = detected.field;
        appendLine(activeField, detected.value);
        return;
      }

      if (compactLine && compactLine.length <= 48) {
        var mappedByHeading = resolveFieldFromImportLabel(compactLine);
        if (mappedByHeading) {
          activeField = mappedByHeading;
          return;
        }
      }

      if (activeField) {
        appendLine(activeField, rawLine);
      }
    });

    Object.keys(result).forEach(function (fieldName) {
      result[fieldName] = (result[fieldName] || "").trim();
      if (!result[fieldName]) {
        delete result[fieldName];
      }
    });

    return result;
  }

  function parseImportedResumeContent(raw, fileName) {
    var text = String(raw || "").replace(/\uFEFF/g, "");
    if (!text.trim()) {
      return {};
    }

    var lowerName = String(fileName || "").toLowerCase();
    var looksJson = lowerName.slice(-5) === ".json" || /^\s*[\[{]/.test(text);

    if (looksJson) {
      try {
        return extractFromJsonPayload(JSON.parse(text));
      } catch (err) {
        if (lowerName.slice(-5) === ".json") {
          throw new Error("json_parse_failed");
        }
      }
    }

    var parsedText = parseStructuredDocumentText(text);
    if (Object.keys(parsedText).length) {
      return parsedText;
    }

    return {};
  }

  function applyImportedFormData(data) {
    var updated = 0;
    if (!data || typeof data !== "object") {
      return updated;
    }

    supportedImportFields.forEach(function (fieldName) {
      var value = typeof data[fieldName] === "string" ? data[fieldName].trim() : "";
      if (!value) {
        return;
      }

      if (fieldName === "name") {
        var activeNameField = getField(activeInputLang === "zh" ? "nameZh" : "nameEn");
        if (activeNameField) {
          activeNameField.value = value;
          updated += 1;
        }
        return;
      }

      var field = getField(fieldName);
      if (!field) {
        return;
      }

      field.value = value;
      updated += 1;
    });

    if (updated) {
      saveForm();
    }

    return updated;
  }

  function setImportButtonLoading(loading) {
    if (importDropzoneButton) {
      importDropzoneButton.disabled = !!loading;
    }
    if (importDropzone) {
      importDropzone.classList.toggle("is-loading", !!loading);
    }
  }

  function openImportPicker() {
    if (importFileInput) {
      importFileInput.click();
    }
  }

  async function handleImportFile(file) {
    if (!file) {
      return;
    }

    if (!isSupportedImportFile(file)) {
      setStatus(
        "Unsupported file type. Please import TXT / MD / JSON.",
        "文件类型不支持，请导入 TXT / MD / JSON。"
      );
      return;
    }

    if (file.size > maxImportFileSize) {
      setStatus("File is too large. Please keep it under 5MB.", "文件过大，请控制在 5MB 以内。");
      return;
    }

    setImportButtonLoading(true);

    try {
      var raw = await file.text();
      var parsed = parseImportedResumeContent(raw, file.name);
      var count = applyImportedFormData(parsed);

      if (count > 0) {
        setStatus(
          "Document imported. Fields are auto-filled and still editable.",
          "文档导入成功，已自动填充并可继续编辑。"
        );
      } else {
        setStatus(
          "No recognizable fields found. Use labels or JSON keys and try again.",
          "未识别到可映射字段，请使用字段标签或 JSON 键后重试。"
        );
      }
    } catch (err) {
      if (err && err.message === "json_parse_failed") {
        setStatus(
          "JSON parse failed. Please check the document format.",
          "JSON 解析失败，请检查文档格式。"
        );
      } else {
        setStatus(
          "Import failed. Supported formats: .txt .md .json",
          "导入失败，支持的格式：.txt .md .json"
        );
      }
    } finally {
      setImportButtonLoading(false);
      if (importFileInput) {
        importFileInput.value = "";
      }
    }
  }

  function setInputMode(mode) {
    activeInputLang = mode === "zh" ? "zh" : "en";

    if (modeToggle) {
      modeToggle.classList.toggle("is-en", activeInputLang === "en");
      modeToggle.classList.toggle("is-zh", activeInputLang === "zh");
      modeToggle.setAttribute("data-active-lang", activeInputLang);
      modeToggle.setAttribute("aria-pressed", activeInputLang === "zh" ? "true" : "false");
      modeToggle.setAttribute(
        "aria-label",
        activeInputLang === "zh"
          ? "Current input mode: Chinese. Click to switch."
          : "Current input mode: English. Click to switch."
      );
    }

    setModePlaceholders();
  }

  function restoreInputMode() {
    // Initial mode must follow current site language on page entry.
    setInputMode(getCurrentLang() === "zh" ? "zh" : "en");
  }

  function saveForm() {
    if (!persistFormState) {
      return;
    }

    if (!form) {
      return;
    }

    var payload = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) {
        return;
      }
      payload[el.name] = el.value || "";
    });

    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (err) {
      // Ignore persistence failures.
    }
  }

  function restoreForm() {
    if (!persistFormState) {
      try {
        localStorage.removeItem(storageKey);
      } catch (err) {
        // Ignore persistence failures.
      }
      return;
    }

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
      var payload = JSON.parse(raw);
      if (!payload || typeof payload !== "object") {
        return;
      }

      if (isDefaultTemplatePayload(payload)) {
        try {
          localStorage.removeItem(storageKey);
        } catch (err) {
          // Ignore persistence failures.
        }
        return;
      }

      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name) {
          return;
        }
        if (typeof payload[el.name] === "string") {
          el.value = payload[el.name];
        }
      });
    } catch (err) {
      // Ignore malformed state.
    }
  }

  function setStatus(messageEn, messageZh) {
    if (!statusBox) {
      return;
    }
    var en = statusBox.querySelector('[data-lang="en"]');
    var zh = statusBox.querySelector('[data-lang="zh"]');
    if (en) {
      en.textContent = messageEn;
    }
    if (zh) {
      zh.textContent = messageZh;
    }
    applyLang(statusBox);
  }

  function shakeValidationTarget(element) {
    if (!element) {
      return;
    }
    element.classList.remove("is-validation-shake");
    // Force reflow so repeated validations can replay animation.
    void element.offsetWidth;
    element.classList.add("is-validation-shake");
    window.setTimeout(function () {
      element.classList.remove("is-validation-shake");
    }, 520);
  }

  function clearNameValidationState() {
    ["nameEn", "nameZh"].forEach(function (fieldName) {
      var field = getField(fieldName);
      if (!field) {
        return;
      }
      field.removeAttribute("aria-invalid");
      var group = field.closest(".cv-form-group");
      if (group) {
        group.classList.remove("is-error", "is-validation-shake");
      }
    });

    if (panel) {
      panel.classList.remove("is-validation-shake");
    }
  }

  function validateBilingualNames(data) {
    var nameEn = (data.nameEn || "").trim();
    var nameZh = (data.nameZh || "").trim();
    var missingEn = !nameEn;
    var missingZh = !nameZh;

    clearNameValidationState();

    if (!missingEn && !missingZh) {
      return true;
    }

    var nameEnField = getField("nameEn");
    var nameZhField = getField("nameZh");
    var nameEnGroup = nameEnField ? nameEnField.closest(".cv-form-group") : null;
    var nameZhGroup = nameZhField ? nameZhField.closest(".cv-form-group") : null;

    if (missingEn && nameEnField) {
      nameEnField.setAttribute("aria-invalid", "true");
      if (nameEnGroup) {
        nameEnGroup.classList.add("is-error");
      }
    }

    if (missingZh && nameZhField) {
      nameZhField.setAttribute("aria-invalid", "true");
      if (nameZhGroup) {
        nameZhGroup.classList.add("is-error");
      }
    }

    setStatus(
      "Please manually enter both English and Chinese names before export.",
      "请先手动完整填写英文姓名和中文姓名，再执行导出。"
    );

    if (missingEn && nameEnField) {
      nameEnField.focus();
    } else if (missingZh && nameZhField) {
      nameZhField.focus();
    }

    shakeValidationTarget(panel);
    if (missingEn) {
      shakeValidationTarget(nameEnGroup);
    }
    if (missingZh) {
      shakeValidationTarget(nameZhGroup);
    }

    return false;
  }

  function ensureExportLoadingOverlay() {
    if (exportLoadingOverlay) {
      return exportLoadingOverlay;
    }

    var existing = document.getElementById("resume-export-loading-overlay");
    if (existing) {
      exportLoadingOverlay = existing;
      return exportLoadingOverlay;
    }

    var overlay = document.createElement("div");
    overlay.id = "resume-export-loading-overlay";
    overlay.className = "resume-export-loading-overlay";
    overlay.innerHTML =
      '<div class="resume-export-loading-card">' +
      '<div class="resume-export-bars" aria-hidden="true">' +
      '<span class="resume-export-bar"></span>' +
      '<span class="resume-export-bar"></span>' +
      '<span class="resume-export-bar"></span>' +
      '<span class="resume-export-bar"></span>' +
      '<span class="resume-export-bar"></span>' +
      "</div>" +
      '<p class="resume-export-loading-text">' +
      '<span data-lang="en" data-export-loading-en>Loading...</span>' +
      '<span data-lang="zh" data-export-loading-zh>Loading...</span>' +
      "</p>" +
      "</div>";

    document.body.appendChild(overlay);
    applyLang(overlay);
    exportLoadingOverlay = overlay;
    return exportLoadingOverlay;
  }

  function showExportLoading(messageEn, messageZh) {
    var overlay = ensureExportLoadingOverlay();
    var en = overlay.querySelector("[data-export-loading-en]");
    var zh = overlay.querySelector("[data-export-loading-zh]");
    var loadingText = "Loading...";

    if (en) {
      en.textContent = loadingText;
    }
    if (zh) {
      zh.textContent = loadingText;
    }

    applyLang(overlay);
    overlay.classList.add("active");
  }

  function hideExportLoading() {
    if (exportLoadingOverlay) {
      exportLoadingOverlay.classList.remove("active");
    }
  }

  function setExportButtonLoading(loading) {
    if (!button) {
      return;
    }

    if (loading) {
      button.disabled = true;
      button.classList.add("is-loading");
      button.innerHTML =
        '<span class="resume-btn-loading">' +
        '<span class="resume-btn-spinner" aria-hidden="true"></span>' +
        '<span data-lang="en">Exporting PDF...</span>' +
        '<span data-lang="zh">PDF 导出中...</span>' +
        "</span>";
      applyLang(button);
      return;
    }

    button.disabled = false;
    button.classList.remove("is-loading");
    button.innerHTML = buttonInitialHTML;
    applyLang(button);
  }

  function ensureHtml2Pdf() {
    if (typeof window.html2pdf === "function") {
      return Promise.resolve(window.html2pdf);
    }

    if (html2pdfLoader) {
      return html2pdfLoader;
    }

    html2pdfLoader = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.9.3/html2pdf.bundle.min.js";
      script.onload = function () {
        if (typeof window.html2pdf === "function") {
          resolve(window.html2pdf);
        } else {
          reject(new Error("html2pdf not available"));
        }
      };
      script.onerror = function () {
        reject(new Error("Failed to load html2pdf"));
      };
      document.head.appendChild(script);
    });

    return html2pdfLoader;
  }

  function escapeHtml(value) {
    return (value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toParagraph(value) {
    return escapeHtml(value || "").replace(/\n/g, "<br>");
  }

  function getToolLinkIconSvg() {
    return '<svg class="tool-rb-link-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="#0066cc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#0066cc;stroke:#0066cc;" aria-hidden="true" focusable="false">' +
      '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>' +
      '<polyline points="15 3 21 3 21 9"></polyline>' +
      '<line x1="10" y1="14" x2="21" y2="3"></line>' +
      '</svg>';
  }

  function toLinkOrText(value) {
    var text = (value || "").trim();
    if (!text) {
      return "";
    }

    var href = text;
    if (!/^https?:\/\//i.test(href)) {
      if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(href)) {
        href = "https://" + href;
      } else {
        return escapeHtml(text);
      }
    }

    return (
      '<a class="tool-rb-link" href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">' +
      escapeHtml(text) +
      getToolLinkIconSvg() +
      "</a>"
    );
  }

  function toEmailLinkOrText(value) {
    var text = (value || "").trim();
    if (!text) {
      return "";
    }

    var email = text.replace(/^mailto:/i, "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return escapeHtml(text);
    }

    return (
      '<a class="tool-rb-link" href="mailto:' + escapeHtml(email) + '">' +
      escapeHtml(email) +
      getToolLinkIconSvg() +
      "</a>"
    );
  }

  function parseSkills(value) {
    return (value || "")
      .split(/[,，;\n]/)
      .map(function (item) {
        return item.trim();
      })
      .filter(Boolean);
  }

  function decodeHtmlEntities(value) {
    var parser = document.createElement("textarea");
    parser.innerHTML = value || "";
    return parser.value;
  }

  async function translateLine(text, sourceLang, targetLang) {
    var input = (text || "").trim();
    if (!input || sourceLang === targetLang) {
      return input;
    }

    var sourceCode = sourceLang === "zh" ? "zh-CN" : "en";
    var targetCode = targetLang === "zh" ? "zh-CN" : "en";
    var cacheKey = sourceCode + "|" + targetCode + "|" + input;

    if (translationCache[cacheKey]) {
      return translationCache[cacheKey];
    }

    var endpoint = "https://api.mymemory.translated.net/get?q=" +
      encodeURIComponent(input) +
      "&langpair=" +
      encodeURIComponent(sourceCode + "|" + targetCode);

    var response = await fetch(endpoint, { method: "GET" });
    if (!response.ok) {
      throw new Error("translation request failed");
    }

    var payload = await response.json();
    var translated = payload && payload.responseData ? payload.responseData.translatedText : "";
    translated = decodeHtmlEntities(translated || "").trim();

    if (!translated) {
      throw new Error("empty translation");
    }

    translationCache[cacheKey] = translated;
    return translated;
  }

  async function translateMultiline(text, sourceLang, targetLang) {
    var input = (text || "").replace(/\r/g, "");
    if (!input.trim()) {
      return "";
    }

    var lines = input.split("\n");
    var translatedLines = await Promise.all(
      lines.map(function (line) {
        if (!line.trim()) {
          return Promise.resolve("");
        }
        return translateLine(line, sourceLang, targetLang);
      })
    );

    return translatedLines.join("\n");
  }

  async function translateOrCopy(text, sourceLang, targetLang, warnings, warningKey) {
    if (!text) {
      return "";
    }
    try {
      return await translateMultiline(text, sourceLang, targetLang);
    } catch (err) {
      warnings.push(warningKey);
      return text;
    }
  }

  function collectData() {
    function getValue(name) {
      var field = getField(name);
      return field ? (field.value || "").trim() : "";
    }

    return {
      nameEn: getValue("nameEn"),
      nameZh: getValue("nameZh"),
      title: getValue("title"),
      email: getValue("email"),
      phone: getValue("phone"),
      location: getValue("location"),
      github: getValue("github"),
      about: getValue("about"),
      campusExperience: getValue("campusExperience"),
      internshipExperience: getValue("internshipExperience"),
      education: getValue("education"),
      skills: getValue("skills"),
      projects: getValue("projects")
    };
  }

  async function buildBilingualDataFromMode(data, inputLang) {
    var sourceLang = inputLang === "zh" ? "zh" : "en";
    var warnings = [];
    var result = {
      nameEn: (data.nameEn || "").trim(),
      nameZh: (data.nameZh || "").trim(),
      email: data.email,
      phone: data.phone,
      github: data.github
    };

    async function mapField(sourceValue, enKey, zhKey, shouldTranslate) {
      var value = (sourceValue || "").trim();
      if (!value) {
        result[enKey] = "";
        result[zhKey] = "";
        return;
      }

      if (sourceLang === "en") {
        result[enKey] = value;
        if (shouldTranslate) {
          result[zhKey] = await translateOrCopy(value, "en", "zh", warnings, zhKey);
        } else {
          result[zhKey] = value;
        }
      } else {
        result[zhKey] = value;
        if (shouldTranslate) {
          result[enKey] = await translateOrCopy(value, "zh", "en", warnings, enKey);
        } else {
          result[enKey] = value;
        }
      }
    }

    await mapField(data.title, "titleEn", "titleZh", true);
    await mapField(data.about, "aboutEn", "aboutZh", true);
    await mapField(data.campusExperience, "campusExperienceEn", "campusExperienceZh", true);
    await mapField(data.internshipExperience, "internshipExperienceEn", "internshipExperienceZh", true);
    await mapField(data.education, "educationEn", "educationZh", true);
    await mapField(data.location, "locationEn", "locationZh", true);
    await mapField(data.skills, "skillsEn", "skillsZh", true);
    await mapField(data.projects, "projectsEn", "projectsZh", true);

    return { data: result, warnings: warnings };
  }

  function buildResumeHtml(data, lang) {
    var isZh = lang === "zh";
    var name = isZh ? (data.nameZh || data.nameEn) : (data.nameEn || data.nameZh);
    var title = isZh ? (data.titleZh || data.titleEn) : (data.titleEn || data.titleZh);
    var about = isZh ? (data.aboutZh || data.aboutEn) : (data.aboutEn || data.aboutZh);
    var campusExperience = isZh
      ? (data.campusExperienceZh || data.campusExperienceEn)
      : (data.campusExperienceEn || data.campusExperienceZh);
    var internshipExperience = isZh
      ? (data.internshipExperienceZh || data.internshipExperienceEn)
      : (data.internshipExperienceEn || data.internshipExperienceZh);
    var education = isZh ? (data.educationZh || data.educationEn) : (data.educationEn || data.educationZh);
    var projects = isZh ? (data.projectsZh || data.projectsEn) : (data.projectsEn || data.projectsZh);
    var location = isZh ? (data.locationZh || data.locationEn) : (data.locationEn || data.locationZh);
    var skillsSource = isZh ? (data.skillsZh || data.skillsEn) : (data.skillsEn || data.skillsZh);
    var skills = parseSkills(skillsSource);

    var labels = isZh
      ? {
          email: "邮箱",
          phone: "电话",
          location: "地点",
          github: "GitHub",
          about: "关于我",
          campusExperience: "校园经历",
          internshipExperience: "实习经历",
          education: "教育背景",
          skills: "技能",
          projects: "项目经历"
        }
      : {
          email: "Email",
          phone: "Phone",
          location: "Location",
          github: "GitHub",
          about: "About Me",
          campusExperience: "Campus Experience",
          internshipExperience: "Internship Experience",
          education: "Education",
          skills: "Skills",
          projects: "Projects"
        };

    var defaults = getModeDefaults(isZh ? "zh" : "en");

    function pickValue(value, fallback) {
      var text = (value || "").trim();
      if (text) {
        return { text: text, placeholder: false };
      }
      return { text: (fallback || "").trim(), placeholder: true };
    }

    function isPeriodLike(value) {
      var text = (value || "").trim();
      if (!text) {
        return false;
      }

      if (/^(time|period|year|date|present|current|now|today|时间|时期|日期|至今|现在)$/i.test(text)) {
        return true;
      }

      var hasYear = /\b(?:19|20)\d{2}\b/.test(text) || /\d{4}\s*年/.test(text);
      var hasMonth = /\d{1,2}\s*月/.test(text) || /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(text);
      var hasRange = /(?:-|–|—|~|to|至|至今|present|current|now)/i.test(text);
      var hasPeriodWord = /(?:period|year|time|semester|term|duration|学年|时间|年月|至今|present|current)/i.test(text);

      return (hasYear && (hasMonth || hasRange || hasPeriodWord)) || hasPeriodWord;
    }

    function looksBulletLine(value) {
      var text = (value || "").trim();
      return /^([-*+•]|[0-9]+[.)、]|[一二三四五六七八九十]+[、.])/.test(text);
    }

    function parseHeaderLine(line) {
      var raw = (line || "").trim();

      function parseByParts(parts, joiner) {
        if (!parts.length) {
          return null;
        }

        if (parts.length === 1) {
          return { title: parts[0], subtitle: "", period: "" };
        }

        if (parts.length === 2) {
          if (isPeriodLike(parts[1])) {
            return { title: parts[0], subtitle: "", period: parts[1] };
          }
          return { title: parts[0], subtitle: parts[1], period: "" };
        }

        var last = parts[parts.length - 1];
        if (isPeriodLike(last)) {
          return {
            title: parts[0],
            subtitle: parts.slice(1, parts.length - 1).join(joiner),
            period: last
          };
        }

        return {
          title: parts[0],
          subtitle: parts.slice(1).join(joiner),
          period: ""
        };
      }

      if (!raw) {
        return { title: "", subtitle: "", period: "" };
      }

      if (/[\/／|]/.test(raw)) {
        var slashParts = raw.split(/[\/／|]/).map(function (part) {
          return part.trim();
        }).filter(Boolean);
        var slashParsed = parseByParts(slashParts, " / ");
        if (slashParsed) {
          return slashParsed;
        }
      }

      if (/\s[-–—]\s/.test(raw)) {
        var dashParts = raw.split(/\s*[-–—]\s*/).map(function (part) {
          return part.trim();
        }).filter(Boolean);
        var dashParsed = parseByParts(dashParts, " - ");
        if (dashParsed) {
          return dashParsed;
        }
      }

      return { title: raw, subtitle: "", period: "" };
    }

    function parseStructuredEntries(text) {
      var raw = (text || "").replace(/\r/g, "").trim();
      if (!raw) {
        return [];
      }

      var blocks = raw.split(/\n\s*\n+/).map(function (block) {
        return block.trim();
      }).filter(Boolean);

      return blocks.map(function (block) {
        var lines = block.split("\n").map(function (line) {
          return line.trim();
        }).filter(Boolean);

        if (!lines.length) {
          return null;
        }

        var header = parseHeaderLine(lines.shift());
        var title = header.title;
        var subtitle = header.subtitle;
        var period = header.period;

        if (lines.length) {
          var first = lines[0];
          if (!period && isPeriodLike(first)) {
            period = first;
            lines.shift();
          } else if (!subtitle && !looksBulletLine(first)) {
            subtitle = first;
            lines.shift();
          }
        }

        var description = lines.join("\n");
        return {
          title: title,
          subtitle: subtitle,
          period: period,
          description: description
        };
      }).filter(function (entry) {
        return entry && (entry.title || entry.subtitle || entry.period || entry.description);
      });
    }

    var fallbackName = isZh ? (defaults.nameZh || defaults.nameEn) : (defaults.nameEn || defaults.nameZh);
    var nameValue = pickValue(name, fallbackName);
    var titleValue = pickValue(title, defaults.title);
    var emailValue = pickValue(data.email, defaults.email);
    var phoneValue = pickValue(data.phone, defaults.phone);
    var locationValue = pickValue(location, defaults.location);
    var githubValue = pickValue(data.github, defaults.github);
    var aboutValue = pickValue(about, defaults.about);
    var campusValue = pickValue(campusExperience, defaults.campusExperience);
    var internshipValue = pickValue(internshipExperience, defaults.internshipExperience);
    var educationValue = pickValue(education, defaults.education);
    var projectsValue = pickValue(projects, defaults.projects);
    var skillsValue = pickValue(skillsSource, defaults.skills);
    var emailLinkValue = toEmailLinkOrText(emailValue.text);
    var githubLinkValue = toLinkOrText(githubValue.text);

    var skillsFromValue = parseSkills(skillsValue.text);
    var skillsBlock = skillsFromValue.length
      ? "<div class='tool-rb-skills'>" +
        skillsFromValue.map(function (item) {
          return "<span class='tool-rb-skill'>" + escapeHtml(item) + "</span>";
        }).join("") +
        "</div>"
      : "<div class='tool-rb-description tool-rb-muted'>" + toParagraph(skillsValue.text) + "</div>";

    function renderSection(label, valueObj, bodyClass) {
      return "<section class='tool-rb-section'>" +
        "<h2 class='tool-rb-section-title'>" + label + "</h2>" +
        "<div class='" + bodyClass + (valueObj.placeholder ? " tool-rb-muted" : "") + "'>" +
        toParagraph(valueObj.text) +
        "</div>" +
        "</section>";
    }

    function renderStructuredSection(label, valueObj) {
      var entries = parseStructuredEntries(valueObj.text);
      if (!entries.length) {
        return renderSection(label, valueObj, "tool-rb-description");
      }

      return "<section class='tool-rb-section'>" +
        "<h2 class='tool-rb-section-title'>" + label + "</h2>" +
        "<div class='tool-rb-entry-list'>" +
        entries.map(function (entry) {
          var mutedClass = valueObj.placeholder ? " tool-rb-muted" : "";
          return "<div class='tool-rb-entry'>" +
            "<div class='tool-rb-entry-head'>" +
            "<span class='tool-rb-entry-title" + mutedClass + "'>" + escapeHtml(entry.title) + "</span>" +
            (entry.period ? "<span class='tool-rb-entry-period" + mutedClass + "'>" + escapeHtml(entry.period) + "</span>" : "") +
            "</div>" +
            (entry.subtitle ? "<div class='tool-rb-entry-subtitle" + mutedClass + "'>" + toParagraph(entry.subtitle) + "</div>" : "") +
            (entry.description ? "<div class='tool-rb-entry-desc" + mutedClass + "'>" + toParagraph(entry.description) + "</div>" : "") +
            "</div>";
        }).join("") +
        "</div>" +
        "</section>";
    }

    return (
      "<style>" +
      ".tool-rb-doc,.tool-rb-doc *{box-sizing:border-box;}" +
      ".tool-rb-doc{width:180mm;margin:0 auto;padding:0;background:#fff !important;color:#000 !important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans CJK SC','Noto Sans SC',sans-serif;font-size:10pt;line-height:1.5;}" +
      ".tool-rb-doc *{position:static !important;color:inherit !important;background:transparent !important;}" +
      ".tool-rb-doc a{color:#0066cc !important;text-decoration:none;}" +
      ".tool-rb-doc a:hover{text-decoration:underline;}" +
      ".tool-rb-link{color:#0066cc !important;text-decoration:none !important;}" +
      ".tool-rb-link:hover{text-decoration:underline !important;}" +
      ".tool-rb-link-icon{display:inline-block;width:1em;height:1em;margin-left:0.24em;vertical-align:-0.12em;flex:0 0 auto;color:#0066cc !important;stroke:#0066cc !important;}" +
      ".tool-rb-link-icon *{stroke:#0066cc !important;}" +
      ".tool-rb-head{margin:0 0 12px 0;padding:0 0 6px 0;border-bottom:2px solid #000 !important;}" +
      ".tool-rb-name{margin:0 0 6px 0;font-size:28px;font-weight:700;color:#000 !important;line-height:1.2;}" +
      ".tool-rb-subtitle{margin:0;font-size:12px;color:#555 !important;line-height:1.45;}" +
      ".tool-rb-contact{margin-top:6px;font-size:10px;line-height:1.5;}" +
      ".tool-rb-contact-item{margin:0 0 2px 0;color:#333 !important;}" +
      ".tool-rb-contact-item strong{color:#000 !important;font-weight:600;margin-right:5px;}" +
      ".tool-rb-section{margin:0 0 16px 0;page-break-inside:avoid;break-inside:avoid;}" +
      ".tool-rb-section-title{display:block !important;width:100% !important;margin:0 0 10px 0 !important;padding:0 0 4px 0 !important;border:0 !important;border-bottom:2px solid #333 !important;font-size:16px !important;font-weight:700 !important;color:#000 !important;line-height:1.3;}" +
      ".tool-rb-about-text{margin:0;font-size:11px !important;line-height:1.6 !important;color:#333 !important;}" +
      ".tool-rb-description{margin:0;font-size:10px !important;line-height:1.7 !important;color:#555 !important;}" +
      ".tool-rb-entry-list{display:block;}" +
      ".tool-rb-entry{margin:0 0 12px 0;}" +
      ".tool-rb-entry:last-child{margin-bottom:0;}" +
      ".tool-rb-entry-head{display:flex;justify-content:space-between;align-items:baseline;gap:16px;margin:0 0 4px 0;}" +
      ".tool-rb-entry-title{font-size:12px;font-weight:700;color:#000;line-height:1.4;}" +
      ".tool-rb-entry-period{font-size:10px;color:#666;white-space:nowrap;font-style:italic;line-height:1.4;}" +
      ".tool-rb-entry-subtitle{font-size:11px;color:#444;line-height:1.5;margin:0 0 6px 0;}" +
      ".tool-rb-entry-desc{font-size:10px;color:#555;line-height:1.7;white-space:pre-line;}" +
      ".tool-rb-skills{display:flex;flex-wrap:wrap;gap:8px;}" +
      ".tool-rb-skill{display:inline-block;background:#000 !important;color:#fff !important;border:2px solid #000 !important;border-radius:4px;padding:5px 12px;font-size:10px !important;font-weight:500;line-height:1.2;}" +
      ".tool-rb-muted{color:#9aa0a6 !important;}" +
      ".tool-rb-lang-zh .tool-rb-name,.tool-rb-lang-zh .tool-rb-section-title{font-weight:700 !important;}" +
      "</style>" +
      "<article class='tool-rb-doc tool-rb-lang-" + (isZh ? "zh" : "en") + "'>" +
      "<header class='tool-rb-head'>" +
      "<h1 class='tool-rb-name" + (nameValue.placeholder ? " tool-rb-muted" : "") + "'>" + escapeHtml(nameValue.text) + "</h1>" +
      "<p class='tool-rb-subtitle" + (titleValue.placeholder ? " tool-rb-muted" : "") + "'>" + escapeHtml(titleValue.text) + "</p>" +
      "<div class='tool-rb-contact'>" +
      "<div class='tool-rb-contact-item'><strong>" + labels.email + ":</strong>" +
      (emailLinkValue || ("<span class='" + (emailValue.placeholder ? "tool-rb-muted" : "") + "'>" + escapeHtml(emailValue.text) + "</span>")) +
      "</div>" +
      "<div class='tool-rb-contact-item'><strong>" + labels.phone + ":</strong><span class='" + (phoneValue.placeholder ? "tool-rb-muted" : "") + "'>" + escapeHtml(phoneValue.text) + "</span></div>" +
      "<div class='tool-rb-contact-item'><strong>" + labels.location + ":</strong><span class='" + (locationValue.placeholder ? "tool-rb-muted" : "") + "'>" + escapeHtml(locationValue.text) + "</span></div>" +
      "<div class='tool-rb-contact-item'><strong>" + labels.github + ":</strong>" +
      (githubLinkValue || ("<span class='" + (githubValue.placeholder ? "tool-rb-muted" : "") + "'>" + escapeHtml(githubValue.text) + "</span>")) +
      "</div>" +
      "</div>" +
      "</header>" +
      renderSection(labels.about, aboutValue, "tool-rb-about-text") +
      renderStructuredSection(labels.campusExperience, campusValue) +
      renderStructuredSection(labels.internshipExperience, internshipValue) +
      renderStructuredSection(labels.education, educationValue) +
      "<section class='tool-rb-section'><h2 class='tool-rb-section-title'>" + labels.skills + "</h2>" + skillsBlock + "</section>" +
      renderSection(labels.projects, projectsValue, "tool-rb-description") +
      "</article>"
    );
  }

  async function exportSingle(html, filename) {
    var temp = document.createElement("div");
    temp.className = "tool-rb-export-host";
    temp.style.position = "absolute";
    temp.style.left = "-9999px";
    temp.innerHTML = html;
    document.body.appendChild(temp);

    try {
      var element = temp.querySelector(".tool-rb-doc");
      await window.html2pdf()
        .set({
          margin: [10, 15, 10, 15],
          filename: filename,
          image: { type: "jpeg", quality: 1.0 },
          html2canvas: {
            scale: 5,
            dpi: 300,
            backgroundColor: "#ffffff",
            useCORS: false,
            allowTaint: true,
            letterRendering: true,
            imageTimeout: 0,
            logging: false,
            removeContainer: true
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait",
            compress: false,
            precision: 16,
            putOnlyUsedFonts: true,
            floatPrecision: 16
          },
          pagebreak: { mode: ["css", "legacy"] }
        })
        .from(element)
        .save();
    } finally {
      document.body.removeChild(temp);
    }
  }

  async function generateBilingualResumes() {
    if (!form || !button) {
      return;
    }

    saveForm();
    var data = collectData();
    var isAllEmpty = Object.keys(data).every(function (key) {
      return !data[key];
    });

    if (isAllEmpty) {
      data = getDefaultFormData(activeInputLang);
      setStatus(
        "No input detected. Exporting with default template values.",
        "未检测到输入，正在使用默认模板字段导出。"
      );
    }

    if (!validateBilingualNames(data)) {
      return;
    }

    setExportButtonLoading(true);

    try {
      await ensureHtml2Pdf();
      showExportLoading("Preparing export task...", "正在准备导出任务...");
      if (activeInputLang === "en") {
        setStatus("Converting from English input...", "正在根据英文输入转换...");
        showExportLoading("Converting from English input...", "正在根据英文输入转换...");
      } else {
        setStatus("Converting from Chinese input...", "正在根据中文输入转换...");
        showExportLoading("Converting from Chinese input...", "正在根据中文输入转换...");
      }

      var prepared = await buildBilingualDataFromMode(data, activeInputLang);
      var exportData = prepared.data;
      setStatus("Exporting both PDFs...", "正在导出两份 PDF...");
      showExportLoading("Exporting high-quality PDFs...", "正在导出高质量 PDF...");

      var safeBaseEn = (exportData.nameEn || exportData.nameZh || "resume").replace(/\s+/g, "_");
      var safeBaseZh = (exportData.nameZh || exportData.nameEn || "resume").replace(/\s+/g, "_");

      var htmlEn = buildResumeHtml(exportData, "en");
      var htmlZh = buildResumeHtml(exportData, "zh");

      await exportSingle(htmlEn, safeBaseEn + "_Resume_EN.pdf");
      await exportSingle(htmlZh, safeBaseZh + "_简历_ZH.pdf");

      if (prepared.warnings.length) {
        setStatus(
          "Export completed. Some fields could not be translated and were exported as original text.",
          "导出完成。部分字段翻译失败，已按原文导出。"
        );
      } else {
        setStatus("Both English and Chinese resumes were exported.", "英文与中文简历已全部导出。");
      }
    } catch (err) {
      setStatus("Export failed. Please try again.", "导出失败，请重试。");
    } finally {
      hideExportLoading();
      setExportButtonLoading(false);
    }
  }

  if (modeToggle) {
    modeToggle.addEventListener("click", function (event) {
      var chip = event.target.closest("[data-mode-chip]");
      if (chip) {
        var selected = chip.getAttribute("data-mode-chip");
        if (selected === "en" || selected === "zh") {
          setInputMode(selected);
          return;
        }
      }

      var next = activeInputLang === "en" ? "zh" : "en";
      setInputMode(next);
    });

    modeToggle.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        var next = activeInputLang === "en" ? "zh" : "en";
        setInputMode(next);
      }
    });
  }

  restoreInputMode();

  if (form) {
    clearFormValues();
    try {
      localStorage.removeItem(storageKey);
    } catch (err) {
      // Ignore persistence failures.
    }
    // Some browsers apply form autofill asynchronously after initial render.
    window.setTimeout(function () {
      clearFormValues();
      try {
        localStorage.removeItem(storageKey);
      } catch (error) {
        // Ignore persistence failures.
      }
    }, 120);
    Array.prototype.forEach.call(form.elements, function (el) {
      if (el.name) {
        el.addEventListener("input", saveForm);
        if (el.name === "nameEn" || el.name === "nameZh") {
          el.addEventListener("input", function () {
            el.removeAttribute("aria-invalid");
            var group = el.closest(".cv-form-group");
            if (group) {
              group.classList.remove("is-error", "is-validation-shake");
            }
            if (panel) {
              panel.classList.remove("is-validation-shake");
            }
          });
        }
      }
    });
  }

  if (button) {
    button.addEventListener("click", generateBilingualResumes);
  }

  if (importFileInput) {
    importFileInput.addEventListener("change", function () {
      var file = this.files && this.files[0] ? this.files[0] : null;
      if (!file) {
        return;
      }
      handleImportFile(file);
    });
  }

  if (importDropzone && importFileInput) {
    function preventDragDefaults(event) {
      event.preventDefault();
      event.stopPropagation();
    }

    importDropzone.addEventListener("click", function () {
      openImportPicker();
    });

    importDropzone.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openImportPicker();
      }
    });

    if (importDropzoneButton) {
      importDropzoneButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        openImportPicker();
      });
    }

    importDropzone.addEventListener("dragenter", function (event) {
      preventDragDefaults(event);
      importDragCounter += 1;
      importDropzone.classList.add("is-dragover");
    });

    importDropzone.addEventListener("dragover", function (event) {
      preventDragDefaults(event);
      importDropzone.classList.add("is-dragover");
    });

    importDropzone.addEventListener("dragleave", function (event) {
      preventDragDefaults(event);
      importDragCounter = Math.max(0, importDragCounter - 1);
      if (importDragCounter === 0) {
        importDropzone.classList.remove("is-dragover");
      }
    });

    importDropzone.addEventListener("drop", function (event) {
      preventDragDefaults(event);
      importDragCounter = 0;
      importDropzone.classList.remove("is-dragover");
      var files = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files : null;
      var file = files && files[0] ? files[0] : null;
      if (file) {
        handleImportFile(file);
      }
    });
  }

  window.addEventListener("languageChanged", function () {
    applyLang(panel);
    if (exportLoadingOverlay) {
      applyLang(exportLoadingOverlay);
    }
  });

  applyLang(panel);
})();
