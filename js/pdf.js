/**
 * PDFGenerator - Génération de PDF à partir de la prévisualisation
 */
const PDFGenerator = (() => {

    async function captureElement() {
        const element = document.getElementById('attestation-preview');
        return html2canvas(element, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false
        });
    }

    function canvasToPDF(canvas) {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const width = imgWidth * ratio;
        const height = imgHeight * ratio;

        const x = (pdfWidth - width) / 2;
        pdf.addImage(imgData, 'PNG', x, 0, width, height);

        return pdf;
    }

    function buildFilename(attestation) {
        return `attestation_${attestation.numero}_${attestation.apprenant.nom}_${attestation.apprenant.prenom}.pdf`
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9_\-\.]/g, '');
    }

    async function exportPDF() {
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

        App.toast('Génération du PDF en cours...', 'info');

        try {
            const canvas = await captureElement();
            const pdf = canvasToPDF(canvas);

            pdf.save(buildFilename(attestation));

            Store.updateStatus(currentId, 'exportee');
            App.toast('PDF exporté avec succès', 'success');
            App.refreshDashboard();

        } catch (err) {
            console.error('Erreur lors de la génération du PDF:', err);
            App.toast('Erreur lors de la génération du PDF', 'error');
        }
    }

    async function exportSinglePDF(attestation) {
        try {
            const canvas = await captureElement();
            const pdf = canvasToPDF(canvas);

            pdf.save(buildFilename(attestation));
            Store.updateStatus(attestation.id, 'exportee');
        } catch (err) {
            console.error('Erreur PDF pour', attestation.numero, err);
        }
    }

    async function getPDFBlob() {
        const canvas = await captureElement();
        const pdf = canvasToPDF(canvas);
        return pdf.output('blob');
    }

    return { exportPDF, exportSinglePDF, getPDFBlob };
})();
