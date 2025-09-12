class Brand {
	constructor(source) {
		this.Name = source.Brand;
		this.CrueltyFree = source.Cruelty_Free === 1;
		this.AnimalTesting = source.Animal_Testing === 1;

		this.ParentCompany = {
			Name: source.Parent_Brand,
			CrueltyFree: source.Parent_Cruelty_Free === 1,
			AnimalTesting: source.Parent_Animal_Testing === 1
		};
	}
}
