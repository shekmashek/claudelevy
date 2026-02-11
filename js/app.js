/**
 * App - Logique principale de l'application Numerika Attestations
 */
const App = (() => {
    let currentAttestationId = null;
    let selectedIds = new Set();
    let previewList = [];
    let previewIndex = 0;

    // ===== Initialization =====
    function init() {
        setupNavigation();
        setupForm();
        setupFilters();
        loadSettings();
        refreshDashboard();

        // Set default date
        document.getElementById('form-date-creation').value = new Date().toISOString().split('T')[0];
    }

    // ===== Navigation =====
    function setupNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.dataset.view;
                showView(view);
            });
        });
    }

    function showView(viewName) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

        const target = document.getElementById(`view-${viewName}`);
        if (target) target.classList.add('active');

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewName);
        });

        if (viewName === 'dashboard') {
            refreshDashboard();
            selectedIds.clear();
            updateBatchBar();
        } else if (viewName === 'create') {
            if (!currentAttestationId) {
                resetForm();
            }
        } else if (viewName === 'settings') {
            loadSettings();
        }
    }

    // ===== Form =====
    function setupForm() {
        const form = document.getElementById('attestation-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            saveAttestation();
        });
    }

    function resetForm() {
        document.getElementById('attestation-form').reset();
        document.getElementById('form-id').value = '';
        document.getElementById('form-numero').value = Store.generateNumero();
        document.getElementById('form-date-creation').value = new Date().toISOString().split('T')[0];
        document.getElementById('form-title').textContent = 'Nouvelle attestation';
        currentAttestationId = null;
    }

    function populateForm(attestation) {
        document.getElementById('form-id').value = attestation.id;
        document.getElementById('form-numero').value = attestation.numero;
        document.getElementById('form-date-creation').value = attestation.dateCreation;
        document.getElementById('form-nom').value = attestation.apprenant.nom;
        document.getElementById('form-prenom').value = attestation.apprenant.prenom;
        document.getElementById('form-email-apprenant').value = attestation.apprenant.email || '';
        document.getElementById('form-intitule').value = attestation.formation.intitule;
        document.getElementById('form-date-debut').value = attestation.formation.dateDebut;
        document.getElementById('form-date-fin').value = attestation.formation.dateFin;
        document.getElementById('form-duree').value = attestation.formation.duree;
        document.getElementById('form-lieu').value = attestation.formation.lieu || '';
        document.getElementById('form-formateur').value = attestation.formation.formateur || '';
        document.getElementById('form-title').textContent = 'Modifier l\'attestation';
        currentAttestationId = attestation.id;
    }

    function getFormData() {
        return {
            numero: document.getElementById('form-numero').value.trim(),
            dateCreation: document.getElementById('form-date-creation').value,
            nom: document.getElementById('form-nom').value.trim(),
            prenom: document.getElementById('form-prenom').value.trim(),
            emailApprenant: document.getElementById('form-email-apprenant').value.trim(),
            intitule: document.getElementById('form-intitule').value.trim(),
            dateDebut: document.getElementById('form-date-debut').value,
            dateFin: document.getElementById('form-date-fin').value,
            duree: document.getElementById('form-duree').value,
            lieu: document.getElementById('form-lieu').value.trim(),
            formateur: document.getElementById('form-formateur').value.trim()
        };
    }

    function saveAttestation() {
        const data = getFormData();
        const existingId = document.getElementById('form-id').value;

        let attestation;
        if (existingId) {
            attestation = Store.update(existingId, data);
            toast('Attestation mise à jour', 'success');
        } else {
            attestation = Store.create(data);
            toast('Attestation créée', 'success');
        }

        currentAttestationId = attestation.id;
        showView('dashboard');
        return attestation;
    }

    function saveAndPreview() {
        const form = document.getElementById('attestation-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const attestation = saveAttestation();
        currentAttestationId = attestation.id;
        previewAttestation(attestation.id);
    }

    // ===== Dashboard =====
    function setupFilters() {
        document.getElementById('search-input').addEventListener('input', () => refreshTable());
        document.getElementById('filter-status').addEventListener('change', () => refreshTable());
    }

    function refreshDashboard() {
        refreshStats();
        refreshTable();
    }

    function refreshStats() {
        const stats = Store.getStats();
        document.getElementById('stat-total').textContent = stats.total;
        document.getElementById('stat-brouillon').textContent = stats.brouillon;
        document.getElementById('stat-validee').textContent = stats.validee + stats.exportee;
        document.getElementById('stat-envoyee').textContent = stats.envoyee;
    }

    function refreshTable() {
        const query = document.getElementById('search-input').value;
        const status = document.getElementById('filter-status').value;
        const attestations = Store.search(query, status);

        const tbody = document.getElementById('attestations-table-body');

        if (attestations.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="7">Aucune attestation trouvée.</td>
                </tr>`;
            return;
        }

        tbody.innerHTML = attestations.map(a => `
            <tr>
                <td class="td-check">
                    <input type="checkbox" class="row-check" data-id="${a.id}"
                           ${selectedIds.has(a.id) ? 'checked' : ''}
                           onchange="App.toggleSelect('${a.id}', this.checked)">
                </td>
                <td><strong>${escapeHtml(a.numero)}</strong></td>
                <td>${escapeHtml(a.apprenant.prenom)} ${escapeHtml(a.apprenant.nom)}</td>
                <td>${escapeHtml(a.formation.intitule)}</td>
                <td>${formatDate(a.dateCreation)}</td>
                <td><span class="badge badge-${a.statut}">${formatStatut(a.statut)}</span></td>
                <td class="actions-cell">
                    <button class="btn btn-sm btn-secondary" onclick="App.previewAttestation('${a.id}')">Voir</button>
                    <button class="btn btn-sm btn-secondary" onclick="App.editAttestation('${a.id}')">Modifier</button>
                    <button class="btn btn-sm btn-secondary" onclick="App.duplicateFromList('${a.id}')">Dupliquer</button>
                    <button class="btn btn-sm btn-danger" onclick="App.deleteAttestation('${a.id}')">Supprimer</button>
                </td>
            </tr>
        `).join('');
    }

    // ===== Selection & Batch =====
    function toggleSelect(id, checked) {
        if (checked) {
            selectedIds.add(id);
        } else {
            selectedIds.delete(id);
        }
        updateBatchBar();
    }

    function toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.row-check');
        checkboxes.forEach(cb => {
            cb.checked = checked;
            if (checked) {
                selectedIds.add(cb.dataset.id);
            } else {
                selectedIds.delete(cb.dataset.id);
            }
        });
        updateBatchBar();
    }

    function updateBatchBar() {
        const bar = document.getElementById('batch-bar');
        const count = selectedIds.size;
        if (count > 0) {
            bar.style.display = 'flex';
            document.getElementById('batch-count').textContent = `${count} sélectionnée(s)`;
        } else {
            bar.style.display = 'none';
        }
    }

    function batchValidate() {
        let count = 0;
        selectedIds.forEach(id => {
            const a = Store.getById(id);
            if (a && a.statut === 'brouillon') {
                Store.updateStatus(id, 'validee');
                count++;
            }
        });
        selectedIds.clear();
        updateBatchBar();
        refreshDashboard();
        toast(`${count} attestation(s) validée(s)`, 'success');
    }

    async function batchExportPDF() {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;

        toast(`Export de ${ids.length} attestation(s) en cours...`, 'info');

        for (const id of ids) {
            const attestation = Store.getById(id);
            if (!attestation) continue;

            currentAttestationId = id;
            renderPreview(attestation);

            // Wait for rendering
            await new Promise(r => setTimeout(r, 300));
            await PDFGenerator.exportSinglePDF(attestation);
        }

        selectedIds.clear();
        updateBatchBar();
        refreshDashboard();
        toast('Export terminé', 'success');
    }

    function batchDelete() {
        const count = selectedIds.size;
        if (!confirm(`Supprimer ${count} attestation(s) ?`)) return;

        selectedIds.forEach(id => Store.remove(id));
        selectedIds.clear();
        updateBatchBar();
        refreshDashboard();
        toast(`${count} attestation(s) supprimée(s)`, 'success');
    }

    // ===== Preview =====
    function previewAttestation(id) {
        const attestation = Store.getById(id);
        if (!attestation) {
            toast('Attestation introuvable', 'error');
            return;
        }

        // Build the navigation list from current table view
        const query = document.getElementById('search-input').value;
        const status = document.getElementById('filter-status').value;
        previewList = Store.search(query, status);
        previewIndex = previewList.findIndex(a => a.id === id);
        if (previewIndex === -1) previewIndex = 0;

        currentAttestationId = id;
        renderPreview(attestation);
        updatePreviewNav();
        showView('preview');
    }

    function navigatePreview(direction) {
        const newIndex = previewIndex + direction;
        if (newIndex < 0 || newIndex >= previewList.length) return;

        previewIndex = newIndex;
        const attestation = previewList[previewIndex];
        currentAttestationId = attestation.id;
        renderPreview(attestation);
        updatePreviewNav();
    }

    function updatePreviewNav() {
        const total = previewList.length;
        document.getElementById('preview-position').textContent = `${previewIndex + 1} / ${total}`;
        document.getElementById('btn-prev').disabled = previewIndex === 0;
        document.getElementById('btn-next').disabled = previewIndex >= total - 1;
    }

    function renderPreview(a) {
        const settings = Store.getSettings();
        const companyName = settings.companyName || 'Numerika';
        const companyInitial = companyName.charAt(0).toUpperCase();
        const companySub = settings.companySubtitle || 'Organisme de formation professionnelle';

        const preview = document.getElementById('attestation-preview');
        preview.innerHTML = `
            <div class="attest-header">
                <div class="attest-logo">${escapeHtml(companyInitial)}</div>
                <div class="attest-company-name">${escapeHtml(companyName.toUpperCase())}</div>
                <div class="attest-company-sub">${escapeHtml(companySub)}</div>
                ${settings.companyAddress ? `<div class="attest-company-sub">${escapeHtml(settings.companyAddress)}</div>` : ''}
            </div>

            <div class="attest-title">
                <h1>Attestation de formation</h1>
                <div class="attest-numero">N° ${escapeHtml(a.numero)}</div>
            </div>

            <div class="attest-body">
                <div class="attest-certify">
                    Nous soussignés, ${escapeHtml(companyName)}, organisme de formation,<br>
                    certifions que :
                </div>

                <div class="attest-field">
                    <div class="attest-field-label">Apprenant(e)</div>
                    <div class="attest-field-value">${escapeHtml(a.apprenant.prenom)} ${escapeHtml(a.apprenant.nom)}</div>
                </div>

                <div class="attest-field">
                    <div class="attest-field-label">A suivi la formation</div>
                    <div class="attest-field-value">${escapeHtml(a.formation.intitule)}</div>
                </div>

                <div class="attest-details">
                    <div class="attest-field">
                        <div class="attest-field-label">Date de début</div>
                        <div class="attest-field-value">${formatDate(a.formation.dateDebut)}</div>
                    </div>
                    <div class="attest-field">
                        <div class="attest-field-label">Date de fin</div>
                        <div class="attest-field-value">${formatDate(a.formation.dateFin)}</div>
                    </div>
                    <div class="attest-field">
                        <div class="attest-field-label">Durée totale</div>
                        <div class="attest-field-value">${escapeHtml(a.formation.duree)} heures</div>
                    </div>
                    <div class="attest-field">
                        <div class="attest-field-label">Lieu</div>
                        <div class="attest-field-value">${escapeHtml(a.formation.lieu || 'Non précisé')}</div>
                    </div>
                </div>

                ${a.formation.formateur ? `
                <div class="attest-field">
                    <div class="attest-field-label">Formateur</div>
                    <div class="attest-field-value">${escapeHtml(a.formation.formateur)}</div>
                </div>
                ` : ''}
            </div>

            <div class="attest-footer">
                <div class="attest-date-place">
                    ${a.formation.lieu ? `Fait à ${escapeHtml(a.formation.lieu)},` : 'Fait'} le ${formatDate(a.dateCreation)}
                </div>
                <div class="attest-signature">
                    <div class="attest-signature-line"></div>
                    <div class="attest-signature-label">Signature et cachet</div>
                </div>
            </div>

            <div class="attest-watermark">
                ${escapeHtml(companyName)}${settings.companySiret ? ` - SIRET : ${escapeHtml(settings.companySiret)}` : ''}${settings.companyNda ? ` - NDA : ${escapeHtml(settings.companyNda)}` : ''} - ${escapeHtml(a.numero)}
            </div>
        `;
    }

    // ===== Actions =====
    function editAttestation(id) {
        const attestation = Store.getById(id);
        if (!attestation) {
            toast('Attestation introuvable', 'error');
            return;
        }

        populateForm(attestation);
        showView('create');
    }

    function editCurrent() {
        if (currentAttestationId) {
            editAttestation(currentAttestationId);
        }
    }

    function validateAttestation() {
        if (!currentAttestationId) return;

        const attestation = Store.getById(currentAttestationId);
        if (!attestation) return;

        if (attestation.statut === 'brouillon') {
            Store.updateStatus(currentAttestationId, 'validee');
            toast('Attestation validée', 'success');
            refreshDashboard();
        } else {
            toast('Cette attestation est déjà validée', 'warning');
        }
    }

    function duplicateAttestation() {
        if (!currentAttestationId) return;

        const newAttestation = Store.duplicate(currentAttestationId);
        if (newAttestation) {
            toast(`Attestation dupliquée (${newAttestation.numero})`, 'success');
            currentAttestationId = newAttestation.id;
            previewAttestation(newAttestation.id);
        }
    }

    function duplicateFromList(id) {
        const newAttestation = Store.duplicate(id);
        if (newAttestation) {
            toast(`Attestation dupliquée (${newAttestation.numero})`, 'success');
            refreshDashboard();
        }
    }

    function deleteAttestation(id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette attestation ?')) return;

        Store.remove(id);
        toast('Attestation supprimée', 'success');
        refreshDashboard();
    }

    function getCurrentId() {
        return currentAttestationId;
    }

    // ===== Print =====
    function printPreview() {
        window.print();
    }

    // ===== Settings =====
    function loadSettings() {
        const settings = Store.getSettings();
        const el = (id) => document.getElementById(id);
        if (el('settings-company-name')) el('settings-company-name').value = settings.companyName || '';
        if (el('settings-company-subtitle')) el('settings-company-subtitle').value = settings.companySubtitle || '';
        if (el('settings-company-address')) el('settings-company-address').value = settings.companyAddress || '';
        if (el('settings-company-siret')) el('settings-company-siret').value = settings.companySiret || '';
        if (el('settings-company-nda')) el('settings-company-nda').value = settings.companyNda || '';
        if (el('settings-email-default')) el('settings-email-default').value = settings.emailDefault || '';
        if (el('settings-numero-prefix')) el('settings-numero-prefix').value = settings.numeroPrefix || 'NUM';
    }

    function saveSettings(event) {
        event.preventDefault();
        const settings = {
            companyName: document.getElementById('settings-company-name').value.trim(),
            companySubtitle: document.getElementById('settings-company-subtitle').value.trim(),
            companyAddress: document.getElementById('settings-company-address').value.trim(),
            companySiret: document.getElementById('settings-company-siret').value.trim(),
            companyNda: document.getElementById('settings-company-nda').value.trim(),
            emailDefault: document.getElementById('settings-email-default').value.trim(),
            numeroPrefix: document.getElementById('settings-numero-prefix').value.trim() || 'NUM'
        };
        Store.saveSettings(settings);
        toast('Paramètres enregistrés', 'success');
    }

    // ===== Import / Export =====
    function exportData() {
        const json = Store.exportJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `numerika_attestations_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast('Données exportées', 'success');
    }

    function importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const count = Store.importJSON(e.target.result);
                toast(`${count} attestation(s) importée(s)`, 'success');
                loadSettings();
                refreshDashboard();
            } catch (err) {
                toast('Erreur: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);

        // Reset the file input so the same file can be re-imported
        event.target.value = '';
    }

    // ===== Utilities =====
    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    function formatStatut(statut) {
        const labels = {
            brouillon: 'Brouillon',
            validee: 'Validée',
            exportee: 'Exportée',
            envoyee: 'Envoyée'
        };
        return labels[statut] || statut;
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function toast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toastEl = document.createElement('div');
        toastEl.className = `toast toast-${type}`;
        toastEl.textContent = message;
        container.appendChild(toastEl);

        setTimeout(() => {
            toastEl.classList.add('toast-out');
            setTimeout(() => toastEl.remove(), 300);
        }, 4000);
    }

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', init);

    return {
        showView,
        saveAndPreview,
        previewAttestation,
        navigatePreview,
        editAttestation,
        editCurrent,
        validateAttestation,
        duplicateAttestation,
        duplicateFromList,
        deleteAttestation,
        getCurrentId,
        printPreview,
        toggleSelect,
        toggleSelectAll,
        batchValidate,
        batchExportPDF,
        batchDelete,
        saveSettings,
        exportData,
        importData,
        refreshDashboard,
        toast
    };
})();
