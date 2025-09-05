const productsGetter = Ajax.Get("products.json");

function search() {
	const query = txtSearch.value.trim();
	if (!query) { return; }

	Promise.resolve(productsGetter).then(products => {
		products = products.body;
		displayResults(SearchArray(products, query, "name"));
	});
}

function displayResults(products) {
	ctResults.innerHTML = "";

	if (products.length) {
		ctResults.appendChild(document.createElementWithContents("chip-list",
			products.map(product => document.createElementWithContents("chip-listitem",
			`
				<chip-card>
					<chip-cardheader>
						${product.name}
					</chip-cardheader>
				</chip-card>
			`))
		));
	} else {
		ctResults.appendChild(document.createElementWithContents("chip-emptyprompt", `Hmmm, we couldn't find anything matching '<span id="lblSearchTerm" class="fw-bold"></span>'. If you'd like, you can <chip-button variation="info-tertiary" id="btnReportMissing" button-style="inline">report the product missing</chip-button> and we'll do our best to get it in!`,
		{
			heading: "Nothing to see here",
			icon: "fal fa-store-slash",
			className: "mt-form--lg"
		}));

		lblSearchTerm.textContent = txtSearch.value;

		btnReportMissing.onclick = () => Dialog.ShowConfirmation(Localizer.CONFIRMATION_TITLE, `Are you sure you'd like to report a missing product? Your search of '${txtSearch.value}' will be used in the report.`)
			.then(proceed => {
				if (!proceed) { return; }
				autoReportMissing();
			});
	}
}

function autoReportMissing() {
	report("MISSING-PRODUCT", "Missing Product Report", `The following search term was made by a user and couldn't be matched with any products: ${txtSearch.value}`);
}

btnFeedback.onclick = () => Dialog.ShowCustom("Feedback", "Your feedback is valuable, let us know if you've run into any issues, or if there's something you'd like to see on the site!",
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
				validation-required="Please tell us a bit more so we understand your feedback."
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
