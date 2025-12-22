export default {
	userData: null,
	firstLoadingOk: false,
	secret: "UxZ>69'[Tu<6",
	_verifyIntervalId: null, // <- ID del setInterval
	distrettiMap: { byUnique: {}, byId: {} },
	brancheVeterinarie: [
		"SANITA' ANIMALE",
		"IGIENE ALIMENTI ORIGINE ANIMALE",
		"IGIENE DEGLI ALLEVAMENTI PROD. ZOOT."
	],
	async initLoad() {
		showModal(caricamentoMdl.name);
		this.firstLoadingOk = false;
		await this.verifyTokenExpires();
		await all_data.run();
		// Avvio del controllo periodico del token ogni 5 minuti (es. 300 secondi)
		this.startVerifyTokenInterval(60 * 5);
		closeModal(caricamentoMdl.name);
	},
	/* =======================
	   FUNZIONE CONTROLLO TOKEN PERIODICO
	======================= */
	startVerifyTokenInterval(secondi = 300) {
		// Se esiste già un timer lo resetto
		if (this._verifyIntervalId) clearInterval(this._verifyIntervalId);

		this._verifyIntervalId = setInterval(() => {
			const { expired } = this.verifyTokenExpires();
			if (expired) {
				clearInterval(this._verifyIntervalId);
				this._verifyIntervalId = null;
			}
		}, secondi * 1000);
	},

	stopVerifyTokenInterval() {
		if (this._verifyIntervalId) {
			clearInterval(this._verifyIntervalId);
			this._verifyIntervalId = null;
		}
	},
	aggiornaDati () {
		all_data.run();
	},
	getDistrettiFromIds(distrettiString, separator = ",") {
		const ids = distrettiString.split(separator);
		return ids.reduce((acc, id) => {
			const d = this.distrettiMap.byUnique[id];
			if (d) acc[d.old_code] = d.descrizione;
			return acc;
		}, {});
	},
	verifyTokenExpires() {
		let expired = false;

		if (appsmith.store.token) {
			try {
				const decoded = jsonwebtoken.verify(appsmith.store.token, this.secret);

				const distretti = this.getDistrettiFromIds(decoded.data.id_distretto);
				this.userData = {
					username: decoded.data.user,
					livelloText: this.livelli[decoded.data.livello.toString()],
					abilitazioni: decoded.data.abilitazioni_dipententi.split(','),
					livello: decoded.data.livello,
					mail: decoded.data.mail,
					distrettoRaw: decoded.data.id_distretto,
					// se non è stato cambiato distretto uso il primo, altrimenti mantengo quello selezionato
					codDistretto: parseInt(Object.keys(distretti)[0]),
					distretto: this.distrettiMap.byId[Object.keys(distretti)[0]].unique,
					distrettoTxt: distretti[Object.keys(distretti)[0]]
				};

				const newToken = this.createToken({ data: decoded.data });
				storeValue("token", newToken);
			} catch (err) {
				console.error("Token non valido o scaduto:", err);
				expired = true;
			}
		} else expired = true;

		if (expired) {
			this.doLogout("Sessione scaduta, effettua di nuovo il login", "warning");
		}
		return { expired };
	},
	createToken: user => jsonwebtoken.sign(user, this.secret, { expiresIn: 60 * 60 }),
	doLogout: (msg = "Logout effettuato", type = "info") => {
		storeValue("token", null);
		storeValue("message", { msg, type });
		navigateTo("GpsVar Login");
	},
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
			descrizione+= "Voto di laurea da 101/110 a 110/110 o da 91/100 a 100/100 -> +2 punti  <br />";
		}

		// SPECIALIZZAZIONE
		// specializzazione / titolo di cui all'art. 19, comma 4, lett. d) punteggio 3,00
		if (riga.prima_spec_branca_principale === "TRUE") {
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

	datiGraduatoria(allData, mostraSoloVeterinari = false) {
		let dati = {};
		for (let i=0; i<allData.length; i++) {
			if (allData[i].in_graduatoria === "TRUE" && ((!mostraSoloVeterinari && !this.brancheVeterinarie.includes(allData[i].branca)) || (mostraSoloVeterinari && this.brancheVeterinarie.includes(allData[i].branca)))) {
				if (!dati.hasOwnProperty(allData[i].branca))
					dati[allData[i].branca] = [];
				dati[allData[i].branca] = this.inserisciInGraduatoria(dati[allData[i].branca], allData[i]);
			}
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

	pdfReport(dati) {
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
			let index = 1;
			// Aggiungi il nome della branchia come titolo
			finalData.push([{content: branchia, colSpan: 4, styles: { halign: 'center', fillColor: [220, 220, 220] }}]);

			// Aggiungi l'intestazione per ogni branchia (più piccola)
			finalData.push([
				{content: '#POS', styles: { fontSize: 10 }},
				{content: 'Cognome e Nome', styles: { fontSize: 10 }},
				{content: 'Punteggio', styles: { fontSize: 10 }},
				{content: 'Note', styles: { fontSize: 10 }}
			]);

			// Aggiungi i dati della tabella
			dati[branchia].forEach(item => {
				finalData.push([
					index.toString(), 
					`${item.cognome} ${item.nome}`,
					item.punteggio.toString(), 
					item.note || ""  // Aggiungi le note se presenti
				]);
				index++;
			});
		});

		// Usa autoTable per creare la tabella

		jspdf_autotable.default(doc,{

			body: finalData, // Dati della tabella
			startY: 40, // Posizione iniziale della tabella
			theme: 'grid', // Stile della tabella
			styles: { fontSize: 10 }, // Stile generale della tabella
			headStyles: { fillColor: [0, 0, 128] }, // Stile dell'intestazione
			didDrawPage: function (data) {
				// Aggiungi il numero di pagina in basso ad ogni pagina
				const pageCount = doc.internal.getNumberOfPages();
				doc.setFontSize(10);
				doc.text(`Pagina ${data.pageNumber} di ${pageCount}`, 200 - 30, 290); // Posiziona in basso a destra
			}
		});

		return doc.output("dataurlstring");
	},
	checkData() {
		let error = false;
		if (branca_cmb.selectedOptionValue === "")
			error = true;
		return !error;
	},
	addNewRow() {
		storeValue("TEMP_RECORD",utilsClass.getObjectOfCurrentRecord())
		if (utilsClass.checkData()) {
			add.run().then(() => {
				showAlert('Specialista caricato correttamente', 'success');
				all_data.run();
			});
		}
		else
		{
			showAlert('Verificare i dati', 'warning');
		}
	},
	campoDisabilitato() {
		return (elenco.selectedRow.rowIndex === "" && !elenco.isAddRowInProgress)
	},
	clickReportButton() {
		const allData = all_data.data;
		const dati = this.datiGraduatoria(allData,soloVeterinari.isChecked);
		let data2 = this.pdfReport(dati);
		reportGraduatoria.setURL(data2);
		showModal(ModalGraduatoriaPdf.name);
	},
	soloNumeriVirgola(component) {
		let inputText = component.text;

		// Definisco un'espressione regolare per consentire solo numeri, virgole e punti
		const validText = inputText.replace(/[^0-9,\.]/g, '');

		// Se il testo contiene caratteri non validi, aggiorna la textbox con il testo corretto
		if (inputText !== validText) {
			component.setValue(validText);
		}
	},
	getObjectOfCurrentRecord(addRowKey = false) {
		let data =   {
			codice_fiscale: codice_fiscale_txt.text.toUpperCase(),
			cognome: cognome_txt.text.toUpperCase(),
			nome: nome_txt.text.toUpperCase(),
			in_graduatoria: archiviato_chk.isChecked ? "FALSE" : "TRUE",
			data_nascita: data_nascita_txt.selectedDate !== "" ? moment.tz(data_nascita_txt.selectedDate, 'Europe/Rome').format("YYYY-MM-DD") : "",
			indirizzo: indirizzo_txt.text.toUpperCase(),
			citta: citta_txt.text.toUpperCase(),
			cellulare: cellulare_txt.text,
			email: email_txt.text,
			branca: branca_cmb.selectedOptionValue,
			data_laurea : data_laurea_txt.selectedDate !== "" ? moment.tz(data_laurea_txt.selectedDate, 'Europe/Rome').format("YYYY-MM-DD") : "",
			voto_laurea: voto_laurea.text,
			su_110: su100_sw.isSwitchedOn.toString().toUpperCase(),
			laurea_lode: laurea_lode_chk.isChecked.toString().toUpperCase(),
			data_specializzazione: data_specializzazione.selectedDate !== "" ? moment.tz(data_specializzazione.selectedDate, 'Europe/Rome').format("YYYY-MM-DD") : "",
			voto_spec_settantesimi: voto_spec_settantesimi_txt.text,
			spec_max_voti: spec_max_voti_chk.isChecked.toString().toUpperCase(),
			specializzazione_lode: prima_spec_lode_chk.isChecked.toString().toUpperCase(),
			spec_odontoiatria: spec_odontoiatria_chk.isChecked.toString().toUpperCase(),
			prima_spec_branca_principale: prima_spec_branca_chk.isChecked.toString().toUpperCase(),
			num_spec_branca_princip: num_ulteriori_spec_txt.text,
			seconda_spec_lode: altra_spec_lode_chk.isChecked.toString().toUpperCase(),
			pec: pec_txt.text.toLowerCase(),
			note: note_txt.text,
			servizio_2003: sost_2003.text !== "" ? parseFloat(sost_2003.text.replace(",",".")).toFixed(2).replace(".",",") : "0,00",
			servizio_2004: sost_2004.text !== "" ? parseFloat(sost_2004.text.replace(",",".")).toFixed(2).replace(".",",") : "0,00",
			servizio_2005: sost_2005.text !== "" ? parseFloat(sost_2005.text.replace(",",".")).toFixed(2).replace(".",",") : "0,00",
			servizio_2006: sost_2006.text !== "" ? parseFloat(sost_2006.text.replace(",",".")).toFixed(2).replace(".",",") : "0,00",
			servizio_2007: sost_2007.text !== "" ? parseFloat(sost_2007.text.replace(",",".")).toFixed(2).replace(".",",") : "0,00",
			servizio_2008: sost_2008.text !== "" ? parseFloat(sost_2008.text.replace(",",".")).toFixed(2).replace(".",",") : "0,00",
			servizio_2009: sost_2009.text !== "" ? parseFloat(sost_2009.text.replace(",",".")).toFixed(2).replace(".",",") : "0,00",
			servizio_2010: sost_2010.text !== "" ? parseFloat(sost_2010.text.replace(",",".")).toFixed(2).replace(".",",") : "0,00",
			servizio_2011: sost_2011.text !== "" ? parseFloat(sost_2011.text.replace(",",".")).toFixed(2).replace(".",",") : "0,00",
			servizio_2012: sost_2012.text !== "" ? parseFloat(sost_2012.text.replace(",",".")).toFixed(2).replace(".",",") : "0,00",
			servizio_2013: sost_2013.text !== "" ? parseFloat(sost_2013.text.replace(",",".")).toFixed(2).replace(".",",") : "0,00",
			servizio_2014: sost_2014.text !== "" ? parseFloat(sost_2014.text.replace(",",".")).toFixed(2).replace(".",",") : "0,00",
			servizio_2015: sost_2015.text !== "" ? parseFloat(sost_2015.text.replace(",",".")).toFixed(2).replace(".",",") : "0,00",
			servizio_2016: sost_2016.text !== "" ? parseFloat(sost_2016.text.replace(",",".")).toFixed(2).replace(".",",") : "0,00",
			servizio_2017: sost_2017.text !== "" ? parseFloat(sost_2017.text.replace(",",".")).toFixed(2).replace(".",",") : "0,00",
			servizio_2018: sost_2018.text !== "" ? parseFloat(sost_2018.text.replace(",",".")).toFixed(2).replace(".",",") : "0,00",
			servizio_2019: sost_2019.text !== "" ? parseFloat(sost_2019.text.replace(",",".")).toFixed(2).replace(".",",") : "0,00",
			servizio_2020: sost_2020.text !== "" ? parseFloat(sost_2020.text.replace(",",".")).toFixed(2).replace(".",",") : "0,00",
			servizio_2021: sost_2021.text !== "" ? parseFloat(sost_2021.text.replace(",",".")).toFixed(2).replace(".",",") : "0,00",
			servizio_2022: sost_2022.text !== "" ? parseFloat(sost_2022.text.replace(",",".")).toFixed(2).replace(".",",") : "0,00",
			servizio_2023: sost_2023.text !== "" ? parseFloat(sost_2023.text.replace(",",".")).toFixed(2).replace(".",",") : "0,00",
			servizio_2024: sost_2024.text !== "" ? parseFloat(sost_2024.text.replace(",",".")).toFixed(2).replace(".",",") : "0,00",
			servizio_2025: sost_2025.text !== "" ? parseFloat(sost_2025.text.replace(",",".")).toFixed(2).replace(".",",") : "0,00",
		}
		if (addRowKey)
			data = {...data, rowIndex: elenco.selectedRow.rowIndex}
		return data;
	},
	setArchiviato(currentRow) {
		currentRow.archiviato = (currentRow.archiviato  === "TRUE" ? "FALSE" : "TRUE");
		updateRiga.run().then(() => {
			showAlert('Aggiornamento stato esecuito', 'success');
			all_data.run();
		});
	},
	excelReport(dati) {
    const wb = xlsx.utils.book_new();
    const sheetData = [];
    
    // Titolo principale
    sheetData.push(['Graduatoria Specialistica']);
    sheetData.push([`Generato il ${moment().format('DD/MM/YYYY HH:mm')}`]);
    sheetData.push([]); // Riga vuota
    
    // Per ogni branca
    Object.keys(dati).forEach((branca, idx) => {
        // Nome della branca come intestazione di sezione
        sheetData.push([branca]);
        
        // Header della tabella
        sheetData.push(['#POS', 'Cognome e Nome', 'Punteggio', 'Note']);
        
        // Dati della graduatoria
        let index = 1;
        dati[branca].forEach(item => {
            sheetData.push([
                index,
                `${item.cognome} ${item.nome}`,
                item.punteggio,
                item.note || ''
            ]);
            index++;
        });
        
        // Riga vuota tra le branche (tranne dopo l'ultima)
        if (idx < Object.keys(dati).length - 1) {
            sheetData.push([]);
        }
    });
    
    // Crea il foglio
    const ws = xlsx.utils.aoa_to_sheet(sheetData);
    
    // Imposta larghezza colonne
    ws['!cols'] = [
        { wch: 8 },   // #POS
        { wch: 35 },  // Cognome e Nome
        { wch: 12 },  // Punteggio
        { wch: 45 }   // Note
    ];
    
    // Aggiungi il foglio al workbook
    xlsx.utils.book_append_sheet(wb, ws, 'Graduatoria');
    
    // Genera come base64 e scarica
    const wbout = xlsx.write(wb, { bookType: 'xlsx', type: 'base64' });
    const dataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${wbout}`;
    download(dataUrl, `Graduatoria_${moment().format('YYYY-MM-DD_HHmm')}.xlsx`);
},

clickReportExcelButton() {
    const allData = all_data.data;
    const dati = this.datiGraduatoria(allData, soloVeterinari.isChecked);
    this.excelReport(dati);
    showAlert('File Excel generato con successo', 'success');
},
}