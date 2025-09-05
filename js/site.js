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

btnFeedback.onclick = () => Ajax.Post("report",
{
	body: {
		type: "bug",
		title: "ajax",
		description: "ajax worked"
	},
	success: {
		any: response => {
			console.log(response);
		}
	}
});
