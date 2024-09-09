export default {
	calcolaPunteggio (riga = currentRow) {
		const annoMin = 2003;
		const annoMax = 2026;
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
		if (riga.specializzazione_lode === "TRUE" || riga.seconda_spec_lode === "TRUE") {
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
					{ numero: 1, punteggio: 85, cognome: "Rossi", nome: "Mario",data_specializzazione: moment(), data_laurea: moment(), data_nascita: moment() },
					{ numero: 2, punteggio: 80, cognome: "Bianchi", nome: "Luca" }
			],
			"Audiologia": [
					{ numero: 1, punteggio: 90, cognome: "Verdi", nome: "Giulia" },
					{ numero: 2, punteggio: 88, cognome: "Neri", nome: "Anna" }
			]
		};
		let allData = await all_data.data;
		for (let i=0; i<allData.length; i++) {
			if (!dati.hasOwnProperty(allData[i].branca))
				dati[allData[i].branca] = [];
			dati[allData[i].branca] = this.inserisciInGraduatoria(dati[allData[i].branca], allData[i]);
		}
		return this.ordinaDatiGraduatoria(dati);
	},
	ordinaDatiGraduatoria(dati) {
    // Ordina le chiavi (branche) in ordine alfabetico
    let chiaviOrdinate = Object.keys(dati).sort();

    // Crea un nuovo oggetto con le chiavi ordinate
    let datiOrdinati = {};

    chiaviOrdinate.forEach(chiave => {
        // Ordina gli elementi della graduatoria in base ai criteri richiesti
        datiOrdinati[chiave] = dati[chiave].sort((a, b) => {
            // 1. Confronta il punteggio (decrescente)
            if (b.punteggio !== a.punteggio) {
                return b.punteggio - a.punteggio;
            }

            // 2. Confronta l'anzianità di specializzazione (data più vecchia precede)
            if (moment(a.data_specializzazione).isBefore(b.data_specializzazione)) {
                a.note = "precede per anzianità di specializzazione";
                b.note = "segue per anzianità di specializzazione";
                return -1;
            }
            if (moment(b.data_specializzazione).isBefore(a.data_specializzazione)) {
                a.note = "segue per anzianità di specializzazione";
                b.note = "precede per anzianità di specializzazione";
                return 1;
            }

            // 3. Confronta la data di laurea (data più vecchia precede)
            if (moment(a.data_laurea).isBefore(b.data_laurea)) {
                a.note = "precede per anzianità di laurea";
                b.note = "segue per anzianità di laurea";
                return -1;
            }
            if (moment(b.data_laurea).isBefore(a.data_laurea)) {
                a.note = "segue per anzianità di laurea";
                b.note = "precede per anzianità di laurea";
                return 1;
            }

            // 4. Confronta la data di nascita (più giovane prevale)
            if (moment(a.data_nascita).isAfter(b.data_nascita)) {
                a.note = "precede per età";
                b.note = "segue per età";
                return -1;
            }
            if (moment(b.data_nascita).isAfter(a.data_nascita)) {
                a.note = "segue per età";
                b.note = "precede per età";
                return 1;
            }

            // Se sono esattamente uguali in tutti i criteri
            return 0;
        });
    });

    return datiOrdinati;
},
	inserisciInGraduatoria(lista, specialista) {
		let tempData = {
			numero: 0,
			punteggio: this.calcolaPunteggio(specialista).punteggio,
			cognome: specialista.cognome,
			nome: specialista.nome,
			data_specializzazione: moment(specialista.data_specializzazione,"YYYY-MM-DD"),
			data_laurea:  moment(specialista.data_laurea,"YYYY-MM-DD"),
			data_nascita:  moment(specialista.data_nascita,"YYYY-MM-DD"),
			note: "",
		}
		return [...lista, tempData];
	},
	
async pdfReport(dati) {
    const doc = jspdf.jsPDF();

    // Aggiungi un titolo all'inizio
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text("Graduatoria Specialistica", 105, 20, null, null, 'center');
    
    // Aggiungi la data
    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text("Generato il " + moment().format("DD/MM/YYYY HH:mm"), 105, 30, null, null, 'center');
    
    // Crea un array di dati per la tabella
    let finalData = [];

    // Ciclo attraverso ogni branca nel tuo oggetto dati
    Object.keys(dati).forEach(branchia => {
        // Aggiungi il nome della branchia come titolo
        finalData.push([{content: branchia, colSpan: 4, styles: { halign: 'center', fillColor: [220, 220, 220] }}]);
        
        // Aggiungi l'intestazione per ogni branchia (più piccola)
        finalData.push([{content: 'Num.', styles: { fontSize: 10 }}, {content: 'Punteggio', styles: { fontSize: 10 }},
                        {content: 'Cognome e Nome', styles: { fontSize: 10 }}, {content: 'Note', styles: { fontSize: 10 }}]);

        // Aggiungi i dati della tabella
        dati[branchia].forEach(item => {
            finalData.push([
                item.numero.toString(), 
                item.punteggio.toString(), 
                `${item.cognome} ${item.nome}`,
                item.note || ""  // Aggiungi le note se presenti
            ]);
        });
    });



    return doc.output("dataurlstring");
},
	async clickReportButton() {
		const dati = await this.datiGraduatoria();
		let data2 = await this.pdfReport(dati);
		reportGraduatoria.setURL(data2);
		showModal(ModalGraduatoriaPdf.name);
	},
	
	clickReportButton2() {
		const dati = all_data.data;
		Text11.setText(dati.length.toString());
	},
}