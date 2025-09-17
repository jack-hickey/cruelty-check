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
		let productImage = null;

		Dialog.ShowCustom(Localizer.ADD_PRODUCT_TITLE, Localizer.ADD_PRODUCT_DESC,
			`
				<chip-tabgroup id="tgAddProduct" skip-validation>
					<chip-tab>
						<chip-form>
							<chip-input
								id="txtProductName"
								required
								min-length="2"
								max-length="100"
								label="Product name">
							</chip-input>

							<chip-dropdown
								id="drpBrands"
								class="mt-form brand-selector"
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

							<chip-header
								class="mt-form--lg mb-xs"
								size="4">
								Upload an image
							</chip-header>
							<chip-text>
								Please upload an official product image, not personal photos. That means no selfies!
							</chip-text>
							<div class="d-flex flex-column gap-sm mt-form">
								<img role="presentation" id="imgProduct" loading="lazy" />
								<chip-button
									id="btnProductImage"
									class="w-fit"
									variation="info">
									Upload
								</chip-button>
								<chip-text class="d-none" variation="danger" size="sm" id="ctImageValidation">
									Please upload an image
								</chip-text>
							</div>
						</chip-form>

						<chip-callout class="mt-form">
							By submitting, you confirm this information is accurate to the best of your knowledge.
						</chip-callout>
					</chip-tab>
					<chip-tab>
						<chip-header class="mb-lg" size="4">Add a new brand</chip-header>

						<chip-form id="frmBrand">
							<chip-input
								id="txtBrandName"
								min-length="2"
								max-length="50"
								required
								label="Brand name">
							</chip-input>

							<chip-dropdown
								id="drpBrandParent"
								searchable
								default="Choose a brand"
								helper-text="Please review whether or not this brand is owned by a parent company."
								class="mt-form brand-selector"
								secondary-label="(optional)"
								label="Parent company">
							</chip-dropdown>

							<chip-header size="5" class="mt-form">This brand:</chip-header>

							<chip-list class="mt-sm" gap="sm">
								<chip-listitem>
									<chip-checkbox
										id="cbCrueltyFree"
										label="Is certified cruelty-free">
									</chip-checkbox>
								</chip-listitem>
								<chip-listitem>
									<chip-checkbox
										id="cbBCorp"
										label="Is a B Corporation">
									</chip-checkbox>
								</chip-listitem>
								<chip-listitem>
									<chip-checkbox
										id="cbFairTrade"
										label="Is Fair Trade certified">
									</chip-checkbox>
								</chip-listitem>
								<chip-listitem>
									<chip-checkbox
										id="cbAnimalTesting"
										label="Engages in animal testing">
									</chip-checkbox>
								</chip-listitem>
							</chip-list>

							<div class="h-align ms-auto w-fit gap-sm mt-card">
								<chip-button
									step-direction="previous"
									variation="info-tertiary"
									icon="fas fa-chevron-left">
									Back
								</chip-button>
								<chip-button
									id="btnAddBrand">
									Add brand
								</chip-button>
							</div>
						</chip-form>
					</chip-tab>
				</chip-tabgroup>
			`, {
				Size: "md",
				OnRefreshEvents: dialog => {
					FileUploader.Initialize({
						Buttons: [dialog.querySelector("#btnProductImage")],
						AllowedExtensions: ["png", "jpg", "jpeg", "webp", "svg"],
						OnComplete: files => {
							productImage = files.at(0);
							const previouslyTooLarge = ctImageValidation.textContent === Localizer.IMAGE_TOO_LARGE;

							if (productImage) {
								ctImageValidation.toggleClass("d-none", !previouslyTooLarge);
								imgProduct.src = productImage.getImageSrc();
							} else if (!previouslyTooLarge) {
								ctImageValidation.textContent = Localizer.IMAGE_MISSING;
								ctImageValidation.classList.add("d-none");							
							}
						},
						OnFileTooLarge: () => {
							ctImageValidation.textContent = Localizer.IMAGE_TOO_LARGE;
							ctImageValidation.classList.remove("d-none");
						}
					});

					const tabGroup = dialog.querySelector("chip-tabgroup");

					tabGroup.onchange = () => {
						document.querySelector(".dialog .card-footer").toggleClass("d-none", tabGroup.selectedIndex === 1);
					}

					dialog.querySelector("#btnAddBrand").onclick = () => {
						if (dialog.querySelector("#frmBrand").reportValidity()) {
							Ajax.Post("addbrand", {
								body: {
									Name: txtBrandName.value.trim(),
									ParentID: parseInt(drpBrandParent.value) || null,
									CrueltyFree: cbCrueltyFree.checked,
									BCorp: cbBCorp.checked,
									FairTrade: cbFairTrade.checked,
									AnimalTesting: cbAnimalTesting.checked
								},
								success: {
									ok: () => {
										dialog.querySelector("chip-tab").Select();

										txtBrandName.value = "";

										drpBrandParent.value = "";

										// Don't ask
										drpBrandParent.text = "";
										drpBrandParent.text = "Choose a company";

										cbCrueltyFree.checked = false;
										cbBCorp.checked = false;
										cbFairTrade.checked = false;
										cbAnimalTesting.checked = false;
									}
								}
							});
						}
					}

					dialog.querySelectorAll(".brand-selector").forEach(x => x.GetSearchedItems = async query => {
						let brands = await Brand.getAll(query),
							items = [];

						items = brands.map(brand => document.createElementWithContents("chip-dropdownitem", brand.Name, {
							value: brand.ID
						}));

						if (x.id !== "drpBrandParent") {
							x.onselectionchange = () => {
								if (x.value === "0") {
									dialog.querySelector("chip-tab + chip-tab").Select();
									x.value = "";
								}
							};

							items.push(document.createElementWithContents("chip-dropdownitem", "Add new brand", {
								icon: "fas fa-plus",
								value: 0
							}));
						}

						return items;
					});
				},
				OnCheckValid: dialog => {
					let valid = dialog.querySelector("chip-form").reportValidity();

					if (!productImage) {
						ctImageValidation.textContent = Localizer.IMAGE_MISSING;
						valid = false;
					}

					dialog.querySelector("#ctImageValidation").toggleClass("d-none", valid);
				
					return valid;
				},
				AffirmativeText: "Submit"
		}).then(() => Ajax.Post("addproduct", {
			body: Browser.ToFormData({
				Name: txtProductName.value.trim(),
				BrandID: parseInt(drpBrands.value) || 0,
				Vegan: cbVegan.checked,
				Image: productImage
			}),
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
