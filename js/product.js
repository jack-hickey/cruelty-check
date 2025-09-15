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

	static add() {
		Dialog.ShowCustom(Localizer.ADD_PRODUCT_TITLE, Localizer.ADD_PRODUCT_DESC,
			`
				<chip-form>
					<chip-input
						id="txtProductName"
						required
						max-length="100"
						label="Product name">
					</chip-input>

					<chip-dropdown
						id="drpBrands"
						class="mt-form"
						default="Choose a brand"
						required
						searchable
						label="Brand">
					</chip-dropdown>

					<chip-checkbox
						id="cbVegan"
						class="mt-form"
						helper-text="Please tick if this product contains no animal ingredients and is suitable for vegans."
						label="This product is vegan"
					</chip-checkbox>
				</chip-form>
			`, {
				Size: "md",
				OnRefreshEvents: dialog => {
					dialog.querySelector("#drpBrands").GetSearchedItems = async query => {
						const brands = await Brand.getAll(query);

						return brands.map(brand => document.createElementWithContents("chip-dropdownitem", brand.Name, {
							value: brand.ID
						}));
					};
				},
				OnCheckValid: dialog => {
					return dialog.querySelector("chip-form").reportValidity();
				},
				AffirmativeText: "Submit"
		}).then(() => report("MISSING-PRODUCT", "User Submitted Feedback", `A user has reporting a product as missing:\n**Name**: ${txtProductName.value.trim()}\n**Brand**: ${txtProductBrand.value.trim()}`));
	}

	reportIncorrect() {
		Dialog.ShowTextBox(Localizer.INCORRECT_INFORMATION_TITLE, Localizer.INCORRECT_INFORMATION_DESC, {
			Rows: 12,
			AffirmativeText: "Submit",
			Multiline:true
		}).then(value => {
			report("INCORRECT-INFO", "Incorrect Product Information", `Using the built in feedback feature, a user has reported that **${this.Name}** by **${this.Brand.Name}** has incorrect information, stating:\n>${value}`);
		});
	}
}
