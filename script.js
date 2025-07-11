document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENT SELECTORS ---
    const STORAGE_KEY_DATA = 'admissionNoteData';
    const STORAGE_KEY_BG = 'admissionNoteBackground';
    const blockContainer = document.getElementById('blockContainer');
    const sectionsContainer = document.getElementById('sectionsContainer');
    const allFormElements = Array.from(sectionsContainer.querySelectorAll('input, textarea'));
    const modalOverlay = document.getElementById('modalOverlay');
    const modalBody = document.getElementById('modalBody');
    const modalClose = document.getElementById('modalClose');
    const copyFullNoteBtn = document.getElementById('copyFullNoteBtn');
    const copyHistoryBtn = document.getElementById('copyHistoryBtn');
    const outputContainer = document.getElementById('noteOutputContainer');
    const noteOutputEl = document.getElementById('noteOutput');
    const copyToast = document.getElementById('copy-toast');
    const settingsGear = document.getElementById('settings-gear');
    const settingsMenu = document.getElementById('settings-menu');
    const settingsContainer = document.getElementById('settings-container');
    const backgroundInput = document.getElementById('background-input');
    const resetBackgroundBtn = document.getElementById('reset-background');
    const clearDataBtn = document.getElementById('clear-data');
    const allSections = Array.from(sectionsContainer.querySelectorAll('section'));
    const blocks = {};

    // --- HELPER FUNCTIONS ---
    const getVal = (id, defaultVal = 'N/A') => {
        const el = document.getElementById(id);
        return el && el.value.trim() ? el.value.trim() : defaultVal;
    };
    const plusMinus = (cbId) => {
        const el = document.getElementById(cbId);
        return el && el.checked ? "■" : "□";
    };

    // --- UI & STATE MANAGEMENT ---
    const isSectionFilled = (section) => {
        const inputs = section.querySelectorAll('input[type="text"], textarea');
        for (const input of inputs) {
            if (input.value.trim() !== '') return true;
        }
        const checkboxes = section.querySelectorAll('input[type="checkbox"]');
        for (const checkbox of checkboxes) {
            if (checkbox.checked) return true;
        }
        return false;
    };

    const updateUIState = () => {
        let allCompleted = true;
        allSections.forEach(section => {
            const block = blocks[section.id];
            if (isSectionFilled(section)) {
                block.classList.add('completed');
            } else {
                block.classList.remove('completed');
                allCompleted = false;
            }
        });
        copyFullNoteBtn.classList.toggle('ready', allCompleted);
        generateNotePreview(); // Live update the preview
    };

    const showToast = (message) => {
        copyToast.textContent = message;
        copyToast.classList.add('show');
        setTimeout(() => copyToast.classList.remove('show'), 2000);
    };

    // --- LOCAL STORAGE ---
    const saveData = () => {
        const data = {};
        allFormElements.forEach(el => {
            data[el.id] = el.type === 'checkbox' ? el.checked : el.value;
        });
        localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data));
        updateUIState();
    };

    const loadData = () => {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY_DATA));
        if (data) {
            allFormElements.forEach(el => {
                if (data[el.id] !== undefined) {
                    el.type === 'checkbox' ? el.checked = data[el.id] : el.value = data[el.id];
                }
            });
        }
        const savedBg = localStorage.getItem(STORAGE_KEY_BG);
        if (savedBg) {
            document.body.style.backgroundImage = `url(${savedBg})`;
        }
        updateUIState();
    };

    // --- NOTE GENERATION (RELIABLE LOGIC) ---
    const addSectionToOutput = (title, content, container) => {
        if (!content || content.trim() === '' || content.trim() === 'N/A') return;
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'output-section';
        // Sanitize content for innerHTML
        const sanitizedContent = content.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
        sectionDiv.innerHTML = `
            <h3>${title}<button class="copy-section-btn" title="Copy this section">📋</button></h3>
            <div class="output-content">${sanitizedContent}</div>
        `;
        container.appendChild(sectionDiv);
    };

    const compileROS = () => {
        let rosOutput = "系統性回顧(Review of Systems)\n(■: positive, □:negative)";
        const INDENT = "    ";
        const ITEMS_PER_LINE = 3;
        const rosDetails = getVal('ros_details', '');
        if (rosDetails) rosOutput += `\n${rosDetails}\n`;

        document.querySelectorAll('#rosSection details').forEach(det => {
            const sysTitle = det.querySelector('summary').textContent.trim();
            const items = det.querySelectorAll('input[type="checkbox"]');
            const formattedParts = Array.from(items).map(cb => `${plusMinus(cb.id)} ${cb.parentElement.textContent.trim()}`);

            let systemItemsString = "";
            for (let i = 0; i < formattedParts.length; i++) {
                systemItemsString += formattedParts[i];
                if (i < formattedParts.length - 1) {
                    systemItemsString += ", ";
                    if ((i + 1) % ITEMS_PER_LINE === 0) systemItemsString += "\n" + INDENT;
                }
            }
            rosOutput += `\n- ${sysTitle}:\n${INDENT}${systemItemsString}`;
        });
        return rosOutput.trim();
    };

    const assembleHistoryBlock = () => {
        const medAllergyDenied = document.getElementById('hist_med_allergy_denied').checked;
        const medAllergyDetails = getVal('hist_med_allergy_details', '');
        const medAllergyDate = getVal('hist_med_allergy_date', '');
        let medAllergyStr = medAllergyDenied ? 'No known' : (medAllergyDetails || 'unknown');
        if (!medAllergyDenied && medAllergyDate) medAllergyStr += ` (${medAllergyDate})`;

        const deviceAllergyDenied = document.getElementById('hist_device_allergy_denied').checked;
        const deviceAllergyDetails = getVal('hist_device_allergy_details', '');
        const deviceAllergyDate = getVal('hist_device_allergy_date', '');
        let deviceAllergyStr = deviceAllergyDenied ? 'No known' : (deviceAllergyDetails || 'unknown');
        if (!deviceAllergyDenied && deviceAllergyDate) deviceAllergyStr += ` (${deviceAllergyDate})`;

        const fhArr = [ `HTN ${plusMinus('fh_HTN')}`, `DM ${plusMinus('fh_DM')}`, `DLP ${plusMinus('fh_DLP')}`, `Cancer ${plusMinus('fh_CA')}`, `CAD ${plusMinus('fh_CAD')}` ];
        let fhStr = fhArr.join(', ');
        const fhDetails = getVal('fh_details', '');
        if (fhDetails) fhStr += `\n${fhDetails}`;

        const historyContent = `病史(Patient History)\n${getVal('patientHistoryNarrative', 'Not specified')}`;
        const pmhContent = `[Past medical history]\n${getVal('hist_pmh', 'Not specified')}`;
        const pshContent = `[Past surgical history]\n${getVal('hist_surgical_history_detailed', 'denied')}`;
        const hospContent = `[Hospitalization]\n${getVal('hist_hospitalization_history', 'denied')}`;
        const medsContent = `Current Medication:\n台大醫院: ${getVal('hist_current_med_ntuh', 'nil')}\nOther: ${getVal('hist_current_med_other', 'denied')}\n中草藥: ${getVal('hist_current_med_tcm', 'denied')}\n保健食品: ${getVal('hist_current_med_supplements', 'denied')}`;
        const allergyContent = `Allergy:\n- Medication Allergy: ${medAllergyStr}\n- Medication ADR: ${getVal('hist_med_adr', 'unknown')}\n- Allergy to Medical Device and Materials: ${deviceAllergyStr}`;
        const familyHistoryContent = `Family History:\n${fhStr}`;
        const toccContent = `TOCC:\n- Travel history: ${getVal('hist_tocc_travel', 'denied')}\n- Occupation: ${getVal('hist_tocc_occupation', 'N/A')}\n- Cluster and contact: ${getVal('hist_tocc_cluster', 'denied')}`;
        const socialContent = `Social History:\n- Alcohol: ${getVal('hist_abc_alcohol', 'denied')}\n- Betel nuts: ${getVal('hist_abc_betel', 'denied')}\n- Smoking: ${getVal('hist_abc_smoking', 'denied')}`;

        return [historyContent, pmhContent, pshContent, hospContent, medsContent, allergyContent, familyHistoryContent, toccContent, socialContent].join('\n\n');
    };

    const generateNotePreview = () => {
        noteOutputEl.innerHTML = ''; // Clear previous preview

        // Build and add each section
        const chiefComplaintContent = `Informant: ${getVal('informant', 'The patient')}\n${getVal('ccpi', 'Not specified')}`;
        addSectionToOutput('主訴(Chief Complaint)', chiefComplaintContent, noteOutputEl);

        const historyBlockContent = assembleHistoryBlock();
        addSectionToOutput('History Block', historyBlockContent, noteOutputEl);

        const psychosocialContent = getVal('psychosocial_assessment', 'pending');
        addSectionToOutput('社會心理相關評估(Psychosocial Assessment)', psychosocialContent, noteOutputEl);

        const dischargePlanContent = `管路留置狀況：${getVal('dp_catheter', 'Nil')}\n日常生活功能分數：${getVal('dp_adl', '100')}\n預期出院後居住場所：${getVal('dp_residence', '與家人同住')}\n預期出院後主要照顧者：${getVal('dp_caregiver', '自己')}\n出院規劃收案篩檢：${getVal('dp_screening', '一般病患')}`;
        addSectionToOutput('出院規劃(Discharge Planning)', dischargePlanContent, noteOutputEl);

        let peText = getVal('pe_details', '');
        document.querySelectorAll('#peSection details').forEach(det => {
            const title = det.querySelector('summary').textContent.trim();
            let lines = Array.from(det.querySelectorAll('input[type="checkbox"]')).map(cb => `${plusMinus(cb.id)} ${cb.parentElement.textContent.trim()}`);
            if(title === "Neurological Examination"){ lines.unshift(`Consciousness: ${getVal('pe_neuro_conscious', 'alert and oriented')}`, `Muscle power: ${getVal('pe_neuro_power', '5/5 all limbs')}`, `Gait: ${getVal('pe_neuro_gait', 'No abnormal gait')}`); }
            if (peText) peText += '\n';
            peText += `<${title}>\n  ` + lines.join(', ');
        });
        const vitalsText = `BH: ${getVal('vitals_bh', '--')} cm, BW: ${getVal('vitals_bw', '--')} kg, T: ${getVal('vitals_t', '--')} C, P: ${getVal('vitals_p', '--')} bpm, R: ${getVal('vitals_r', '--')} /min, BP: ${getVal('vitals_bp', '--/--')} mmHg, Pain score: ${getVal('vitals_pain', '--')}`;
        const physicalExamContent = `${vitalsText}\n\n${peText.trim()}`;
        addSectionToOutput('身體檢查(Physical Examination)', physicalExamContent, noteOutputEl);

        const rosContent = compileROS();
        addSectionToOutput('系統性回顧(Review of Systems)', rosContent, noteOutputEl);

        const soapContent = `${getVal('plan_age_sex', 'Age and sex not specified')}\n\nS:\n${getVal('ccpi', 'Not specified')}\n\nO:\n[PE]\n${getVal('plan_pe_findings', 'N/A')}\n\n[Lab]\n${getVal('plan_lab_data', 'N/A')}\n\n[EKG]\nEKG ${getVal('plan_ekg_date', 'date not specified')}: ${getVal('plan_ekg_interp', 'Normal sinus rhythm')}\n\n[CXR]\nCXR ${getVal('plan_cxr_date', 'date not specified')}: ${getVal('plan_cxr_interp', 'No cardiomegaly, no obvious pneumonia patch')}\n\nA:\n[Active]\n${getVal('plan_assessment_active', 'Not specified')}\n\n[Underlying]\n${getVal('plan_assessment_underlying', 'Not specified')}\n\nP: \n${getVal('plan_plan', 'Identify cause and treat symptoms, discharge without complications')}\n\nTreatment goal: ${getVal('plan_treatment_goal', 'Clinical stability')}`;
        addSectionToOutput('醫療需求與治療計畫(Medical Needs and Care Plan)', soapContent, noteOutputEl);
    };

    // --- INITIALIZATION & EVENT LISTENERS ---
    allSections.forEach(section => {
        const block = document.createElement('div');
        block.className = 'block';
        block.dataset.sectionId = section.id;
        block.innerHTML = `<h2>${section.dataset.title || 'Section'}</h2>`;
        blockContainer.appendChild(block);
        blocks[section.id] = block;
    });

    const openModal = (sectionId) => {
        const section = document.getElementById(sectionId);
        if (section) {
            modalBody.appendChild(section);
            modalOverlay.style.display = 'flex';
            setTimeout(() => { modalOverlay.classList.add('active'); }, 10);
        }
    };

    const closeModal = () => {
        const section = modalBody.querySelector('section');
        modalOverlay.classList.remove('active');
        setTimeout(() => {
            modalOverlay.style.display = 'none';
            if (section) {
                sectionsContainer.appendChild(section);
                saveData(); // Save on close
            }
        }, 300);
    };

    blockContainer.addEventListener('click', e => e.target.closest('.block') && openModal(e.target.closest('.block').dataset.sectionId));
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', e => (e.target === modalOverlay) && closeModal());

    // Auto-save on any input change
    sectionsContainer.addEventListener('input', saveData);

    // Settings Menu
    settingsGear.addEventListener('click', () => settingsMenu.style.display = settingsMenu.style.display === 'block' ? 'none' : 'block');
    document.addEventListener('click', (e) => { // Close menu if clicking outside
        if (!settingsContainer.contains(e.target) && settingsMenu.style.display === 'block') {
            settingsMenu.style.display = 'none';
        }
    });

    clearDataBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all data for a new patient? This cannot be undone.')) {
            localStorage.removeItem(STORAGE_KEY_DATA);
            location.reload();
        }
    });

    backgroundInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const bgDataUrl = event.target.result;
            document.body.style.backgroundImage = `url(${bgDataUrl})`;
            localStorage.setItem(STORAGE_KEY_BG, bgDataUrl);
        };
        reader.readAsDataURL(file);
    });

    resetBackgroundBtn.addEventListener('click', () => {
        document.body.style.backgroundImage = `linear-gradient(to bottom, var(--bg-start), var(--bg-end))`;
        localStorage.removeItem(STORAGE_KEY_BG);
    });

    // Copy Buttons
    copyFullNoteBtn.addEventListener('click', () => {
        const fullText = noteOutputEl.innerText;
        navigator.clipboard.writeText(fullText).then(() => showToast('Full Note Copied!'));
    });

    copyHistoryBtn.addEventListener('click', () => {
        const historyText = assembleHistoryBlock();
        navigator.clipboard.writeText(historyText).then(() => showToast('History Block Copied!'));
    });

    outputContainer.addEventListener('click', e => {
        const btn = e.target.closest('.copy-section-btn');
        if (btn) {
            const content = btn.closest('.output-section').querySelector('.output-content').innerText;
            navigator.clipboard.writeText(content).then(() => {
                const originalText = btn.textContent;
                btn.textContent = '✔️';
                setTimeout(() => { btn.textContent = originalText; }, 1500);
            });
        }
    });

    // --- Load data on start ---
    loadData();
});

