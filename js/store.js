/**
 * Store - Gestion des données avec localStorage
 */
const Store = (() => {
    const STORAGE_KEY = 'numerika_attestations';

    function generateId() {
        return 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function generateNumero() {
        const year = new Date().getFullYear();
        const all = getAll();
        const count = all.length + 1;
        return `NUM-${year}-${String(count).padStart(3, '0')}`;
    }

    function getAll() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

    function saveAll(attestations) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(attestations));
    }

    function getById(id) {
        return getAll().find(a => a.id === id) || null;
    }

    function create(data) {
        const attestations = getAll();
        const attestation = {
            id: generateId(),
            numero: data.numero,
            apprenant: {
                nom: data.nom,
                prenom: data.prenom,
                email: data.emailApprenant || ''
            },
            formation: {
                intitule: data.intitule,
                dateDebut: data.dateDebut,
                dateFin: data.dateFin,
                duree: data.duree,
                lieu: data.lieu || '',
                formateur: data.formateur || ''
            },
            dateCreation: data.dateCreation,
            statut: 'brouillon',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        attestations.push(attestation);
        saveAll(attestations);
        return attestation;
    }

    function update(id, data) {
        const attestations = getAll();
        const index = attestations.findIndex(a => a.id === id);
        if (index === -1) return null;

        attestations[index] = {
            ...attestations[index],
            numero: data.numero,
            apprenant: {
                nom: data.nom,
                prenom: data.prenom,
                email: data.emailApprenant || ''
            },
            formation: {
                intitule: data.intitule,
                dateDebut: data.dateDebut,
                dateFin: data.dateFin,
                duree: data.duree,
                lieu: data.lieu || '',
                formateur: data.formateur || ''
            },
            dateCreation: data.dateCreation,
            updatedAt: new Date().toISOString()
        };
        saveAll(attestations);
        return attestations[index];
    }

    function updateStatus(id, statut) {
        const attestations = getAll();
        const index = attestations.findIndex(a => a.id === id);
        if (index === -1) return null;

        attestations[index].statut = statut;
        attestations[index].updatedAt = new Date().toISOString();
        saveAll(attestations);
        return attestations[index];
    }

    function remove(id) {
        const attestations = getAll().filter(a => a.id !== id);
        saveAll(attestations);
    }

    function search(query, statusFilter) {
        let results = getAll();

        if (statusFilter) {
            results = results.filter(a => a.statut === statusFilter);
        }

        if (query) {
            const q = query.toLowerCase();
            results = results.filter(a =>
                a.numero.toLowerCase().includes(q) ||
                a.apprenant.nom.toLowerCase().includes(q) ||
                a.apprenant.prenom.toLowerCase().includes(q) ||
                a.formation.intitule.toLowerCase().includes(q)
            );
        }

        return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    function getStats() {
        const all = getAll();
        return {
            total: all.length,
            brouillon: all.filter(a => a.statut === 'brouillon').length,
            validee: all.filter(a => a.statut === 'validee').length,
            exportee: all.filter(a => a.statut === 'exportee').length,
            envoyee: all.filter(a => a.statut === 'envoyee').length
        };
    }

    return {
        generateNumero,
        getAll,
        getById,
        create,
        update,
        updateStatus,
        remove,
        search,
        getStats
    };
})();
