class Product {
	constructor(source) {
		this.Name = source.Name;
		this.Vegan = source.Is_Vegan === 1;
		this.Image = source.Image;

		this.Brand = new Brand(source);
	}

	static search(query) {
		return new Promise(resolve => Ajax.Post("search", {
			body: { query },
			success: {
				ok: response => resolve(response.body.map(x => new Product(x)))
			}
		}));
	}

	static reportMissing() {
		Dialog.ShowTextBox(Localizer.MISSING_PRODUCT_TITLE, Localizer.MISSING_PRODUCT_DESC, {
			DefaultValue: txtSearch.value
		}).then(value => autoReportMissing(value));
	}

	reportIncorrect() {
		Dialog.ShowTextBox(Localizer.INCORRECT_INFORMATION_TITLE, Localizer.INCORRECT_INFORMATION_DESC, {
			Rows: 12,
			Multiline:true
		}).then(value => {
			report("INCORRECT-INFO", "Incorrect Product Information", `Using the built in feedback feature, a user has reported that **${this.Name}** by **${this.Brand.Name}** has incorrect information, stating:\n>${value}`);
		});
	}
}
