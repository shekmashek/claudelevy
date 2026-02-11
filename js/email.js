/**
 * EmailService - Envoi d'email avec l'attestation en pièce jointe
 * Utilise mailto: comme méthode de base, avec possibilité d'intégrer EmailJS
 */
const EmailService = (() => {

    function showSendDialog() {
        const currentId = App.getCurrentId();
        if (!currentId) {
            App.toast('Aucune attestation sélectionnée', 'error');
            return;
        }

        const attestation = Store.getById(currentId);
        if (!attestation) {
            App.toast('Attestation introuvable', 'error');
            return;
        }

        // Pre-fill the form
        document.getElementById('email-subject').value =
            `Attestation de formation - ${attestation.apprenant.prenom} ${attestation.apprenant.nom} - ${attestation.formation.intitule}`;

        document.getElementById('email-message').value =
            `Bonjour,\n\nVeuillez trouver ci-joint l'attestation de formation suivante :\n\n` +
            `- Apprenant : ${attestation.apprenant.prenom} ${attestation.apprenant.nom}\n` +
            `- Formation : ${attestation.formation.intitule}\n` +
            `- Numéro : ${attestation.numero}\n` +
            `- Période : du ${formatDate(attestation.formation.dateDebut)} au ${formatDate(attestation.formation.dateFin)}\n\n` +
            `Merci de bien vouloir procéder à l'impression de cette attestation.\n\nCordialement,\nNumerika`;

        document.getElementById('email-modal').style.display = 'flex';
    }

    function closeDialog() {
        document.getElementById('email-modal').style.display = 'none';
    }

    async function send(event) {
        event.preventDefault();

        const currentId = App.getCurrentId();
        const attestation = Store.getById(currentId);

        const to = document.getElementById('email-to').value;
        const subject = document.getElementById('email-subject').value;
        const message = document.getElementById('email-message').value;

        if (!to) {
            App.toast('Veuillez saisir un email destinataire', 'error');
            return;
        }

        App.toast('Préparation de l\'envoi...', 'info');

        try {
            // First export the PDF
            await PDFGenerator.exportPDF();

            // Then open mailto with pre-filled content
            const mailtoLink = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
            window.open(mailtoLink, '_blank');

            // Update status
            Store.updateStatus(currentId, 'envoyee');
            App.refreshDashboard();
            closeDialog();

            App.toast(
                'Le PDF a été téléchargé et votre client email s\'est ouvert. ' +
                'Veuillez joindre le PDF téléchargé à l\'email.',
                'success'
            );

        } catch (err) {
            console.error('Erreur lors de l\'envoi:', err);
            App.toast('Erreur lors de la préparation de l\'envoi', 'error');
        }
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    return { showSendDialog, closeDialog, send };
})();
