export default {
	
	errore: "",
	
	getErrore () {
		return this.errore;
	},
	
	nuovaRiga () {
	  this.errore = ""
		if (!cognome_txt.isValid)
			this.errore += "Cognome obbligatorio. "
		if (this.errore !== "")
			showModal(Modal1.name);
		else
			updateRiga.run();
	}
}