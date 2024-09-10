export default {
	
	errore: "",
	
	getErrore () {
		return this.errore;
	},
	
	aggiornaBtn() {
		
	},
	
	updateRiga() {
		if (this.verificaDati()) {
						updateRiga.run().then(() => {
  					showAlert('Dati aggiornati correttamente', 'success');
  					all_data.run();
				});
		}
		else 
			showAlert("Verificare i dati inseriti", "error");
	},
	
	aggiungiRiga() {
		if (this.verificaDati())
			add.run();
	},
	
	resetDati() {
		nome_txt.setValue("");
		cognome_txt.setValue("");
	},
	
	verificaDati () {
			return true;
	}
}