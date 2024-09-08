export default {
	calcolaPunteggio (currentRow) {
		let riga = currentRow;
		let punteggio = 0.0;
		let descrizione = "";
		// LAUREA
		// Voto di laurea 110/110 e lode o 100/100 e lode punteggio 3,00
		if ((riga.su_110 === "TRUE" && riga.voto_laurea === 110 || riga.su_110 === "FALSE" && riga.voto_laurea === 100) && riga.laurea_lode === "TRUE") {
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
		// - specializzazione nella branca di odontoiatria di cui all'Allegato 2 del presente Accordo punteggio 6,00
		if (riga.spec_odontoiatria !== "TRUE") {
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
		
		
		return {punteggio,descrizione};
		
	},
	async report() {
   	 const response = await report_graduatoria.run();
   	 Iframe1.setURL(response.download_url)
    },
	pdfReport() {
		const doc = jspdf.jsPDF();
		doc.text("Ciao", 10, 10);
		return doc.output("dataurlstring")
	}
}