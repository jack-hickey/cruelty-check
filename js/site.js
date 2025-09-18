document.querySelectorAll(".btn--feedback").forEach(button => Object.assign(button, {
	textContent: Localizer.FEEDBACK_BUTTON_LABEL,
	onclick: () => {
		Dialog.ShowCustom(Localizer.FEEDBACK_TITLE, Localizer.FEEDBACK_DESC,
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
		}
}));

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
		txtResultCaption.innerHTML = "";

		if (products.length) {
			displayResults(products);
		} else {
			resultsContainer.appendChild(document.createElementWithContents("chip-emptyprompt", Localizer.EMPTY_SEARCH_DESC,
			{
				heading: Localizer.EMPTY_SEARCH_TITLE,
				icon: "fal fa-cat",
				id: "epResults",
				className: "mt-form--lg"
			}));

			lblSearchTerm.textContent = query;
		}

		document.querySelectorAll(".btn--add-product").forEach(button => button.onclick = () => Product.add());
	});
}

function displayResults(products) {
	resultsContainer.addItems(products.map(product => buildResult(product)));

	txtResultCount.innerHTML = products.length !== 1
		? Localizer.SEARCH_RESULTS_TITLE.replace("{count}", `<span class="fw-bold">${products.length}</span>`)
		: Localizer.SEARCH_RESULT_TITLE;

	txtResultCaption.innerHTML = Localizer.SEARCH_RESULT_CAPTION;
}


Object.assign(window.txtSearch ?? {}, {
	onsuffixclick: () => search(),
	onkeyup: ev => {
		if (ev.key === "Enter") {
			search();
		}
	}
})

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
	let advisoryText = product.getAdvisories(),
		avoidanceTooltip = "";

	const result = document.createElementWithContents("chip-card",
		`
			<div class="d-flex flex-column h-100">
				<div class="pc--name gap-md">
					<chip-text
						weight="medium"
						size="h4">
						${product.Name}
					</chip-text>
					<chip-button
						flush
						class="btn--report-product ms-auto"
						button-style="icon"
						tooltip="${Localizer.REPORT_INCORRECT_BUTTON}"
						icon="far fa-flag"
						variation="body">
					</chip-button>
				</div>
				<chip-text class="mt-xs" variation="secondary">${product.Brand.Name}</chip-text>

				<div class="responsive-row gap-sm mt-md">
					${
						product.Vegan
							? `<chip-badge tooltip="Completely free of animal-derived ingredients" variation="theme-secondary" badge-style="pill">${Localizer.VEGAN_LABEL}</chip-badge>`
							: `<chip-badge tooltip="May contain animal-derived or ambiguous ingredients" variation="danger-secondary" badge-style="pill">${Localizer.NOT_VEGAN_LABEL}</chip-badge>`
					}

					${
						product.Brand.CrueltyFree
							? `<chip-badge tooltip="${product.Brand.Name} is a cruelty-free brand" badge-style="pill" variation="theme-secondary">${Localizer.CRUELTYFREE_LABEL}</chip-badge>`
							: ""
					}

					${
						product.FairTrade
							? `<chip-badge tooltip="This product is Fairtrade certified" badge-style="pill" variation="theme-secondary">${Localizer.FAIRTRADE_LABEL}</chip-badge>`
							: ""
					}

					${
						product.Brand.BCorp
							? `<chip-badge tooltip="${product.Brand.Name} is a B Corporation" badge-style="pill" variation="theme-secondary">${Localizer.BCORP_LABEL}</chip-badge>`
							: ""
					}
				</div>

				${
					advisoryText.length
						?
							`
								<chip-text
									class="mt-form"
									weight="medium"
									icon="fas fa-exclamation-triangle"
									icon-colour="warning">
									Advisories
								</chip-text>

								<div class="mt-sm">
									${advisoryText.trim()}
								</div>
							`
						:
							`
								<chip-emptyprompt
									size="sm"
									class="m-auto"
									icon="fas fa-paw"
									heading="Looks good!">
									Based on brand information, it doesn't look like there's anything to worry about, nice!
								</chip-emptyprompt>
							`
				}
			</div>
		`, {
			image: `/cdn-cgi/image/width=200,quality=80,format=auto/products/${product.Image}`,
			hideBlur: true
		});

	result.classList.add("cd--product");
	result.querySelector(".btn--report-product").onclick = () => product.reportIncorrect();

	return result;
}
