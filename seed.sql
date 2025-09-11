INSERT OR REPLACE INTO Products (ID, Name, Brand_ID, Is_Vegan, Image) VALUES (1, 'Intensive Repair Shampoo', 2, 1, '38757213.png.avif');
INSERT OR REPLACE INTO Products (ID, Name, Brand_ID, Is_Vegan, Image) VALUES (2, 'Filtered Fresh Semi Skimmed Milk', 4, 0, 'ee6600e1-ee2e-4ffb-9ad7-9b1dc2bd6974_476587947.avif');

INSERT OR REPLACE INTO Brands(ID, Name, Parent_ID, Cruelty_Free, B_Corp, Fair_Trade) VALUES (1, 'Unilever', 0, 0, 0, 0);
INSERT OR REPLACE INTO Brands(ID, Name, Parent_ID, Cruelty_Free, B_Corp, Fair_Trade) VALUES (2, 'Dove', 1, 1, 0, 0);
INSERT OR REPLACE INTO Brands (ID, Name, Parent_ID, Cruelty_Free, B_Corp, Fair_Trade) VALUES (3, 'Arla Foods', 0, 0, 0, 0);
INSERT OR REPLACE INTO Brands (ID, Name, Parent_ID, Cruelty_Free, B_Corp, Fair_Trade) VALUES (4, 'Cravendale', 3, 0, 0, 0);
