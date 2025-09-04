const query = Browser.GetURLParameter("q") ?? "";

if (query) {
	txtSearch.value = query;
	search();
}

function search() {
	Ajax.Get("products.json", {
		success: {
			ok: response => {
				const results = SearchArray(response.body, query, "name");
			}
		}
	});
}
