const collections = [
	{
		name: "SOKOS ART",
		symbol: "SOKOS TOKEN V",
		displayName: "Art"
	}, {
		name: "SOKOS SPORTS TOKENS",
		symbol: "SOKOS TOKEN V1",
		displayName: "Sports"
	}, {
		name: "SOKOS COLLECTIBLES",
		symbol: "SOKOS TOKEN V2",
		displayName: "Collectibles"
	}, {
		name: "SOKOS CHARACTERS",
		symbol: "SOKOS TOKEN V3",
		displayName: "Characters"
	},
];
// const expectedBlockTime = 1000;
// const sleep = (milliseconds) => {
// 	return new Promise(resolve => setTimeout(resolve, milliseconds));
// };
const { assert, expect } = require("chai");
const { deployDiamond } = require('../../scripts/deploy.js')
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const { getEventData } = require("../testHelpers.js");

// const ROYALTY_BPS_POINTS = 700;
const MetaDataBytesURIForArts = "0x697066733a2f2f516d61614d7a67555a6f51776e6d5862336d65763567664c4c70394e4675486777527535384233475165797a7538";
const MetaDataBytesURIForCollectibles = "0x697066733a2f2f516d536179793334425343686f334d69636d715863487253423952325970484231736b4d464b397971615a6d7533";
const MetaDataBytesURIForCharacters = "0x697066733a2f2f516d64686d616e5054754a4b794e516839583936536e44364b664e34364b41593755576f4143316f734b6b714779";


