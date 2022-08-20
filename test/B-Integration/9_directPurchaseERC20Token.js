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
// const expectedBlockTime = 1000;
// const sleep = (milliseconds) => {
// 	return new Promise(resolve => setTimeout(resolve, milliseconds));
// };

const { assert, expect } = require("chai");
const { deployDiamond } = require('../../scripts/deploy.js')
const { BigNumber, constants } = require("ethers");
const { ethers } = require("hardhat");
const { getEventData } = require("../testHelpers.js");
const { AddressZero: ZERO_ADDRESS } = constants;

// const ROYALTY_BPS_POINTS = 700;
const MetaDataBytesURIForArts = "0x697066733a2f2f516d61614d7a67555a6f51776e6d5862336d65763567664c4c70394e4675486777527535384233475165797a7538";
const MetaDataBytesURIForCollectibles = "0x697066733a2f2f516d536179793334425343686f334d69636d715863487253423952325970484231736b4d464b397971615a6d7533";
const MetaDataBytesURIForCharacters = "0x697066733a2f2f516d64686d616e5054754a4b794e516839583936536e44364b664e34364b41593755576f4143316f734b6b714779";


describe("Admin should mint different types of tokens and list those into marketplace 2", async () => {

        let PayToken
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
        let ListingIdOfTheMintedToken
        let supplyCountOfTheMintedToken
        let artCollectionAddress
        let orderCreator;

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

    it("should set the platform fee as 0", async function () {
        //    const currentPlatformMintFee = await SokosMarketplaceContract.mintFee();

        // In unit test case setting the platform fee to be a non zero value, so set back to 0
        await marketplaceManager.connect(adminAddress).updatePlatformMintFee(0);

        // Platform fee will be 0 here
        const laterPlatformMintFee = await marketplaceManager.mintFee();
        assert.equal(laterPlatformMintFee.toString(), "0");
    });

    // Purchase flow

    it("User should be able to make a direct purchase of a listed NFT", async function () {
        console.log("-".repeat(50));
        const collection = await collectionManagerFacet.collections("0");
        console.log("Minting NFT for collection", collection._displayName);
        const NFT = await ethers.getContractAt("SokosCollection",collection._address);
        let collectionAddress = collection._address;
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
        orderCreator = event.seller;

        const _payToken = PayToken.address;
        const _quantity = 1;

        // set payment method
        receipt = marketplaceManager.addTokenFeed(_payToken, mockFeed.address);

        await expect(receipt).emit(marketplaceManager, "PaymentOptionAdded");

        // aprove marketplace
        await PayToken.connect(userAddress2).approve(diamondAddress, BigNumber.from("23000000000000000000"));
        const balanceBeforePurchase = await PayToken.balanceOf(userAddress2.address);

        // const allowance = await PayToken.allowance(userAddress2, diamondAddress);

        receipt = auctionFacet.connect(userAddress2).buyItemERC20(
            ListingIdOfBiddableToken,
            _payToken,
            _quantity);
        await expect(receipt).emit(auctionFacet, "ItemSold");

        const balanceAfterPurchase = await PayToken.balanceOf(userAddress2.address);
        const conversionRate = await auctionFacet.getTokenConversionRate(BigNumber.from(10).pow(BigNumber.from(18)), _payToken);

        console.log({
            balanceBeforePurchase: balanceBeforePurchase.toString(),
            balanceAfterPurchase: balanceAfterPurchase.toString(),
            spent: BigNumber.from(balanceBeforePurchase.toString()).sub(BigNumber.from(balanceAfterPurchase.toString())).toString(),
            conversionRate: conversionRate.toString()
        });
    });
});
