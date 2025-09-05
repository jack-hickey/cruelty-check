const query = Browser.GetURLParameter("q") ?? "";

if (query) {
	txtSearch.value = query;
	search();
}

function search() {
	Ajax.Get("products.json", {
		success: {
			ok: response => {
				displayResults(SearchArray(response.body, query, "name"));
			}
		}
	});
}

function displayResults(results) {
	console.log(results);
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
	}).then(() => Ajax.Post("report", {
		body: {
			type: drpType.value,
			title: "User Submitted Feedback",
			description: txtDetails.value
		},
		success: {
			ok: response => {
				Dialog.ShowSuccess("Feedback sent", "Thank you for your feedback! We really appreciate you helping us to improve.");
			}
		}
	}));
