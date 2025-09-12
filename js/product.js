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
		Dialog.ShowCustom(Localizer.MISSING_PRODUCT_TITLE, Localizer.MISSING_PRODUCT_DESC,
			`
				<chip-form>
					<chip-input
						id="txtProductName"
						required
						max-length="100"
						label="Product">
					</chip-input>

					<chip-input
						id="txtProductBrand"
						required
						class="mt-form"
						max-length="100"
						label="Brand/Company">
					</chip-input>
				</chip-form>
			`, {
				NegativeText: "",
				Size: "md",
				OnCheckValid: dialog => {
					return dialog.querySelector("chip-form").reportValidity();
				},
				AffirmativeText: "Submit"
		}).then(() => report(drpType.value, "User Submitted Feedback", `A user has reporting a product as missing:\n**Name**: ${txtProductName.value.trim()}\n**Brand**: ${txtProductBrand.value.trim()}`));
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
