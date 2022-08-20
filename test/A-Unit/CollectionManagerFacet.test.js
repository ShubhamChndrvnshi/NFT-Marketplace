// const { deployDiamond } = require('../../scripts/deploy.js')
// const collections = [
// 	{
// 		name: "SOKOS ART",
// 		symbol: "SOKOS TOKEN V3",
// 		displayName: "Art"
// 	}, {
// 		name: "SOKOS SPORTS TOKENS",
// 		symbol: "SOKOS TOKEN V3",
// 		displayName: "Sports"
// 	}, {
// 		name: "SOKOS COLLECTIBLES",
// 		symbol: "SOKOS TOKEN V3",
// 		displayName: "Collectibles"
// 	}, {
// 		name: "SOKOS CHARACTERS",
// 		symbol: "SOKOS TOKEN V3",
// 		displayName: "Characters"
// 	},
// ];

// const { assert } = require("chai");

// contract("CollectionManagerFacet", async (accounts) => {

// 	let SokosAddressRegistryContract;
// 	let diamondAddress
// 	let collectionManagerFacet
// 	let diamondLoupeFacet
// 	let ownershipFacet
// 	let tx
// 	let receipt
// 	let result
// 	const addresses = []

// 	before(async function () {
// 		diamondAddress = await deployDiamond()
// 		collectionManagerFacet = await ethers.getContractAt('CollectionManagerFacet', diamondAddress)
// 		adminAddress = accounts[0];
// 	});

// 	it("should be able to create a new collection and verify", async () => {
// 		const prevCollections = await collectionManagerFacet.getCollectionsLength();
// 		await collectionManagerFacet.createCollection(collections[0].name, collections[0].symbol, collections[0].displayName, true);
// 		const newCollections = await collectionManagerFacet.getCollectionsLength();
// 		assert.notEqual(prevCollections.toString(), newCollections.toString());

// 		const addedCollection = await collectionManagerFacet.collections(Number(newCollections).toString() - 1);
// 		assert.equal(addedCollection._name, collections[0].name);
// 		assert.equal(addedCollection._displayName, collections[0].displayName);
// 	});

// 	it("should be able deploy and verify using isSokosNFT method", async () => {
// 		const prevCollections = await collectionManagerFacet.getCollectionsLength();
// 		await collectionManagerFacet.createCollection(collections[1].name, collections[1].symbol+"i", collections[1].displayName, true);
// 		const newCollections = await collectionManagerFacet.getCollectionsLength();
// 		assert.notEqual(prevCollections.toString(), newCollections.toString());

// 		const addedCollection = await collectionManagerFacet.collections(Number(newCollections).toString() - 1);
// 		assert.equal(addedCollection._name, collections[1].name);
// 		assert.equal(addedCollection._displayName, collections[1].displayName);

// 		const isSokosNFT = await collectionManagerFacet.isSokosNFT(addedCollection._address);
// 		assert.isTrue(isSokosNFT);
// 	});
// });
