class Brand {
	constructor(source) {
		this.ID = parseInt(source.ID) || 0;
		this.Name = source.Name ?? "";
		this.Level = parseInt(source.Level) ?? 0;
		this.BCorp = source.B_Corp === 1;
		this.ParentID = parseInt(source.Parent_ID) || 0;
		this.CrueltyFree = source.Cruelty_Free === 1;
		this.AnimalTesting = source.Animal_Testing === 1;
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
