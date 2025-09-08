const productsGetter = Ajax.Get("products.json"),
	resultsContainer = document.getElementById("ctResults");

function search() {
	const query = txtSearch.value.trim();
	if (!query) { return; }

	Promise.resolve(productsGetter).then(products => {
		products = products.body;

		products.forEach(product => {
			product._search = `${product.brand} ${product.name}`;
		});

		displayResults(SearchArray(products, query, "_search"));
	});
}

function displayResults(products) {
	resultsContainer.innerHTML = "";
	txtResultCount.innerHTML = "";

	if (products.length) {
		resultsContainer.addItems(products.map(product => buildResult(product)));
		txtResultCount.innerHTML = `<span class="fw-bold">${products.length}</span> product${products.length === 1 ? "" : "s"} found`;
	} else {
		resultsContainer.appendChild(document.createElementWithContents("chip-emptyprompt", `Nothing could be found matching '<span id="lblSearchTerm" class="fw-bold"></span>'. If you'd like, you can <chip-button variation="info-tertiary" id="btnReportMissing" button-style="inline">report the product missing</chip-button> to improve the chances of it being included.`,
		{
			heading: "Nothing to see here",
			icon: "fal fa-store-slash",
			className: "mt-form--lg"
		}));

		const searchUsed = txtSearch.value;

		lblSearchTerm.textContent = searchUsed;

		btnReportMissing.onclick = () => Dialog.ShowTextBox("Missing product", "Thank you for helping in improving Cruelty Check's database of products! Just enter the name of the product that seems to be missing.", {
			DefaultValue: searchUsed
		})
			.then(value => autoReportMissing(value));
	}
}

function autoReportMissing(product) {
	report("MISSING-PRODUCT", "Missing Product Report", `Using the built in feedback feature, a user has reported the following product as missing:\n>${product}`);
}

btnFeedback.onclick = () => Dialog.ShowCustom("Feedback", "Your feedback is valuable, you can report any issues you've run into or anything you'd like to see on the site!",
	`
		<chip-form>
			<chip-dropdown
				label="Feedback type"
				required
				id="drpType"
				validation-required="Please choose the kind of feedback you'd like to share."
				text="Choose an option">

				<chip-dropdownitem group="Having a problem?" value="BUG">Something's not working</chip-dropdownitem>
				<chip-dropdownitem group="Having a problem?" value="MISSING-PRODUCT">I couldn't find a product</chip-dropdownitem>
				<chip-dropdownitem group="Having a problem?" value="INCORRECT-INFO">Product info is wrong</chip-dropdownitem>
				<chip-dropdownitem group="Got an idea?" value="FEATURE">I've got an idea</chip-dropdownitem>
				<chip-dropdownitem group="Got an idea?" value="IMPROVEMENT">Suggestion for improvement</chip-dropdownitem>
				<chip-dropdownitem group="Just want to say something" value="THANKS">Just saying thanks!</chip-dropdownitem>
			</chip-dropdown>

			<chip-textarea
				rows="12"
				required
				id="txtDetails"
				validation-required="Please tell us a bit more so we understand your feedback"
				class="mt-form"
				label="Tell us more">
			</chip-textarea>
		</chip-form>
	`, {
		NegativeText: "",
		Theme: "FORM",
		Size: "md",
		OnCheckValid: dialog => {
			return dialog.querySelector("chip-form").reportValidity();
		},
		AffirmativeText: "Submit"
	}).then(() => report(drpType.value, "User Submitted Feedback", txtDetails.value));

txtSearch.onkeyup = ev => {
	if (ev.key === "Enter") {
		search();
	}
}

function report(type, title, description) { 
	Ajax.Post("report", {
		body: {
			type,
			title,
			description
		},
		success: {
			ok: response => {
				Dialog.ShowSuccess("Feedback sent", "Thank you for your feedback! We really appreciate you helping us to improve.");
			}
		}
	});
}

function buildResult(product) {
	let theme = "danger";

	if (product.vegan || product.cruelty_free) { theme = "warning"; }
	if (product.vegan && product.cruelty_free) { theme = "success"; }

	const result = document.createElementWithContents("chip-card",
		`
			<div class="h-align mt-card">
				<chip-text class="me-auto" variation="secondary">${product.brand}</chip-text>
				<chip-button
					flush
					class="btn--report-product"
					button-style="icon"
					tooltip="Report incorrect info"
					icon="fas fa-flag"
					variation="danger-tertiary">
				</chip-button>
			</div>
			<chip-text class="mb-form" weight="medium" size="h4">${product.name}</chip-text>

			<chip-list gap="sm">
				<chip-listitem>
					${
						product.vegan
							? '<chip-text icon-colour="success" icon="fas fa-check-circle">Vegan</chip-text>'
							: '<chip-text icon-colour="danger" icon="fas fa-times-circle">Not vegan</chip-text>'
					}
				</chip-listitem>
				<chip-listitem>
					${
						product.cruelty_free
							? '<chip-text icon-colour="success" icon="fas fa-check-circle">Cruelty-free</chip-text>'
							: '<chip-text icon-colour="danger" icon="fas fa-times-circle">Not cruelty-free</chip-text>'
					}
				</chip-listitem>
			</chip-list>

			${
				!product.info
					? ""
					: `<chip-accordionitem class="mt-form ai--view-info" heading="View info">${product.info}</chip-accordionitem>`
			}
		`, {
			image: `images/products/${product.image}`,
			hideBlur: true
		});

	result.querySelector(".btn--report-product").onclick = () => {
		Dialog.ShowTextBox("Incorrect product information", "Please explain below the information you believe to be incorrect, and if possible, the correct information.", {
			Rows: 12,
			Multiline:true
		}).then(value => {
			report("INCORRECT-INFO", "Incorrect Product Information", `Using the built in feedback feature, a user has reported that **${product.name}** by **${product.brand}** has incorrect information, stating:\n>${value}`);
		});
	};

	result.dataset.theme = theme;

	return result;
}
