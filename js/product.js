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
		}).then(() => Ajax.Post("addbrand", {
			body: {
				Name: txtProductName.value.trim(),
				BrandID: parseInt(drpBrands.value) || 0,
				Vegan: cbVegan.checked
			},
			success: {
				ok: response => {
					Dialog.ShowSuccess("Product submitted", "Thank you for submitting a new product to Cruelty Check! Your submission has been sent for review and will be visible on the site once accepted.");
				}
			}
		}));
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
