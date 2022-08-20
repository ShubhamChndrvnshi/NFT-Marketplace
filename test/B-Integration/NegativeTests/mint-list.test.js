const collections = [
	{
		name: "SOKOS ART",
		symbol: "SOKOS TOKEN V3",
		displayName: "Art"
	}, {
		name: "SOKOS SPORTS TOKENS",
		symbol: "SOKOS TOKEN V3",
		displayName: "Sports"
	}, {
		name: "SOKOS COLLECTIBLES",
		symbol: "SOKOS TOKEN V3",
		displayName: "Collectibles"
	}, {
		name: "SOKOS CHARACTERS",
		symbol: "SOKOS TOKEN V3",
		displayName: "Characters"
	},
];
const { assert, expect } = require("chai");
const { deployDiamond } = require('../../../scripts/deploy.js')
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const { getEventData } = require("../../testHelpers.js");

// const ROYALTY_BPS_POINTS = 700;
const MetaDataBytesURIForArts = "0x697066733a2f2f516d61614d7a67555a6f51776e6d5862336d65763567664c4c70394e4675486777527535384233475165797a7538";


describe("Negative test cases for minting and listing an NFT", async () => {

	let resgistry, SokosMarketplaceContract;
	const One_Matic = BigNumber.from("1").mul(BigNumber.from("10").pow(BigNumber.from("18")))

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


		receipt = await collectionManagerFacet.createCollection(
			collections[0].name,
			collections[0].symbol,
			collections[0].displayName,
			true);

		await expect(receipt).emit(collectionManagerFacet, "CollectionAdd");
		receipt = await receipt;
		receipt = await receipt.wait()
		event = getEventData(collectionManagerFacet, receipt, "CollectionAdd")
		artCollectionAddress = event.collection;


		await marketplaceManager.updatePlatformMintFee(One_Matic);
	});

	it("Should fail to mint an NFT, due to fee restrictions",async function () {
		receipt = nftManager.mintSokosTradables(
			artCollectionAddress,
			10,
			MetaDataBytesURIForArts,
			adminAddress.address,
			0);
		// expectRevert(receipt, "Marketplace: insufficient mint fee");
		await expect(receipt).to.be.reverted;
	});



	it("Should fail to list NFT is balance is not enough", async function () {
		const supply = 10;
		const price = 20;
		const NFT = await ethers.getContractAt("SokosCollection",artCollectionAddress);
		const FT_INDEX = await NFT.tokenCounter();
		const bidTime = new Date(new Date().getTime() + 10000).getTime();

		receipt = nftManager.mintSokosTradables(
			artCollectionAddress,
			supply,
			MetaDataBytesURIForArts,
			adminAddress.address,
			0, { value: One_Matic });

		await expect(receipt).emit(nftManager, "TokenMint");
		receipt = await receipt;
		receipt = await receipt.wait()
		event = getEventData(nftManager, receipt, "TokenMint")
		expect(adminAddress.address).to.be.equal(event.beneficiary)
		expect(artCollectionAddress).to.be.equal(event.nft)
		expect(FT_INDEX.toString()).to.be.equal(event.id.toString())
		expect(`${supply}`).to.be.equal(event.supply.toString())
		expect(MetaDataBytesURIForArts).to.be.equal(event.metaData)

		receipt = NFT.setApprovalForAll(diamondAddress, true);
		await expect(receipt).emit(NFT, "ApprovalForAll");

		receipt = listingManager.CreateListing(
			artCollectionAddress,
			FT_INDEX,
			11,
			price,
			new Date().getTime(),
			bidTime
		);
		await expect(receipt).to.be.reverted;
		// expectRevert(OrderTXN, "must hold enough nfts");
	});

	it("Should fail to list an NFT as biddable with supply > 1", async function () {
		const supply = 10;
		const price = 20;
		const NFT = await ethers.getContractAt("SokosCollection",artCollectionAddress);
		const FT_INDEX = await NFT.tokenCounter();
		const bidTime = new Date(new Date().getTime() + 10000).getTime();

		receipt = nftManager.mintSokosTradables(
			artCollectionAddress,
			supply,
			MetaDataBytesURIForArts,
			adminAddress.address,
			0, { value: One_Matic });
		
		await expect(receipt).emit(nftManager, "TokenMint");
		receipt = await receipt;
		receipt = await receipt.wait()
		event = getEventData(nftManager, receipt, "TokenMint")
		expect(adminAddress.address).to.be.equal(event.beneficiary)
		expect(artCollectionAddress).to.be.equal(event.nft)
		expect(FT_INDEX.toString()).to.be.equal(event.id.toString())
		expect(`${supply}`).to.be.equal(event.supply.toString())
		expect(MetaDataBytesURIForArts).to.be.equal(event.metaData)

		receipt = NFT.setApprovalForAll(diamondAddress, true);
		await expect(receipt).emit(NFT, "ApprovalForAll");

		receipt = listingManager.CreateListing(
			artCollectionAddress,
			FT_INDEX,
			1,
			price,
			new Date().getTime(),
			bidTime
		);
		await expect(receipt).to.be.reverted;
		// expectRevert(OrderTXN, "Marketplace: Item can't be listed for bidding");
	});
});
