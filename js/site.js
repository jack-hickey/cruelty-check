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

	Product.search(query).then(products => {
		resultsContainer.innerHTML = "";
		txtResultCount.innerHTML = "";

		if (products.length) {
			displayResults(products);
		} else {
			resultsContainer.appendChild(document.createElementWithContents("chip-emptyprompt", Localizer.EMPTY_SEARCH_DESC,
			{
				heading: Localizer.EMPTY_SEARCH_TITLE,
				icon: "fal fa-store-slash",
				className: "mt-form--lg"
			}));

			lblSearchTerm.textContent = query;
			btnReportMissing.onclick = () => Product.add();
		}
	});
}

function displayResults(products) {
	resultsContainer.addItems(products.map(product => buildResult(product)));

	txtResultCount.innerHTML = products.length !== 1
		? Localizer.SEARCH_RESULTS_TITLE.replace("{count}", `<span class="fw-bold">${products.length}</span>`)
		: Localizer.SEARCH_RESULT_TITLE;
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
	let avoidanceReasons = [],
		avoidanceTooltip = "";

	if (product.Brand.CrueltyFree && !product.Brand.ParentCompany.CrueltyFree) { avoidanceReasons.push(Localizer.SUPPORTS_NON_CRUELTYFREE); }
	if (product.Brand.ParentCompany.AnimalTesting) { avoidanceReasons.push(Localizer.PARENT_ANIMAL_TESTING); }

	if (avoidanceReasons.length) {
		avoidanceTooltip = `${product.Brand.ParentCompany.Name} ${avoidanceReasons.join(" and ")}.`;
	}

	const result = document.createElementWithContents("chip-card",
		`
			<div class="h-align mt-card mb-xs">
				<chip-text class="me-auto" variation="secondary">${product.Brand.Name}</chip-text>
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
						product.Vegan
							? `<chip-text icon-colour="success" icon="fas fa-fw fa-check-circle">${Localizer.VEGAN_LABEL}</chip-text>`
							: `<chip-text icon-colour="danger" icon="fas fa-fw fa-times-circle">${Localizer.NOT_VEGAN_LABEL}</chip-text>`
					}
				</chip-listitem>

				${
					product.Brand.CrueltyFree
						? `<chip-listitem><chip-text icon-colour="success" icon="fas fa-fw fa-check-circle">${Localizer.CRUELTYFREE_LABEL}</chip-text></chip-listitem>`
						: ""
				}

				${
					product.Brand.AnimalTesting
						? `<chip-listitem><chip-text icon-colour="danger" icon="fas fa-fw fa-times-circle">${Localizer.ANIMAL_TESTING_LABEL.replace("{brand}", product.Brand.Name)}</chip-text></chip-listitem>`
						: ""
				}

				${
					avoidanceTooltip
						?
							`
								<chip-listitem>
									<div class="h-align gap-sm">
										<chip-text icon-colour="warning" icon="fas fa-fw fa-exclamation-triangle">
											${Localizer.OWNED_BY_LABEL.replace("{brand}", product.Brand.ParentCompany.Name)}
										</chip-text>

										<chip-icon
											tooltip="${avoidanceTooltip}"
											icon="far fa-question-circle">
										</chip-icon>
									</div>
								</chip-listitem>
							`
						: ""
				}
			</chip-list>
		`, {
			image: `/products/${product.Image}`,
			hideBlur: true
		});

	result.classList.add("cd--product");
	result.querySelector(".btn--report-product").onclick = () => product.reportIncorrect();

	return result;
}
