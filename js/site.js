const query = Browser.GetURLParameter("q") ?? "";

if (query) {
	txtSearch.value = query;
	search();
}

function search() {
	// do something
}
