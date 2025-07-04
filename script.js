document.addEventListener("DOMContentLoaded", () => {
  // --- ELEMENT SELECTORS ---
  const blockContainer = document.getElementById("blockContainer");
  const sectionsContainer = document.getElementById("sectionsContainer");
  const modalOverlay = document.getElementById("modalOverlay");
  const modalBody = document.getElementById("modalBody");
  const modalClose = document.getElementById("modalClose");
  const copyFullNoteBtn = document.getElementById("copyFullNoteBtn");
  const copyHistoryBtn = document.getElementById("copyHistoryBtn");
  const noteOutput = document.getElementById("noteOutput");
  const copyToast = document.getElementById("copy-toast");
  const settingsGear = document.getElementById("settings-gear");
  const settingsMenu = document.getElementById("settings-menu");
  const backgroundInput = document.getElementById("background-input");
  const resetBackgroundBtn = document.getElementById("reset-background");
  const clearDataBtn = document.getElementById("clear-data");
  const allSections = Array.from(sectionsContainer.querySelectorAll("section"));
  const blocks = {};

  // --- STATE MANAGEMENT & UI UPDATES ---
  const isSectionFilled = (section) => {
    const inputs = section.querySelectorAll(
      'input[type="text"]:not([readonly]), textarea',
    );
    for (const input of inputs) {
      if (input.value && input.value.trim() !== "") return true;
    }
    const checkboxes = section.querySelectorAll('input[type="checkbox"]');
    for (const checkbox of checkboxes) {
      if (checkbox.checked) return true;
    }
    return false;
  };

  const updateUIState = () => {
    let allCompleted = true;
    allSections.forEach((section) => {
      const block = blocks[section.id];
      if (isSectionFilled(section)) {
        block.classList.add("completed");
      } else {
        block.classList.remove("completed");
        allCompleted = false;
      }
    });
    copyFullNoteBtn.classList.toggle("ready", allCompleted);
  };

  const showToast = (message) => {
    copyToast.textContent = message;
    copyToast.classList.add("show");
    setTimeout(() => copyToast.classList.remove("show"), 2000);
  };

  // --- LOCAL STORAGE ---
  const saveToLocalStorage = () => {
    allSections.forEach((section) => {
      section
        .querySelectorAll(
          'input[type="text"], textarea, input[type="checkbox"]',
        )
        .forEach((el) => {
          const key = el.id;
          if (!key) return;
          const value = el.type === "checkbox" ? el.checked : el.value;
          localStorage.setItem(key, value);
        });
    });
  };

  const loadFromLocalStorage = () => {
    allSections.forEach((section) => {
      section
        .querySelectorAll(
          'input[type="text"], textarea, input[type="checkbox"]',
        )
        .forEach((el) => {
          const key = el.id;
          if (!key) return;
          const savedValue = localStorage.getItem(key);
          if (savedValue !== null) {
            if (el.type === "checkbox") {
              el.checked = savedValue === "true";
            } else {
              el.value = savedValue;
            }
          }
        });
    });
    const savedBg = localStorage.getItem("userBackground");
    if (savedBg) {
      document.body.style.backgroundImage = `url(${savedBg})`;
    }
  };

  // --- INITIALIZATION ---
  allSections.forEach((section) => {
    const block = document.createElement("div");
    block.className = "block";
    block.dataset.sectionId = section.id;
    block.innerHTML = `<h2>${section.dataset.title || "Section"}</h2>`;
    blockContainer.appendChild(block);
    blocks[section.id] = block;
  });

  loadFromLocalStorage();
  updateUIState();

  // --- EVENT LISTENERS ---
  const openModal = (sectionId) => {
    modalBody.appendChild(document.getElementById(sectionId));
    modalOverlay.classList.add("active");
  };

  const closeModal = () => {
    const section = modalBody.querySelector("section");
    if (section) {
      sectionsContainer.appendChild(section);
      modalOverlay.classList.remove("active");
      saveToLocalStorage();
      updateUIState();
    }
  };

  blockContainer.addEventListener("click", (e) => {
    const block = e.target.closest(".block");
    if (block) openModal(block.dataset.sectionId);
  });

  modalClose.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  settingsGear.addEventListener("click", (e) => {
    e.stopPropagation();
    settingsMenu.style.display =
      settingsMenu.style.display === "block" ? "none" : "block";
  });
  document.addEventListener("click", (e) => {
    if (!settingsMenu.contains(e.target) && e.target !== settingsGear) {
      settingsMenu.style.display = "none";
    }
  });

  clearDataBtn.addEventListener("click", () => {
    if (
      confirm("Are you sure you want to clear all data? This cannot be undone.")
    ) {
      localStorage.clear();
      location.reload();
    }
  });

  backgroundInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      document.body.style.backgroundImage = `url(${event.target.result})`;
      localStorage.setItem("userBackground", event.target.result);
    };
    reader.readAsDataURL(file);
  });

  resetBackgroundBtn.addEventListener("click", () => {
    document.body.style.backgroundImage = `linear-gradient(to bottom, var(--bg-start), var(--bg-end))`;
    localStorage.removeItem("userBackground");
  });

  // --- NOTE GENERATION ---
  const getVal = (id, def = "") =>
    document.getElementById(id)
      ? (document.getElementById(id).value || def).trim()
      : def;
  const plusMinus = (id) =>
    document.getElementById(id) && document.getElementById(id).checked
      ? "■"
      : "□";

  const compileChecklistSection = (sectionId, title) => {
    const section = document.getElementById(sectionId);
    if (!section) return "";
    let output = `<${title}>\n`;
    const lines = Array.from(
      section.querySelectorAll('input[type="checkbox"]'),
    ).map(
      (cb) => `  ${plusMinus(cb.id)} ${cb.parentElement.textContent.trim()}`,
    );
    return output + lines.join("\n");
  };

  const assembleSecondaryHistory = () => {
    const medAllergyStr =
      `${getVal("hist_med_allergy_details")} ${getVal("hist_med_allergy_date")}`.trim() ||
      (document.getElementById("hist_med_allergy_denied").checked
        ? "No known"
        : "unknown");
    const deviceAllergyStr =
      `${getVal("hist_device_allergy_details")} ${getVal("hist_device_allergy_date")}`.trim() ||
      (document.getElementById("hist_device_allergy_denied").checked
        ? "No known"
        : "unknown");

    let fhStr = [
      `HTN ${plusMinus("fh_HTN")}`,
      `DM ${plusMinus("fh_DM")}`,
      `DLP ${plusMinus("fh_DLP")}`,
      `Cancer ${plusMinus("fh_CA")}`,
      `CAD ${plusMinus("fh_CAD")}`,
    ].join(", ");
    if (getVal("fh_details")) fhStr += `\n${getVal("fh_details")}`;

    return `[Surgical history]
${getVal("hist_surgical_history_detailed", "denied")}

[Hospitalization history]
${getVal("hist_hospitalization_history", "denied")}

Current Medication:
台大醫院: ${getVal("hist_current_med_ntuh", "nil")}
Other: ${getVal("hist_current_med_other", "denied")}
中草藥: ${getVal("hist_current_med_tcm", "denied")}
保健食品: ${getVal("hist_current_med_supplements", "denied")}

Allergy:
- Medication Allergy: ${medAllergyStr}
- Medication ADR: ${getVal("hist_med_adr", "unknown")}
- Allergy to Medical Device and Materials: ${deviceAllergyStr}

Family History:
${fhStr}

TOCC:
- Travel history: ${getVal("hist_tocc_travel", "denied")}
- Occupation: ${getVal("hist_tocc_occupation", "N/A")}
- Cluster and contact: ${getVal("hist_tocc_cluster", "denied")}

Social History:
- Alcohol: ${getVal("hist_abc_alcohol", "denied")}
- Betel nuts: ${getVal("hist_abc_betel", "denied")}
- Smoking: ${getVal("hist_abc_smoking", "denied")}`;
  };

  const assembleHistoryBlockForCopy = () => {
    return `病史(Patient History)\n${getVal("patientHistoryNarrative", "Not specified")}\n\n[Past medical history]\n${getVal("hist_pmh", "Not specified")}\n\n${assembleSecondaryHistory()}`;
  };

  const assembleFullNoteText = () => {
    const chiefComplaint = `主訴(Chief Complaint)\nInformant: ${getVal("informant")}\n${getVal("ccpi")}`;
    const pastMedicalHistory = `[Past medical history]\n${getVal("hist_pmh", "Not specified")}`;
    const patientHistoryNarrative = `病史(Patient History)\n${getVal("patientHistoryNarrative", "Not specified")}`;
    const secondaryHistory = assembleSecondaryHistory();
    const vitalsText = `BH: ${getVal("vitals_bh", "--")} cm, BW: ${getVal("vitals_bw", "--")} kg, T: ${getVal("vitals_t", "--")} C, P: ${getVal("vitals_p", "--")} bpm, R: ${getVal("vitals_r", "--")} /min, BP: ${getVal("vitals_bp", "--/--")} mmHg, Pain score: ${getVal("vitals_pain", "--")}`;

    let peText = `${getVal("pe_details")}`;
    document.querySelectorAll("#peSection details").forEach((det) => {
      const title = det.querySelector("summary").textContent.trim();
      peText += `\n\n<${title}>\n`;
      let lines = [];
      det
        .querySelectorAll("input[type=text]")
        .forEach((input) =>
          lines.push(
            `  ${input.parentElement.textContent.trim()} ${input.value}`,
          ),
        );
      det
        .querySelectorAll("input[type=checkbox]")
        .forEach((cb) =>
          lines.push(
            `  ${plusMinus(cb.id)} ${cb.parentElement.textContent.trim()}`,
          ),
        );
      peText += lines.join("\n");
    });

    let rosText = `系統性回顧(Review of Systems)\n${getVal("ros_details")}`;
    document.querySelectorAll("#rosSection details").forEach((det) => {
      const sysTitle = det.querySelector("summary").textContent.trim();
      const items = det.querySelectorAll('input[type="checkbox"]');
      const formattedParts = Array.from(items).map(
        (cb) => `${plusMinus(cb.id)} ${cb.parentElement.textContent.trim()}`,
      );
      rosText += `\n\n- ${sysTitle}:\n    ${formattedParts.join(", ")}`;
    });

    const planText = `${getVal("plan_age_sex", "Age/Sex not specified")}
S: ${getVal("ccpi")}
O:
[PE] ${getVal("plan_pe_findings")}
[Lab] ${getVal("plan_lab_data")}
[EKG] ${getVal("plan_ekg_date")}: ${getVal("plan_ekg_interp")}
[CXR] ${getVal("plan_cxr_date")}: ${getVal("plan_cxr_interp")}
A:
[Active] ${getVal("plan_assessment_active")}
[Underlying] ${getVal("plan_assessment_underlying")}
P: ${getVal("plan_plan")}
Treatment goal: ${getVal("plan_treatment_goal")}`;

    return [
      chiefComplaint,
      pastMedicalHistory,
      patientHistoryNarrative,
      secondaryHistory,
      `Psychosocial Assessment\n${getVal("psychosocial_assessment")}`,
      `Discharge Planning\n- 管路留置狀況：${getVal("dp_catheter")}\n- 日常生活功能分數：${getVal("dp_adl")}\n- 預期出院後居住場所：${getVal("dp_residence")}\n- 預期出院後主要照顧者：${getVal("dp_caregiver")}\n- 出院規劃收案篩檢：${getVal("dp_screening")}`,
      vitalsText,
      peText.trim(),
      rosText.trim(),
      planText,
    ].join("\n\n");
  };

  copyHistoryBtn.addEventListener("click", () => {
    const textToCopy = assembleHistoryBlockForCopy();
    noteOutput.value = textToCopy;
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => showToast("History Block Copied!"));
  });

  copyFullNoteBtn.addEventListener("click", () => {
    const textToCopy = assembleFullNoteText();
    noteOutput.value = textToCopy;
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => showToast("Full Note Copied!"));
  });
});
