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
