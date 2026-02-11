/**
 * App - Logique principale de l'application Numerika Attestations
 */
const App = (() => {
    let currentAttestationId = null;

    // ===== Initialization =====
    function init() {
        setupNavigation();
        setupForm();
        setupFilters();
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
        // Hide all views
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

        // Show target view
        const target = document.getElementById(`view-${viewName}`);
        if (target) target.classList.add('active');

        // Update nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewName);
        });

        // View-specific setup
        if (viewName === 'dashboard') {
            refreshDashboard();
        } else if (viewName === 'create') {
            // Reset form if no editing
            if (!currentAttestationId) {
                resetForm();
            }
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
        const searchInput = document.getElementById('search-input');
        const filterSelect = document.getElementById('filter-status');

        searchInput.addEventListener('input', () => refreshTable());
        filterSelect.addEventListener('change', () => refreshTable());
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
                    <td colspan="6">Aucune attestation trouvée.</td>
                </tr>`;
            return;
        }

        tbody.innerHTML = attestations.map(a => `
            <tr>
                <td><strong>${escapeHtml(a.numero)}</strong></td>
                <td>${escapeHtml(a.apprenant.prenom)} ${escapeHtml(a.apprenant.nom)}</td>
                <td>${escapeHtml(a.formation.intitule)}</td>
                <td>${formatDate(a.dateCreation)}</td>
                <td><span class="badge badge-${a.statut}">${formatStatut(a.statut)}</span></td>
                <td class="actions-cell">
                    <button class="btn btn-sm btn-secondary" onclick="App.previewAttestation('${a.id}')">Voir</button>
                    <button class="btn btn-sm btn-secondary" onclick="App.editAttestation('${a.id}')">Modifier</button>
                    <button class="btn btn-sm btn-danger" onclick="App.deleteAttestation('${a.id}')">Supprimer</button>
                </td>
            </tr>
        `).join('');
    }

    // ===== Preview =====
    function previewAttestation(id) {
        const attestation = Store.getById(id);
        if (!attestation) {
            toast('Attestation introuvable', 'error');
            return;
        }

        currentAttestationId = id;
        renderPreview(attestation);
        showView('preview');
    }

    function renderPreview(a) {
        const preview = document.getElementById('attestation-preview');
        preview.innerHTML = `
            <div class="attest-header">
                <div class="attest-logo">N</div>
                <div class="attest-company-name">NUMERIKA</div>
                <div class="attest-company-sub">Organisme de formation professionnelle</div>
            </div>

            <div class="attest-title">
                <h1>Attestation de formation</h1>
                <div class="attest-numero">N° ${escapeHtml(a.numero)}</div>
            </div>

            <div class="attest-body">
                <div class="attest-certify">
                    Nous soussignés, Numerika, organisme de formation,<br>
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
                Numerika - Attestation générée le ${new Date().toLocaleDateString('fr-FR')} - ${escapeHtml(a.numero)}
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

    function deleteAttestation(id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette attestation ?')) return;

        Store.remove(id);
        toast('Attestation supprimée', 'success');
        refreshDashboard();
    }

    function getCurrentId() {
        return currentAttestationId;
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
        editAttestation,
        editCurrent,
        validateAttestation,
        deleteAttestation,
        getCurrentId,
        refreshDashboard,
        toast
    };
})();
