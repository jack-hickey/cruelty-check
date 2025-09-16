class Brand {
	constructor(source) {
		this.ID = 0;
		this.Name = source.Brand;
		this.CrueltyFree = source.Cruelty_Free === 1;
		this.AnimalTesting = source.Animal_Testing === 1;

		this.ParentCompany = {
			Name: source.Parent_Brand,
			CrueltyFree: source.Parent_Cruelty_Free === 1,
			AnimalTesting: source.Parent_Animal_Testing === 1
		};
	}

	static getAll(query) {
		return new Promise(resolve => Ajax.Post("brands", {
			body: {
				query
			},
			success: {
				ok: response => {
					resolve(response.body.map(result => Object.assign(new Brand({}), {
						Name: result.Name,
						ID: result.ID
					})));
				},
				any: response => {
					if (!response.ok) { resolve([]); }
				}
			}
		}));
	}
}