describe("Admin should mint different types of tokens and list those into marketplace 1", async () => {

	let sportsCollectionAddress,
		collectiblesCollectionAddress,
		charactersCollectionAddress;

	let PayToken;
	let marketplaceManager;
	let collectionManagerFacet;
	let diamondAddress
	let nftManager
	let listingManager
	let auctionFacet
	let receipt
	let event
	let accounts
	let mockFeed
	let adminAddress, userAddress2, royaltyRecipient;
	let idOfTheMintedToken
	let idOfBiddableToken
	let ListingIdOfBiddableToken
	let ListingIdOfBiddableToken1
	let supplyCountOfTheMintedToken
	let artCollectionAddress

	before(async function () {

		diamondAddress = await deployDiamond()
		accounts = await ethers.getSigners();
		[adminAddress, userAddress2, royaltyRecipient] = accounts;
		const MockFeed = await ethers.getContractFactory("MockFeed");
		mockFeed = await MockFeed.deploy();
		listingManager = await ethers.getContractAt("ListingManager", diamondAddress);
		marketplaceManager = await ethers.getContractAt("MarketplaceManager", diamondAddress);
		nftManager = await ethers.getContractAt("NftManager", diamondAddress);
		auctionFacet = await ethers.getContractAt("AuctionFacet", diamondAddress);
		collectionManagerFacet = await ethers.getContractAt('CollectionManagerFacet', diamondAddress)
		const payToken = await ethers.getContractFactory("BEP20Token")
		PayToken = await payToken.deploy("USDT", "STABLE COIN", 18, BigNumber.from("10000000000000000000"));


		await PayToken.transfer(userAddress2.address, BigNumber.from("50000000000000000000"));
	});

	it("should be able to create a new art collection", async function () {
		receipt = collectionManagerFacet.createCollection(
			collections[0].name,
			collections[0].symbol,
			collections[0].displayName,
			true);

		await expect(receipt).emit(collectionManagerFacet, "CollectionAdd");
		receipt = await receipt;
		receipt = await receipt.wait()
		event = getEventData(collectionManagerFacet, receipt, "CollectionAdd")
		artCollectionAddress = event.collection;
	});

	it("should be able to create a new Sports collection", async function () {
		receipt = collectionManagerFacet.createCollection(
			collections[1].name,
			collections[1].symbol,
			collections[1].displayName,
			true);

		await expect(receipt).emit(collectionManagerFacet, "CollectionAdd");
		receipt = await receipt;
		receipt = await receipt.wait()
		event = getEventData(collectionManagerFacet, receipt, "CollectionAdd")
		sportsCollectionAddress = event.collection;
	});

	it("should be able to create a new Collectibles collection", async function () {
		receipt = collectionManagerFacet.createCollection(
			collections[2].name,
			collections[2].symbol,
			collections[2].displayName,
			true);

		await expect(receipt).emit(collectionManagerFacet, "CollectionAdd");
		receipt = await receipt;
		receipt = await receipt.wait()
		event = getEventData(collectionManagerFacet, receipt, "CollectionAdd")
		collectiblesCollectionAddress = event.collection;
	});

	it("should be able to create a new Characters collection", async function () {
		receipt = collectionManagerFacet.createCollection(
			collections[3].name,
			collections[3].symbol,
			collections[3].displayName,
			true);

		await expect(receipt).emit(collectionManagerFacet, "CollectionAdd");
		receipt = await receipt;
		receipt = await receipt.wait()
		event = getEventData(collectionManagerFacet, receipt, "CollectionAdd")
		charactersCollectionAddress = event.collection;
	});

	it("should be able to list newly created Tokens of a collection", async function () {
		const collection = await collectionManagerFacet.collections("0");
		console.log("Minting NFT for collection", collection._displayName);
		const NFT = await ethers.getContractAt("SokosCollection", collection._address);
		artCollectionAddress = collection._address;
		console.log("Minting...");
		receipt = nftManager.mintSokosTradables(
			collection._address,
			10,
			MetaDataBytesURIForArts,
			royaltyRecipient.address,
			100
		);

		await expect(receipt).emit(nftManager, "TokenMint");
		receipt = await receipt;
		receipt = await receipt.wait()
		event = getEventData(nftManager, receipt, "TokenMint")
		idOfTheMintedToken = event.id.toString();
		supplyCountOfTheMintedToken = event.supply.toString();

		console.log("Approve marketplace to spend token on behalf of user");
		await NFT.setApprovalForAll(diamondAddress, true);
		console.log("Listing NFT to marketplace");
		receipt = listingManager.CreateListing(
			collection._address,
			idOfTheMintedToken,
			supplyCountOfTheMintedToken,
			22,
			Math.floor(new Date().getTime() / 1000),
			Math.floor(new Date().getTime() / 1000)
		);
		await expect(receipt).emit(listingManager, "ListingCreated");
		receipt = await receipt;
		receipt = await receipt.wait()
		event = getEventData(listingManager, receipt, "ListingCreated")
		ListingIdOfBiddableToken = event.itemId.toString();
	});

	it("should set the platform fee as 0", async function () {
		//    const currentPlatformMintFee = await SokosMarketplaceContract.mintFee();

		// In unit test case setting the platform fee to be a non zero value, so set back to 0
		await marketplaceManager.updatePlatformMintFee(0);

		// Platform fee will be 0 here
		const laterPlatformMintFee = await marketplaceManager.mintFee();
		assert.equal(laterPlatformMintFee.toString(), "0");
	});

	it("should mint a ArtsFactory token - Multiple Supply - Semi Fungible Tokens with royalty information, list into marketplace by Admin Only", async function () {

		const supply = 10;
		const price = 20;
		const NFT = await ethers.getContractAt("SokosCollection", artCollectionAddress);
		const FT_INDEX = await NFT.tokenCounter();
		const bidTime = new Date(new Date().getTime() + 10000).getTime();

		receipt = nftManager.mintSokosTradables(
			artCollectionAddress,
			supply,
			MetaDataBytesURIForArts,
			adminAddress.address,
			20)

		await expect(receipt).emit(nftManager, "TokenMint");
		receipt = await receipt;
		receipt = await receipt.wait()
		event = getEventData(nftManager, receipt, "TokenMint")
		expect(adminAddress.address).to.be.equal(event.beneficiary)
		expect(artCollectionAddress).to.be.equal(event.nft)
		expect(FT_INDEX.toString()).to.be.equal(event.id.toString())
		expect(`${supply}`).to.be.equal(event.supply.toString())
		expect(MetaDataBytesURIForArts).to.be.equal(event.metaData)

		// let balanceOfSender = await NFT.balanceOf(adminAddress, FT_INDEX);
		receipt = NFT.setApprovalForAll(diamondAddress, true);

		await expect(receipt).emit(NFT, "ApprovalForAll");


		receipt = await listingManager.CreateListing(
			artCollectionAddress,
			FT_INDEX,
			supply,
			price,
			new Date().getTime(),
			Math.floor(new Date().getTime() / 1000)
		);

		await expect(receipt).emit(listingManager, "ListingCreated");
		receipt = await receipt;
		receipt = await receipt.wait()
		event = getEventData(listingManager, receipt, "ListingCreated")
		expect(adminAddress.address).to.be.equal(event.owner)
		expect(artCollectionAddress).to.be.equal(event.nft)
		expect(FT_INDEX.toString()).to.be.equal(event.tokenId.toString())
		expect(`${supply}`).to.be.equal(event.quantity.toString())
		expect(price.toString()).to.be.equal(event.price.toString())
	});

	it("should mint a ArtsFactory token - Single Supply - Non Fungible Token with royalty information, list into marketplace by Admin Only", async function () {

		const supply = 1;
		const price = 200;
		const NFT = await ethers.getContractAt("SokosCollection", artCollectionAddress);
		const NFT_INDEX = await NFT.tokenCounter();
		const bidTime = new Date(new Date().getTime() + 10000).getTime();

		receipt = nftManager.mintSokosTradables(
			artCollectionAddress,
			supply,
			MetaDataBytesURIForArts,
			adminAddress.address,
			20);

		await expect(receipt).emit(nftManager, "TokenMint");
		receipt = await receipt;
		receipt = await receipt.wait()
		event = getEventData(nftManager, receipt, "TokenMint")
		expect(adminAddress.address).to.be.equal(event.beneficiary)
		expect(artCollectionAddress).to.be.equal(event.nft)
		expect(NFT_INDEX.toString()).to.be.equal(event.id.toString())
		expect(`${supply}`).to.be.equal(event.supply.toString())
		expect(MetaDataBytesURIForArts).to.be.equal(event.metaData)


		// let balanceOfSender = await NFT.balanceOf(adminAddress, NFT_INDEX);

		receipt = await NFT.setApprovalForAll(diamondAddress, true);
		await expect(receipt).emit(NFT, "ApprovalForAll");


		receipt = listingManager.CreateListing(
			artCollectionAddress,
			NFT_INDEX,
			supply,
			price,
			new Date().getTime(),
			bidTime
		);

		await expect(receipt).emit(listingManager, "ListingCreated");
		receipt = await receipt;
		receipt = await receipt.wait()
		event = getEventData(listingManager, receipt, "ListingCreated")
		expect(adminAddress.address).to.be.equal(event.owner)
		expect(artCollectionAddress).to.be.equal(event.nft)
		expect(NFT_INDEX.toString()).to.be.equal(event.tokenId.toString())
		expect(`${supply}`).to.be.equal(event.quantity.toString())
		expect(price.toString()).to.be.equal(event.price.toString())
	});

	it("should mint a CollectiblesFactory token - Multiple Supply - Semi Fungible Tokens with Royalty Information, list into marketplace by Admin Only", async function () {
		const supply = 11;
		const price = 21;
		const NFT = await ethers.getContractAt("SokosCollection", collectiblesCollectionAddress);
		const FT_INDEX = await NFT.tokenCounter();
		const bidTime = new Date(new Date().getTime() + 10000).getTime();

		receipt = nftManager.mintSokosTradables(
			collectiblesCollectionAddress,
			supply,
			MetaDataBytesURIForCollectibles,
			adminAddress.address,
			20);

		await expect(receipt).emit(nftManager, "TokenMint");
		receipt = await receipt;
		receipt = await receipt.wait()
		event = getEventData(nftManager, receipt, "TokenMint")
		expect(adminAddress.address).to.be.equal(event.beneficiary)
		expect(collectiblesCollectionAddress).to.be.equal(event.nft)
		expect(FT_INDEX.toString()).to.be.equal(event.id.toString())
		expect(`${supply}`).to.be.equal(event.supply.toString())
		expect(MetaDataBytesURIForCollectibles).to.be.equal(event.metaData)


		// let balanceOfSender = await NFT.balanceOf(adminAddress, FT_INDEX);

		receipt = await NFT.setApprovalForAll(diamondAddress, true);
		await expect(receipt).emit(NFT, "ApprovalForAll");


		receipt = listingManager.CreateListing(
			collectiblesCollectionAddress,
			FT_INDEX,
			supply,
			price,
			new Date().getTime(),
			Math.floor(new Date().getTime() / 1000)
		);

		await expect(receipt).emit(listingManager, "ListingCreated");
		receipt = await receipt;
		receipt = await receipt.wait()
		event = getEventData(listingManager, receipt, "ListingCreated")
		expect(adminAddress.address).to.be.equal(event.owner)
		expect(collectiblesCollectionAddress).to.be.equal(event.nft)
		expect(FT_INDEX.toString()).to.be.equal(event.tokenId.toString())
		expect(`${supply}`).to.be.equal(event.quantity.toString())
		expect(price.toString()).to.be.equal(event.price.toString())
	});

	it("should mint a CollectiblesFactory token - Single Supply - Non Fungible Token with Royalty Informtion, list into marketplace by Admin Only", async function () {
		const supply = 1;
		const price = 21;
		const NFT = await ethers.getContractAt("SokosCollection", collectiblesCollectionAddress);
		const NFT_INDEX = await NFT.tokenCounter();
		const bidTime = new Date(new Date().getTime() + 10000).getTime();

		receipt = nftManager.mintSokosTradables(
			collectiblesCollectionAddress,
			supply,
			MetaDataBytesURIForCollectibles,
			adminAddress.address,
			20);

		await expect(receipt).emit(nftManager, "TokenMint");
		receipt = await receipt;
		receipt = await receipt.wait()
		event = getEventData(nftManager, receipt, "TokenMint")
		expect(adminAddress.address).to.be.equal(event.beneficiary)
		expect(collectiblesCollectionAddress).to.be.equal(event.nft)
		expect(NFT_INDEX.toString()).to.be.equal(event.id.toString())
		expect(`${supply}`).to.be.equal(event.supply.toString())
		expect(MetaDataBytesURIForCollectibles).to.be.equal(event.metaData)


		// let balanceOfSender = await NFT.balanceOf(adminAddress, NFT_INDEX);

		const gotApproval = await NFT.setApprovalForAll(diamondAddress, true);
		await expect(gotApproval).emit(NFT, "ApprovalForAll");

		receipt = await listingManager.CreateListing(
			collectiblesCollectionAddress,
			NFT_INDEX,
			supply,
			price,
			new Date().getTime(),
			bidTime
		);

		await expect(receipt).emit(listingManager, "ListingCreated");
		receipt = await receipt;
		receipt = await receipt.wait()
		event = getEventData(listingManager, receipt, "ListingCreated")
		expect(adminAddress.address).to.be.equal(event.owner)
		expect(collectiblesCollectionAddress).to.be.equal(event.nft)
		expect(NFT_INDEX.toString()).to.be.equal(event.tokenId.toString())
		expect(`${supply}`).to.be.equal(event.quantity.toString())
		expect(price.toString()).to.be.equal(event.price.toString())
	});

	// it("should mint a CharactersFactory - Multiple Supply - Semi Fungible Tokens with Royalty Information, list into marketplace by Admin Only", async function () {
	// 	const supply = 11;
	// 	const price = 21;
	// 	const NFT = await ethers.getContractAt("SokosCollection", charactersCollectionAddress);
	// 	const FT_INDEX = await NFT.tokenCounter();
	// 	const bidTime = new Date(new Date().getTime() + 10000).getTime();

	// 	receipt = await SokosMarketplaceContract.mintSokosTradables(
	// 		charactersCollectionAddress,
	// 		supply,
	// 		MetaDataBytesURIForCharacters,
	// 		adminAddress,
	// 		20);
	// 	expectEvent(receipt, "TokenMint", {
	// 		beneficiary: adminAddress,
	// 		nft: charactersCollectionAddress,
	// 		id: FT_INDEX,
	// 		supply: BigNumber.from(supply),
	// 		metaData: MetaDataBytesURIForCharacters,
	// 	});


	// 	//    let balanceOfSender = await NFT.balanceOf(adminAddress, FT_INDEX);

	// 	const gotApproval = await NFT.setApprovalForAll(diamondAddress, true);
	// 	await expect(gotApproval).emit(NFT, "ApprovalForAll");

	// 	const orderTXN = await SokosMarketplaceContract.CreateListing(
	// 		charactersCollectionAddress,
	// 		FT_INDEX,
	// 		supply,
	// 		price,
	// 		new Date().getTime(),
	// 		Math.floor(new Date().getTime() / 1000)
	// 	);
	// 	expectEvent(orderTXN, "ListingCreated", {
	// 		owner: adminAddress,
	// 		nft: charactersCollectionAddress,
	// 		tokenId: FT_INDEX,
	// 		quantity: BigNumber.from(supply),
	// 		price: BigNumber.from(price),
	// 	});
	// });

	// it("should mint a CharactersFactory - Single Supply - Non Fungible Token with Royalty Information, list into marketplace by Admin Only", async function () {
	// 	const supply = 1;
	// 	const price = 21;
	// 	const NFT = await ethers.getContractAt("SokosCollection", charactersCollectionAddress);
	// 	const NFT_INDEX = await NFT.tokenCounter();
	// 	const bidTime = new Date(new Date().getTime() + 10000).getTime();

	// 	receipt = await SokosMarketplaceContract.mintSokosTradables(
	// 		charactersCollectionAddress,
	// 		supply,
	// 		MetaDataBytesURIForCharacters,
	// 		adminAddress,
	// 		20);
	// 	expectEvent(receipt, "TokenMint", {
	// 		beneficiary: adminAddress,
	// 		nft: charactersCollectionAddress,
	// 		id: NFT_INDEX,
	// 		supply: BigNumber.from(supply),
	// 		metaData: MetaDataBytesURIForCharacters,
	// 	});


	// 	// let balanceOfSender = await NFT.balanceOf(adminAddress, NFT_INDEX);

	// 	const gotApproval = await NFT.setApprovalForAll(diamondAddress, true);
	// 	await expect(gotApproval).emit(NFT, "ApprovalForAll");

	// 	const OrderTXN = await SokosMarketplaceContract.CreateListing(
	// 		charactersCollectionAddress,
	// 		NFT_INDEX,
	// 		supply,
	// 		price,
	// 		new Date().getTime(),
	// 		bidTime
	// 	);
	// 	expectEvent(OrderTXN, "ListingCreated", {
	// 		owner: adminAddress,
	// 		nft: charactersCollectionAddress,
	// 		tokenId: NFT_INDEX,
	// 		quantity: BigNumber.from(supply),
	// 		price: BigNumber.from(price),
	// 	});
	// });

	// // Without royalty information
	// it("should mint a ArtsFactory token - Multiple Supply - Semi Fungible Tokens with out royalty information, list into marketplace by Admin Only", async function () {

	// 	const supply = 10;
	// 	const price = 20;
	// 	const NFT = await ethers.getContractAt("SokosCollection", artCollectionAddress);
	// 	const FT_INDEX = await NFT.tokenCounter();
	// 	const bidTime = new Date(new Date().getTime() + 10000).getTime();

	// 	receipt = await SokosMarketplaceContract.mintSokosTradables(
	// 		artCollectionAddress,
	// 		supply,
	// 		MetaDataBytesURIForArts,
	// 		adminAddress,
	// 		0);
	// 	expectEvent(receipt, "TokenMint", {
	// 		beneficiary: adminAddress,
	// 		nft: artCollectionAddress,
	// 		id: FT_INDEX,
	// 		supply: BigNumber.from(supply),
	// 		metaData: MetaDataBytesURIForArts,
	// 	});


	// 	// let balanceOfSender = await NFT.balanceOf(adminAddress, FT_INDEX);

	// 	const gotApproval = await NFT.setApprovalForAll(diamondAddress, true);
	// 	await expect(gotApproval).emit(NFT, "ApprovalForAll");
	// 	const OrderTXN = await SokosMarketplaceContract.CreateListing(
	// 		artCollectionAddress,
	// 		FT_INDEX,
	// 		supply,
	// 		price,
	// 		new Date().getTime(),
	// 		Math.floor(new Date().getTime() / 1000)
	// 	);
	// 	expectEvent(OrderTXN, "ListingCreated", {
	// 		owner: adminAddress,
	// 		nft: artCollectionAddress,
	// 		tokenId: FT_INDEX,
	// 		quantity: BigNumber.from(supply),
	// 		price: BigNumber.from(price),
	// 	});
	// });

	// it("should mint a ArtsFactory token - Single Supply - Non Fungible Token with out royalty information, list into marketplace by Admin Only", async function () {

	// 	const supply = 1;
	// 	const price = 200;
	// 	const NFT = await ethers.getContractAt("SokosCollection", artCollectionAddress);
	// 	const NFT_INDEX = await NFT.tokenCounter();
	// 	const bidTime = new Date(new Date().getTime() + 10000).getTime();

	// 	receipt = await SokosMarketplaceContract.mintSokosTradables(
	// 		artCollectionAddress,
	// 		supply,
	// 		MetaDataBytesURIForArts,
	// 		adminAddress,
	// 		0);
	// 	expectEvent(receipt, "TokenMint", {
	// 		beneficiary: adminAddress,
	// 		nft: artCollectionAddress,
	// 		id: NFT_INDEX,
	// 		supply: BigNumber.from(supply),
	// 		metaData: MetaDataBytesURIForArts,
	// 	});


	// 	// let balanceOfSender = await NFT.balanceOf(adminAddress, NFT_INDEX);

	// 	const gotApproval = await NFT.setApprovalForAll(diamondAddress, true);
	// 	await expect(gotApproval).emit(NFT, "ApprovalForAll");

	// 	const orderTXN = await SokosMarketplaceContract.CreateListing(
	// 		artCollectionAddress,
	// 		NFT_INDEX,
	// 		supply,
	// 		price,
	// 		new Date().getTime(),
	// 		bidTime
	// 	);
	// 	expectEvent(orderTXN, "ListingCreated", {
	// 		owner: adminAddress,
	// 		nft: artCollectionAddress,
	// 		tokenId: NFT_INDEX,
	// 		quantity: BigNumber.from(supply),
	// 		price: BigNumber.from(price),
	// 	});
	// });

	// it("should mint a CollectiblesFactory token - Multiple Supply - Semi Fungible Tokens with out Royalty Information, list into marketplace by Admin Only", async function () {
	// 	const supply = 11;
	// 	const price = 21;
	// 	const NFT = await ethers.getContractAt("SokosCollection", collectiblesCollectionAddress);
	// 	const FT_INDEX = await NFT.tokenCounter();
	// 	const bidTime = new Date(new Date().getTime() + 10000).getTime();

	// 	receipt = nftManager.mintSokosTradables(
	// 		collectiblesCollectionAddress,
	// 		supply,
	// 		MetaDataBytesURIForCollectibles,
	// 		adminAddress.address,
	// 		20);
	// 	expectEvent(receipt, "TokenMint", {
	// 		beneficiary: adminAddress,
	// 		nft: collectiblesCollectionAddress,
	// 		id: FT_INDEX,
	// 		supply: BigNumber.from(supply),
	// 		metaData: MetaDataBytesURIForCollectibles,
	// 	});


	// 	// let balanceOfSender = await NFT.balanceOf(adminAddress, FT_INDEX);

	// 	const gotApproval = await NFT.setApprovalForAll(diamondAddress, true);
	// 	await expect(gotApproval).emit(NFT, "ApprovalForAll");

	// 	const orderTXN = await SokosMarketplaceContract.CreateListing(
	// 		collectiblesCollectionAddress,
	// 		FT_INDEX,
	// 		supply,
	// 		price,
	// 		new Date().getTime(),
	// 		Math.floor(new Date().getTime() / 1000)
	// 	);
	// 	expectEvent(orderTXN, "ListingCreated", {
	// 		owner: adminAddress,
	// 		nft: collectiblesCollectionAddress,
	// 		tokenId: FT_INDEX,
	// 		quantity: BigNumber.from(supply),
	// 		price: BigNumber.from(price),
	// 	});
	// });

	// it("should mint a CollectiblesFactory token - Single Supply - Non Fungible Token with out Royalty Informtion, list into marketplace by Admin Only", async function () {
	// 	const supply = 1;
	// 	const price = 21;
	// 	const NFT = await ethers.getContractAt("SokosCollection", collectiblesCollectionAddress);
	// 	const NFT_INDEX = await NFT.tokenCounter();
	// 	const bidTime = new Date(new Date().getTime() + 10000).getTime();

	// 	receipt = nftManager.mintSokosTradables(
	// 		collectiblesCollectionAddress,
	// 		supply,
	// 		MetaDataBytesURIForCollectibles,
	// 		adminAddress.address,
	// 		20);
	// 	expectEvent(receipt, "TokenMint", {
	// 		beneficiary: adminAddress,
	// 		nft: collectiblesCollectionAddress,
	// 		id: NFT_INDEX,
	// 		supply: BigNumber.from(supply),
	// 		metaData: MetaDataBytesURIForCollectibles,
	// 	});


	// 	// let balanceOfSender = await NFT.balanceOf(adminAddress, NFT_INDEX);

	// 	const gotApproval = await NFT.setApprovalForAll(diamondAddress, true);
	// 	await expect(gotApproval).emit(NFT, "ApprovalForAll");

	// 	const orderTXn = await SokosMarketplaceContract.CreateListing(
	// 		collectiblesCollectionAddress,
	// 		NFT_INDEX,
	// 		supply,
	// 		price,
	// 		new Date().getTime(),
	// 		bidTime
	// 	);
	// 	expectEvent(orderTXn, "ListingCreated", {
	// 		owner: adminAddress,
	// 		nft: collectiblesCollectionAddress,
	// 		tokenId: NFT_INDEX,
	// 		quantity: BigNumber.from(supply),
	// 		price: BigNumber.from(price),
	// 	});
	// });

	// it("should mint a CharactersFactory - Multiple Supply - Semi Fungible Tokens with out Royalty Information, list into marketplace by Admin Only", async function () {
	// 	const supply = 11;
	// 	const price = 21;
	// 	const NFT = await ethers.getContractAt("SokosCollection", charactersCollectionAddress);
	// 	const FT_INDEX = await NFT.tokenCounter();
	// 	const bidTime = new Date(new Date().getTime() + 10000).getTime();

	// 	receipt = await SokosMarketplaceContract.mintSokosTradables(
	// 		charactersCollectionAddress,
	// 		supply,
	// 		MetaDataBytesURIForCharacters,
	// 		adminAddress,
	// 		0);
	// 	expectEvent(receipt, "TokenMint", {
	// 		beneficiary: adminAddress,
	// 		nft: charactersCollectionAddress,
	// 		id: FT_INDEX,
	// 		supply: BigNumber.from(supply),
	// 		metaData: MetaDataBytesURIForCharacters,
	// 	});


	// 	// let balanceOfSender = await NFT.balanceOf(adminAddress, FT_INDEX);

	// 	const gotApproval = await NFT.setApprovalForAll(diamondAddress, true);
	// 	await expect(gotApproval).emit(NFT, "ApprovalForAll");

	// 	const orderTXN = await SokosMarketplaceContract.CreateListing(
	// 		charactersCollectionAddress,
	// 		FT_INDEX,
	// 		supply,
	// 		price,
	// 		new Date().getTime(),
	// 		Math.floor(new Date().getTime() / 1000)
	// 	);
	// 	expectEvent(orderTXN, "ListingCreated", {
	// 		owner: adminAddress,
	// 		nft: charactersCollectionAddress,
	// 		tokenId: FT_INDEX,
	// 		quantity: BigNumber.from(supply),
	// 		price: BigNumber.from(price),
	// 	});
	// });

	// it("should mint a CharactersFactory - Single Supply - Non Fungible Token with out Royalty Information, list into marketplace by Admin Only", async function () {
	// 	const supply = 1;
	// 	const price = 21;
	// 	const NFT = await ethers.getContractAt("SokosCollection", charactersCollectionAddress);
	// 	const NFT_INDEX = await NFT.tokenCounter();
	// 	const bidTime = new Date(new Date().getTime() + 10000).getTime();

	// 	receipt = await SokosMarketplaceContract.mintSokosTradables(
	// 		charactersCollectionAddress,
	// 		supply,
	// 		MetaDataBytesURIForCharacters,
	// 		adminAddress,
	// 		0);
	// 	expectEvent(receipt, "TokenMint", {
	// 		beneficiary: adminAddress,
	// 		nft: charactersCollectionAddress,
	// 		id: NFT_INDEX,
	// 		supply: BigNumber.from(supply),
	// 		metaData: MetaDataBytesURIForCharacters,
	// 	});


	// 	// let balanceOfSender = await NFT.balanceOf(adminAddress, NFT_INDEX);

	// 	const gotApproval = await NFT.setApprovalForAll(diamondAddress, true);
	// 	await expect(gotApproval).emit(NFT, "ApprovalForAll");

	// 	const orderTXn = await SokosMarketplaceContract.CreateListing(
	// 		charactersCollectionAddress,
	// 		NFT_INDEX,
	// 		supply,
	// 		price,
	// 		new Date().getTime(),
	// 		bidTime
	// 	);
	// 	expectEvent(orderTXn, "ListingCreated", {
	// 		owner: adminAddress,
	// 		nft: charactersCollectionAddress,
	// 		tokenId: NFT_INDEX,
	// 		quantity: BigNumber.from(supply),
	// 		price: BigNumber.from(price),
	// 	});
	// });

	// it("should mint a Sports Factory - Multiple Supply - Semi Fungible Tokens with out Royalty Information, list into marketplace by Admin Only", async function () {
	// 	const supply = 11;
	// 	const price = 21;
	// 	const NFT = await ethers.getContractAt("SokosCollection", sportsCollectionAddress);
	// 	const FT_INDEX = await NFT.tokenCounter();
	// 	const bidTime = new Date(new Date().getTime() + 10000).getTime();

	// 	receipt = await SokosMarketplaceContract.mintSokosTradables(
	// 		sportsCollectionAddress,
	// 		supply,
	// 		MetaDataBytesURIForCharacters,
	// 		adminAddress,
	// 		0);
	// 	expectEvent(receipt, "TokenMint", {
	// 		beneficiary: adminAddress,
	// 		nft: sportsCollectionAddress,
	// 		id: FT_INDEX,
	// 		supply: BigNumber.from(supply),
	// 		metaData: MetaDataBytesURIForCharacters,
	// 	});


	// 	// let balanceOfSender = await NFT.balanceOf(adminAddress, FT_INDEX);

	// 	const gotApproval = await NFT.setApprovalForAll(diamondAddress, true);
	// 	await expect(gotApproval).emit(NFT, "ApprovalForAll");

	// 	const orderTXN = await SokosMarketplaceContract.CreateListing(
	// 		sportsCollectionAddress,
	// 		FT_INDEX,
	// 		supply,
	// 		price,
	// 		new Date().getTime(),
	// 		Math.floor(new Date().getTime() / 1000)
	// 	);
	// 	expectEvent(orderTXN, "ListingCreated", {
	// 		owner: adminAddress,
	// 		nft: sportsCollectionAddress,
	// 		tokenId: FT_INDEX,
	// 		quantity: BigNumber.from(supply),
	// 		price: BigNumber.from(price),
	// 	});
	// });

	// it("should mint a Sports Factory - Single Supply - Non Fungible Token with out Royalty Information, list into marketplace by Admin Only", async function () {
	// 	const supply = 1;
	// 	const price = 21;
	// 	const NFT = await ethers.getContractAt("SokosCollection", sportsCollectionAddress);
	// 	const NFT_INDEX = await NFT.tokenCounter();
	// 	const bidTime = new Date(new Date().getTime() + 10000).getTime();

	// 	receipt = await SokosMarketplaceContract.mintSokosTradables(
	// 		sportsCollectionAddress,
	// 		supply,
	// 		MetaDataBytesURIForCharacters,
	// 		adminAddress,
	// 		0);
	// 	expectEvent(receipt, "TokenMint", {
	// 		beneficiary: adminAddress,
	// 		nft: sportsCollectionAddress,
	// 		id: NFT_INDEX,
	// 		supply: BigNumber.from(supply),
	// 		metaData: MetaDataBytesURIForCharacters,
	// 	});


	// 	// let balanceOfSender = await NFT.balanceOf(adminAddress, NFT_INDEX);

	// 	const gotApproval = await NFT.setApprovalForAll(diamondAddress, true);
	// 	await expect(gotApproval).emit(NFT, "ApprovalForAll");

	// 	const orderTXn = await SokosMarketplaceContract.CreateListing(
	// 		sportsCollectionAddress,
	// 		NFT_INDEX,
	// 		supply,
	// 		price,
	// 		new Date().getTime(),
	// 		bidTime
	// 	);
	// 	expectEvent(orderTXn, "ListingCreated", {
	// 		owner: adminAddress,
	// 		nft: sportsCollectionAddress,
	// 		tokenId: NFT_INDEX,
	// 		quantity: BigNumber.from(supply),
	// 		price: BigNumber.from(price),
	// 	});
	// });
});
