const collections = [
	{
		name: "SOKOS ART",
		symbol: "SOKOS TOKEN",
		displayName: "Art"
	},{
		name: "SOKOS SPORTS TOKENS",
		symbol: "SOKOS TOKEN V1",
		displayName: "Sports"
	},{
		name: "SOKOS COLLECTIBLES",
		symbol: "SOKOS TOKEN V2",
		displayName: "Collectibles"
	},{
		name: "SOKOS CHARACTERS",
		symbol: "SOKOS TOKEN V3",
		displayName: "Characters"
	},{
		name: "SOKOS CHARACTERS1",
		symbol: "SOKOS TOKEN V4",
		displayName: "Characters1"
	}
];
const { assert, expect } = require("chai");
const { deployDiamond } = require('../../../scripts/deploy.js')
const { BigNumber} = require("ethers");

describe("CollectionManagerFacet", async () => {

	let SokosAddressRegistryContract;
	let diamondAddress
	let collectionManagerFacet
	let ownershipFacet
	let tx
	let receipt
	let result
	let accounts
	let AddressRegistry
	let payToken
	let SokosMarketplaceContract
	let mockFeed
	let owner, feeReceipient, feeReceipient2, owner2;
	console.log("here")

	before(async () => {
		accounts = await ethers.getSigners();
		[owner, hacker, feeReceipient2, owner2] = accounts;
		diamondAddress = await deployDiamond()
		const MockFeed = await ethers.getContractFactory("MockFeed");
		mockFeed = await MockFeed.deploy();
		collectionManagerFacet = await ethers.getContractAt('CollectionManagerFacet', diamondAddress)
		ownershipFacet = await ethers.getContractAt('OwnershipFacet', diamondAddress)
		const PayToken = await ethers.getContractFactory("BEP20Token")
		payToken = await PayToken.deploy("USDT", "STABLE COIN", 18, BigNumber.from("10000000000000000000"));
	});

	it("Only deployer should be able to create collection", async () => { 
        console.log("Creating collection with deployer", owner.address);
		const prevCollections = await collectionManagerFacet.getCollectionsLength();
		await collectionManagerFacet.createCollection(collections[0].name, collections[0].symbol, collections[0].displayName, true);
		const newCollections = await collectionManagerFacet.getCollectionsLength();
		assert.notEqual(prevCollections.toString(), newCollections.toString());

		const addedCollection = await collectionManagerFacet.collections(Number(newCollections).toString()-1);
		assert.equal(addedCollection._name, collections[0].name);
		assert.equal(addedCollection._displayName, collections[0].displayName);
        
        console.log("Creating collection with hacker's address", hacker.address);
        reciept = collectionManagerFacet.connect(hacker).createCollection(
            collections[1].name, 
            collections[1].symbol, 
            collections[1].displayName,
			true,
            );
			await expect(reciept).to.be.revertedWith("LibDiamond: Must be contract owner");
        const collectionsLength = await collectionManagerFacet.getCollectionsLength();
        assert.equal(collectionsLength.toString(), newCollections.toString());
	});

    it("Should give error for duplicate collections name", async () => { 
        console.log("Creating collection with deployer");
		const prevCollections = await collectionManagerFacet.getCollectionsLength();
		await collectionManagerFacet.createCollection(collections[1].name, collections[1].symbol, collections[1].displayName, true);
		const newCollections = await collectionManagerFacet.getCollectionsLength();
		assert.notEqual(prevCollections.toString(), newCollections.toString());

		const addedCollection = await collectionManagerFacet.collections(Number(newCollections).toString()-1);
		assert.equal(addedCollection._name, collections[1].name);
		assert.equal(addedCollection._displayName, collections[1].displayName);
        
        console.log("Creating another collection");
        const reciept = collectionManagerFacet.connect(owner).createCollection(
            collections[1].name, 
            collections[1].symbol, 
            collections[1].displayName,
			true
        );
        await expect(reciept).to.be.revertedWith("Registry: Duplicate collection name");
        const collectionsLength = await collectionManagerFacet.getCollectionsLength();
        assert.equal(collectionsLength.toString(), newCollections.toString());
	});

    it("Should give error for duplicate collections display name", async () => { 
        console.log("Creating collection with deployer");
		const prevCollections = await collectionManagerFacet.getCollectionsLength();
		await collectionManagerFacet.createCollection(collections[2].name, collections[2].symbol, collections[2].displayName, true);
		const newCollections = await collectionManagerFacet.getCollectionsLength();
		assert.notEqual(prevCollections.toString(), newCollections.toString());

		const addedCollection = await collectionManagerFacet.collections(Number(newCollections).toString()-1);
		assert.equal(addedCollection._name, collections[2].name);
		assert.equal(addedCollection._displayName, collections[2].displayName);
        
        console.log("Creating another collection");
        const reciept = collectionManagerFacet.createCollection(
            collections[3].name, 
            collections[2].symbol, 
            collections[2].displayName,
			true
        );
        await expect(reciept).to.be.revertedWith("Registry: Duplicate collection display name");
        const collectionsLength = await collectionManagerFacet.getCollectionsLength();
        assert.equal(collectionsLength.toString(), newCollections.toString());
	});

    it("Only owner should be able to remove a collection", async () => { 
        console.log("Creating collection with deployer");
		let initialCollectionLength = await collectionManagerFacet.getCollectionsLength();
		await collectionManagerFacet.createCollection(collections[3].name, collections[3].symbol, collections[3].displayName, true);
		let collectionLengthAfter1Create = await collectionManagerFacet.getCollectionsLength();
		assert.notEqual(initialCollectionLength.toString(), collectionLengthAfter1Create.toString());

		let addedCollection1 = await collectionManagerFacet.collections(Number(collectionLengthAfter1Create.toString()) -1);
		assert.equal(addedCollection1._name, collections[3].name);
		assert.equal(addedCollection1._displayName, collections[3].displayName);

        console.log("Creating another collection with deployer");
		await collectionManagerFacet.createCollection(collections[4].name, collections[4].symbol, collections[4].displayName, true);
		let collectionLengthAfter2Create = await collectionManagerFacet.getCollectionsLength();
		assert.notEqual(collectionLengthAfter1Create.toString(), collectionLengthAfter2Create.toString());

		let addedCollection2 = await collectionManagerFacet.collections(Number(collectionLengthAfter2Create.toString())-1);
		assert.equal(addedCollection2._name, collections[4].name);
		assert.equal(addedCollection2._displayName, collections[4].displayName);
        
        console.log("Removing a collection with deployer's account");
        await collectionManagerFacet.removeCollection(addedCollection1._name, addedCollection1._address);
        const collectionsLengthAfterRemove = await collectionManagerFacet.getCollectionsLength();
        assert.equal(Number(collectionLengthAfter1Create.toString()), Number(collectionsLengthAfterRemove.toString()));

        console.log("Removing a collection with hackers's account");
        const revertReciept = collectionManagerFacet.connect(hacker).removeCollection(addedCollection2._name, addedCollection2._address);
        await expect(revertReciept).to.be.revertedWith("LibDiamond: Must be contract owner");
        const newLengthAfterHacker = await collectionManagerFacet.getCollectionsLength();
        assert.equal(Number(newLengthAfterHacker.toString()), Number(collectionsLengthAfterRemove.toString()));
	});

	it("should give false for non sokos NFT", async () => {
		const isSokosNFT = await collectionManagerFacet.isSokosNFT(owner.address);
		assert.isFalse(isSokosNFT);
	});

	it("Only owner should be able to remove a collection", async () => { 
        console.log("Creating collection with deployer");
		let initialCollectionLength = await collectionManagerFacet.connect(owner).getCollectionsLength();
		await collectionManagerFacet.createCollection(collections[3].name+3, collections[3].symbol+3, collections[3].displayName+3, true);
		let collectionLengthAfter1Create = await collectionManagerFacet.getCollectionsLength();
		assert.notEqual(initialCollectionLength.toString(), collectionLengthAfter1Create.toString());

		let addedCollection1 = await collectionManagerFacet.collections(Number(collectionLengthAfter1Create.toString()) -1);
		assert.equal(addedCollection1._name, collections[3].name+3);
		assert.equal(addedCollection1._displayName, collections[3].displayName+3);

        console.log("Creating another collection with deployer");
		await collectionManagerFacet.createCollection(collections[4].name+4, collections[4].symbol+4, collections[4].displayName+4, true);
		let collectionLengthAfter2Create = await collectionManagerFacet.getCollectionsLength();
		assert.notEqual(collectionLengthAfter1Create.toString(), collectionLengthAfter2Create.toString());

		let addedCollection2 = await collectionManagerFacet.collections(Number(collectionLengthAfter2Create.toString())-1);
		assert.equal(addedCollection2._name, collections[4].name+4);
		assert.equal(addedCollection2._displayName, collections[4].displayName+4);
        
        console.log("Removing a collection with deployer's account");
        await collectionManagerFacet.removeCollection(addedCollection1._name, addedCollection1._address);
        const collectionsLengthAfterRemove = await collectionManagerFacet.getCollectionsLength();
        assert.equal(Number(collectionLengthAfter1Create.toString()), Number(collectionsLengthAfterRemove.toString()));

        console.log("Removing a collection with hackers's account");
        const revertReciept = collectionManagerFacet.connect(hacker).removeCollection(addedCollection2._name, addedCollection2._address);
        await expect(revertReciept).to.be.revertedWith("LibDiamond: Must be contract owner");
        const newLengthAfterHacker = await collectionManagerFacet.getCollectionsLength();
        assert.equal(Number(newLengthAfterHacker.toString()), Number(collectionsLengthAfterRemove.toString()));
	});
});
