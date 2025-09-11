btnFeedback.textContent = Localizer.FEEDBACK_BUTTON_LABEL;

const resultsContainer = document.getElementById("ctResults");

function resetMobileView() {
	txtSearch.blur();
}

function search() {
	const query = txtSearch.value.trim();
	if (!query) { return; }

	resultsContainer.innerHTML = `<chip-loading class="d-flex m-auto mt-form--lg" size="xl"></chip-loading>`;
	txtSearch.blur();	

	Ajax.Post("search", {
		body: {
			query
		},
		LoadTimeout: 0,
		success: {
			ok: response => {
				const products = response.body;

				products.forEach(product => {
					product._search = `${product.Brand} ${product.Name}`;
				});

				displayResults(SearchArray(products, query, "_search"));
			},
			any: response => {
				if (!response.ok) {
					report("ERROR", "Application Error", `Search function yielded the following result:\n>${response.content}`, true);
				}
			}
		}
	});
}

function displayResults(products) {
	resultsContainer.innerHTML = "";
	txtResultCount.innerHTML = "";

	if (products.length) {
		resultsContainer.addItems(products.map(product => buildResult(product)));
		txtResultCount.innerHTML = products.length !== 1
			? Localizer.SEARCH_RESULTS_TITLE.replace("{count}", `<span class="fw-bold">${products.length}</span>`)
			: Localizer.SEARCH_RESULT_TITLE;
	} else {
		resultsContainer.appendChild(document.createElementWithContents("chip-emptyprompt", Localizer.EMPTY_SEARCH_DESC,
		{
			heading: Localizer.EMPTY_SEARCH_TITLE,
			icon: "fal fa-store-slash",
			className: "mt-form--lg"
		}));

		const searchUsed = txtSearch.value;

		lblSearchTerm.textContent = searchUsed;

		btnReportMissing.onclick = () => Dialog.ShowTextBox(Localizer.MISSING_PRODUCT_TITLE, Localizer.MISSING_PRODUCT_DESC, {
			DefaultValue: searchUsed
		})
			.then(value => autoReportMissing(value));
	}
}

function autoReportMissing(product) {
	report("MISSING-PRODUCT", "Missing Product Report", `Using the built in feedback feature, a user has reported the following product as missing:\n>${product}`);
}

btnFeedback.onclick = () => Dialog.ShowCustom(Localizer.FEEDBACK_TITLE, Localizer.FEEDBACK_DESC,
	`
		<chip-form>
			<chip-dropdown
				label="${Localizer.FEEDBACK_TYPE_LABEL}"
				required
				id="drpType"
				text="${Localizer.FEEDBACK_TYPE_PLACEHOLDER}">

				<chip-dropdownitem group="${Localizer.FEEDBACK_BUG_GROUP}" value="BUG">${Localizer.FEEDBACK_BUG_LABEL}</chip-dropdownitem>
				<chip-dropdownitem group="${Localizer.FEEDBACK_BUG_GROUP}" value="MISSING-PRODUCT">${Localizer.FEEDBACK_MISSING_PRODUCT_LABEL}</chip-dropdownitem>
				<chip-dropdownitem group="${Localizer.FEEDBACK_BUG_GROUP}" value="INCORRECT-INFO">${Localizer.FEEDBACK_INCORRECT_INFORMATION_LABEL}</chip-dropdownitem>
				<chip-dropdownitem group="${Localizer.FEEDBACK_IMPROVEMENT_GROUP}" value="FEATURE">${Localizer.FEEDBACK_FEATURE_LABEL}</chip-dropdownitem>
				<chip-dropdownitem group="${Localizer.FEEDBACK_IMPROVEMENT_GROUP}" value="IMPROVEMENT">${Localizer.FEEDBACK_IMPROVEMENT_LABEL}</chip-dropdownitem>
				<chip-dropdownitem group="${Localizer.FEEDBACK_CHAT_GROUP}" value="THANKS">${Localizer.FEEDBACK_THANKS_LABEL}</chip-dropdownitem>
			</chip-dropdown>

			<chip-textarea
				rows="12"
				required
				id="txtDetails"
				validation-required="${Localizer.FEEDBACK_DETAILS_VALIDATION_REQUIRED}"
				class="mt-form"
				label="${Localizer.FEEDBACK_DETAILS_LABEL}">
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

txtSearch.onsuffixclick = () => search();

txtSearch.onkeyup = ev => {
	if (ev.key === "Enter") {
		search();
	}
}

function report(type, title, description, suppressMessage) { 
	Ajax.Post("report", {
		body: {
			type,
			title,
			description
		},
		success: {
			ok: response => {
				if (!suppressMessage) {
					Dialog.ShowSuccess(Localizer.FEEDBACK_SUCCESS_TITLE, Localizer.FEEDBACK_SUCCESS_DESC);
				}
			}
		}
	});
}

function buildResult(product) {
	const result = document.createElementWithContents("chip-card",
		`
			<div class="h-align mt-card mb-xs">
				<chip-text class="me-auto" variation="secondary">${product.Brand}</chip-text>
				<chip-button
					flush
					class="btn--report-product"
					button-style="icon"
					tooltip="${Localizer.REPORT_INCORRECT_BUTTON}"
					icon="fas fa-flag"
					variation="danger-tertiary">
				</chip-button>
			</div>
			<chip-text class="mb-form" weight="medium" size="h4">${product.Name}</chip-text>

			<chip-list gap="sm">
				<chip-listitem>
					${
						product.Is_Vegan
							? `<chip-text icon-colour="success" icon="fas fa-check-circle">${Localizer.VEGAN_LABEL}</chip-text>`
							: `<chip-text icon-colour="danger" icon="fas fa-times-circle">${Localizer.NOT_VEGAN_LABEL}</chip-text>`
					}
				</chip-listitem>
				<chip-listitem>
					${
						product.Cruelty_Free
							? `<chip-text icon-colour="success" icon="fas fa-check-circle">${Localizer.CRUELTYFREE_LABEL}</chip-text>`
							: `<chip-text icon-colour="danger" icon="fas fa-times-circle">${Localizer.NOT_CRUELTYFREE_LABEL}</chip-text>`
					}
				</chip-listitem>
			</chip-list>

			${
				!product.info
					? ""
					: `<chip-accordionitem class="mt-form ai--view-info" heading="${Localizer.VIEW_INFO_LABEL}">${product.info}</chip-accordionitem>`
			}
		`, {
			image: `images/${product.Image}`,
			hideBlur: true
		});

	result.classList.add("cd--product");

	result.querySelector(".btn--report-product").onclick = () => {
		Dialog.ShowTextBox(Localizer.INCORRECT_INFORMATION_TITLE, Localizer.INCORRECT_INFORMATION_DESC, {
			Rows: 12,
			Multiline:true
		}).then(value => {
			report("INCORRECT-INFO", "Incorrect Product Information", `Using the built in feedback feature, a user has reported that **${product.name}** by **${product.brand}** has incorrect information, stating:\n>${value}`);
		});
	};

	return result;
}
