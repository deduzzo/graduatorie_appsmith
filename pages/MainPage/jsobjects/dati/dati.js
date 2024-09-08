export default {
	
	errore: "",
	
	getErrore () {
		return this.errore;
	},
	
	aggiornaBtn() {
		
	},
	
	updateRiga() {
		if (this.verificaDati())
			updateRiga.run();
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
	  this.errore = ""
		if (!cognome_txt.isValid)
			this.errore += "Cognome obbligatorio. "
		if (this.errore !== "") {
			showModal(Modal1.name);
			return false;
		}
		else 
			return true;
	}
}