export default {
	calcolaPunteggio (currentRow) {
		const annoMin = 2003;
		const annoMax = 2026;
		let riga = currentRow;
		let punteggio = 0.0;
		let descrizione = "";
		// LAUREA
		// Voto di laurea 110/110 e lode o 100/100 e lode punteggio 3,00
		if (riga.laurea_lode === "TRUE") {
			punteggio+= 3;
			descrizione+= "Voto di laurea 110/110 e lode o 100/100 e lode -> +3 punti  <br />";
		}
	  // Voto di laurea da 101/110 a 110/110 o da 91/100 a 100/100 punteggio 2,00
		if (riga.su_110 === "TRUE" && riga.voto_laurea >= 101 || riga.su_110 === "FALSE" && riga.voto_laurea >= 91) {
			punteggio+= 2;
			descrizione+= "Voto di laurea da 101/110 a 110/110 o da 91/100 a 100/100 -> +3 punti  <br />";
		}
		
		// SPECIALIZZAZIONE
		// specializzazione / titolo di cui all'art. 19, comma 4, lett. d) punteggio 3,00
		if (riga.data_specializzazione !== "") {
			punteggio+= 3;
			descrizione+= "specializzazione / titolo di cui all'art. 19, comma 4, lett. d) -> +3 punti <br />";
		}
		// specializzazione nella branca di odontoiatria di cui all'Allegato 2 del presente Accordo punteggio 6,00
		if (riga.spec_odontoiatria === "TRUE") {
			punteggio+= 6;
			descrizione+= "specializzazione nella branca di odontoiatria di cui all'Allegato 2 del presente Accordo -> +6 punti  <br />";
		}
		// - per ogni ulteriore specializzazione punteggio 1,00
		if (riga.num_spec_branca_princip !== "" && riga.num_spec_branca_princip >0) {
			let punteggioTemp = parseInt(riga.num_spec_branca_princip);
			punteggio+= punteggioTemp;
			descrizione+= "per ogni ulteriore specializzazione (" + parseInt(riga.num_spec_branca_princip) + " spec.) -> +" + punteggioTemp + " punti  <br />";
		}
		
		// VOTO DI SPECIALIZZAZIONE
		// con lode (una sola volta) 
		if (riga.specializzazione_lode === "TRUE") {
			punteggio+= 3;
			descrizione+= "Specializzazione con lode (una sola volta) -> +3 punti  <br />";
		}
		// con il massimo dei voti (una sola volta)
		else if (riga.spec_max_voti === "TRUE") {
			punteggio+= 2;
			descrizione+= "Specializzazione con il massimo dei voti (una sola volta) -> +2 punti  <br />";
		}
		
		//SOSTITUZIONI
		for (let i=annoMin; i<=annoMax; i++) {
			const punteggioTemp = this.sostituzioniToDouble(riga["servizio_" + i]);
			if (!isNaN(punteggioTemp) && punteggioTemp >0) {
				punteggio+= punteggioTemp;
				descrizione+= "Sostituzioni anno " + i.toString() + " -> +" + punteggioTemp.toString() +" punti  <br />";
			}
		}
		punteggio = parseFloat(punteggio.toFixed(2));
		return {punteggio,descrizione};
		
	},
	sostituzioniToDouble(dato = ""){
		return parseFloat(dato.replace(",","."));
	},
	
	async datiGraduatoria() {
		let dati = {};
		let dati2 = {
			"Allergologia": [
					{ numero: 1, punteggio: 85, cognome: "Rossi", nome: "Mario" },
					{ numero: 2, punteggio: 80, cognome: "Bianchi", nome: "Luca" }
			],
			"Audiologia": [
					{ numero: 1, punteggio: 90, cognome: "Verdi", nome: "Giulia" },
					{ numero: 2, punteggio: 88, cognome: "Neri", nome: "Anna" }
			]
		};
		let allData = await raw_data.data;
		let quanti = allData.length.toString();
		Text10.setText(quanti);
		return dati2;
	},
	
	async pdfReport() {
		const doc = jspdf.jsPDF();
		const dati = await this.datiGraduatoria();
    
     let y = 20; // Posizione iniziale verticale

    // Aggiungi un titolo all'inizio
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text("Graduatoria Specialistica", 105, y, null, null, 'center');
    y += 10;

    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text("Generato il " + moment().format("DD/MM/YYYY HH:mm"), 105, y, null, null, 'center');
    y += 20;

    // Ciclo per ogni branca nel tuo oggetto dati
    Object.keys(dati).forEach(branchia => {
        // Titolo della branchia (es: Allergologia)
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 128); // Colore blu per il titolo della branchia
        doc.text(branchia, 10, y);
        y += 10;

        // Intestazione della tabella
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text("Num.", 10, y);
        doc.text("Punteggio", 40, y);
        doc.text("Cognome e Nome", 80, y);
        y += 8;

        // Linea orizzontale sotto l'intestazione della tabella
        doc.setDrawColor(0);
        doc.line(10, y, 200, y); // Lunghezza linea
        y += 5;

        // Dati della tabella
        dati[branchia].forEach(item => {
            doc.text(item.numero.toString(), 10, y);
            doc.text(item.punteggio.toString(), 40, y);
            doc.text(`${item.cognome} ${item.nome}`, 80, y);
            y += 8;

            // Controllo se abbiamo superato lo spazio di una pagina
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
        });

        y += 10; // Spazio tra una branchia e l'altra
    });

    // Footer con numero di pagina
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(`Pagina ${i} di ${totalPages}`, 200 - 30, 290); // Posizionato in basso a destra
    }
		reportGraduatoria.setURL(doc.output("dataurlstring"));
	}
}