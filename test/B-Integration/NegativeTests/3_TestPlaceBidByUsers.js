const collections = [
    {
        name: "SOKOS ART",
        symbol: "SOKOS TOKEN V3",
        displayName: "Art"
    }
];
const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
};
const { assert, expect } = require("chai");
const { deployDiamond } = require('../../../scripts/deploy.js')
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const { getEventData } = require("../../testHelpers.js");

const MetaDataBytesURIForArts = "0x697066733a2f2f516d61614d7a67555a6f51776e6d5862336d65763567664c4c70394e4675486777527535384233475165797a7538";


describe("Safe Place bid integration test cases", async () => {

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
    let adminAddress, seller, user2, user3, royaltyRecipient, platformFeeRecipient;
    let idOfTheMintedToken
    let idOfBiddableToken
    let ListingIdOfBiddableToken
    let listingIdOfTheMintedToken
    let supplyCountOfTheMintedToken
    let artCollectionAddress

    before(async function () {

        diamondAddress = await deployDiamond()
        accounts = await ethers.getSigners();
        [adminAddress, seller, user2, user3, royaltyRecipient, platformFeeRecipient] = accounts;
        const MockFeed = await ethers.getContractFactory("MockFeed");
        mockFeed = await MockFeed.deploy();
        listingManager = await ethers.getContractAt("ListingManager", diamondAddress);
        marketplaceManager = await ethers.getContractAt("MarketplaceManager", diamondAddress);
        nftManager = await ethers.getContractAt("NftManager", diamondAddress);
        auctionFacet = await ethers.getContractAt("AuctionFacet", diamondAddress);
        collectionManagerFacet = await ethers.getContractAt('CollectionManagerFacet', diamondAddress)
        const payToken = await ethers.getContractFactory("BEP20Token")
        PayToken = await payToken.deploy("USDT", "STABLE COIN", 18, BigNumber.from("10000000000000000000"));


        await PayToken.transfer(user2.address, BigNumber.from("50000000000000000000"));
        await PayToken.transfer(user3.address, BigNumber.from("50000000000000000000"));
        await marketplaceManager.addTokenFeed(PayToken.address, mockFeed.address);

        // Create a collection
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

    // Negative test case scenarios
    it("Seller should not allowed to bid", async function () {

        // Mint a NFT
        console.log("Minting...");
        receipt = nftManager.connect(seller).mintSokosTradables(
            artCollectionAddress,
            1,
            MetaDataBytesURIForArts,
            royaltyRecipient.address,
            1000
        );

        await expect(receipt).emit(nftManager, "TokenMint");
        receipt = await receipt;
        receipt = await receipt.wait()
        event = getEventData(nftManager, receipt, "TokenMint")
        idOfTheMintedToken = event.id.toString();
        supplyCountOfTheMintedToken = event.supply.toString();
        // List it onto marketplace
        console.log("Listing into marketplace...");
        const basePrice = BigNumber.from("10");
        const bidExp = new Date().setSeconds(new Date().getSeconds() + 1030)
        receipt = listingManager.connect(seller).CreateListing(
            artCollectionAddress,
            idOfTheMintedToken,
            supplyCountOfTheMintedToken,
            basePrice,
            Math.floor(new Date().getTime() / 1000),
            Math.floor(new Date(bidExp).getTime() / 1000));

        receipt = await receipt;
        receipt = await receipt.wait()
        event = getEventData(listingManager, receipt, "ListingCreated")
        ListingIdOfBiddableToken = event.itemId.toString();

        //const basePrice = BigNumber.from("10");
        const bidExp1 = new Date().setSeconds(new Date().getSeconds() + 2)
        const bidPrice1 = basePrice.add(BigNumber.from("1"));
        const receiptFromSafePlaceBid = auctionFacet.connect(seller).safePlaceBid(
            ListingIdOfBiddableToken,
            PayToken.address,
            bidPrice1,
            Math.floor(new Date(bidExp1).getTime() / 1000));
        expect(receiptFromSafePlaceBid).to.be.reverted;
    });

    it("Can't place bid as the bidding period is over - bidding period over", async function () {
        console.log("Minting...");
        receipt = nftManager.connect(seller).mintSokosTradables(
            artCollectionAddress,
            1,
            MetaDataBytesURIForArts,
            royaltyRecipient.address,
            1000);
        await expect(receipt).emit(nftManager, "TokenMint");
        receipt = await receipt;
        receipt = await receipt.wait()
        event = getEventData(nftManager, receipt, "TokenMint")
        idOfTheMintedToken = event.id.toString();
        supplyCountOfTheMintedToken = event.supply.toString();
        // List it onto marketplace
        console.log("Listing into marketplace...");
        const basePrice = BigNumber.from("10");
        // Bid expires in 1 second
        const createOrderBidExpiry = new Date().setSeconds(new Date().getSeconds() + 1);
        receipt = listingManager.connect(seller).CreateListing(
            artCollectionAddress,
            idOfTheMintedToken,
            supplyCountOfTheMintedToken,
            basePrice,
            Math.floor(new Date().getTime() / 1000),
            Math.floor(new Date(createOrderBidExpiry).getTime() / 1000));
        await expect(receipt).emit(listingManager, "ListingCreated");

        receipt = await receipt;
        receipt = await receipt.wait()
        event = getEventData(listingManager, receipt, "ListingCreated")
        ListingIdOfBiddableToken = event.itemId.toString();

        const safePlaceBidExpiry = new Date().setSeconds(new Date().getSeconds() + 2)
        const bidPrice1 = basePrice.add(BigNumber.from("1"));
        receipt = auctionFacet.connect(user2).safePlaceBid(
            ListingIdOfBiddableToken,
            PayToken.address,
            bidPrice1,
            Math.floor(new Date(safePlaceBidExpiry).getTime() / 1000));
        await expect(receipt).to.be.reverted;
    });

    it("Bid should be greater than reserve price if the bid does not exists", async function () {
        console.log("Minting...");
        receipt = nftManager.connect(seller).mintSokosTradables(
            artCollectionAddress,
            1,
            MetaDataBytesURIForArts,
            royaltyRecipient.address,
            1000);
        await expect(receipt).emit(nftManager, "TokenMint");

        receipt = await receipt;
        receipt = await receipt.wait()
        event = getEventData(nftManager, receipt, "TokenMint")
        idOfTheMintedToken = event.id.toString();
        supplyCountOfTheMintedToken = event.supply.toString();

        // List it onto marketplace
        console.log("Listing into marketplace...");
        const basePrice = BigNumber.from("10");
        // Bid expires in 1 hour
        const createOrderBidExpiry = new Date().setSeconds(new Date().getSeconds() + 3600);
        receipt = listingManager.connect(seller).CreateListing(
            artCollectionAddress,
            idOfTheMintedToken,
            supplyCountOfTheMintedToken,
            basePrice,
            Math.floor(new Date().getTime() / 1000),
            Math.floor(new Date(createOrderBidExpiry).getTime() / 1000)
        );
        await expect(receipt).emit(listingManager, "ListingCreated");

        receipt = await receipt;
        receipt = await receipt.wait()
        event = getEventData(listingManager, receipt, "ListingCreated")
        ListingIdOfBiddableToken = event.itemId.toString();

        const safePlaceBidExpiry = new Date().setSeconds(new Date().getSeconds() + 120);
        const bidPrice1 = basePrice.sub(BigNumber.from("1"));
        receipt = auctionFacet.connect(user2).safePlaceBid(
            ListingIdOfBiddableToken,
            PayToken.address,
            bidPrice1,
            Math.floor(new Date(safePlaceBidExpiry).getTime() / 1000)
        );
        await expect(receipt).to.be.reverted;
    });

    it("Bid price should be higher than last bid if a bid exists already and the bid has not expired", async function () {
        // Mint a NFT
        console.log("Minting...");
        receipt = nftManager.connect(seller).mintSokosTradables(
            artCollectionAddress,
            1,
            MetaDataBytesURIForArts,
            royaltyRecipient.address,
            1000
        );
        await expect(receipt).emit(nftManager, "TokenMint");

        receipt = await receipt;
        receipt = await receipt.wait()
        event = getEventData(nftManager, receipt, "TokenMint")
        idOfTheMintedToken = event.id.toString();
        supplyCountOfTheMintedToken = event.supply.toString();

        // List it onto marketplace
        console.log("Listing into marketplace...");
        const basePrice = BigNumber.from("10");
        const bidExp = new Date().setSeconds(new Date().getSeconds() + 1030)
        receipt = listingManager.connect(seller).CreateListing(
            artCollectionAddress,
            idOfTheMintedToken,
            supplyCountOfTheMintedToken,
            basePrice,
            Math.floor(new Date().getTime() / 1000),
            Math.floor(new Date(bidExp).getTime() / 1000 + 10000000)
        );
        await expect(receipt).emit(listingManager, "ListingCreated");

        receipt = await receipt;
        receipt = await receipt.wait()
        event = getEventData(listingManager, receipt, "ListingCreated")
        ListingIdOfBiddableToken = event.itemId.toString();

        console.log("Placing bid on the item");
        //const basePrice = BigNumber.from("10");
        const bidExp1 = new Date().setSeconds(new Date().getSeconds() + 2)
        const bidPrice1 = BigNumber.from("10").add(BigNumber.from("1"));
        await PayToken.connect(user2).approve(diamondAddress, bidPrice1.mul(BigNumber.from("10").pow(BigNumber.from("18"))));
        receipt = auctionFacet.connect(user2).safePlaceBid(
            ListingIdOfBiddableToken,
            PayToken.address,
            BigNumber.from("10").add(BigNumber.from("1")),
            Math.floor(new Date(bidExp1).getTime() / 1000 + 1000)
        );
        await expect(receipt).emit(auctionFacet, "BidCreated");

        console.log("Placing another bid on the item");
        const bidExp2 = new Date().setSeconds(new Date().getSeconds() + 3)
        const bidPrice2 = BigNumber.from("10").add(BigNumber.from("1"));
        await PayToken.connect(user3).approve(diamondAddress, BigNumber.from(bidPrice2).mul(BigNumber.from("10").pow(BigNumber.from("18"))));

        receipt = auctionFacet.connect(user3).safePlaceBid(
            ListingIdOfBiddableToken,
            PayToken.address,
            BigNumber.from("9"),
            Math.floor(new Date(bidExp2).getTime() / 1000)
        );
        await expect(receipt).to.be.reverted;
    });

    it("Bid price should be higher than last bid if a bid exists already and the bid has already expired", async function () {
        // Mint a NFT
        console.log("Minting...");
        receipt = nftManager.connect(seller).mintSokosTradables(
            artCollectionAddress,
            1,
            MetaDataBytesURIForArts,
            royaltyRecipient.address,
            1000
        );

        await expect(receipt).emit(nftManager, "TokenMint");

        receipt = await receipt;
        receipt = await receipt.wait()
        event = getEventData(nftManager, receipt, "TokenMint")
        idOfTheMintedToken = event.id.toString();
        supplyCountOfTheMintedToken = event.supply.toString();
        // List it onto marketplace
        console.log("Listing into marketplace...");
        const basePrice = BigNumber.from("10");
        // Bid will expire in an hour
        const bidExp = new Date().setSeconds(new Date().getSeconds() + 3600);
        receipt = listingManager.connect(seller).CreateListing(
            artCollectionAddress,
            idOfTheMintedToken,
            supplyCountOfTheMintedToken,
            basePrice,
            Math.floor(new Date().getTime() / 1000),
            Math.floor(new Date(bidExp).getTime() / 1000)
        );
        await expect(receipt).emit(listingManager, "ListingCreated");

        receipt = await receipt;
        receipt = await receipt.wait()
        event = getEventData(listingManager, receipt, "ListingCreated")
        ListingIdOfBiddableToken = event.itemId.toString();

        console.log("Placing bid on the item");
        // Bid 1 will expire right when it is placed
        const bidExp1 = new Date().setSeconds(new Date().getSeconds());
        const bidPrice1 = basePrice.add(BigNumber.from("1"));
        await PayToken.connect(user2).approve(diamondAddress, bidPrice1.mul(BigNumber.from("10").pow(BigNumber.from("18"))));
        receipt = await auctionFacet.connect(user2).safePlaceBid(
            ListingIdOfBiddableToken,
            PayToken.address,
            bidPrice1,
            Math.floor(new Date(bidExp1).getTime() / 1000)
        );
        await expect(receipt).emit(auctionFacet, "BidCreated");

        console.log("Placing another bid on the item");
        const bidExp2 = new Date().setSeconds(new Date().getSeconds() + 3)
        const bidPrice2 = basePrice.sub(BigNumber.from("1"));
        await PayToken.connect(user3).approve(diamondAddress, bidPrice2.mul(BigNumber.from("10").pow(BigNumber.from("18"))));

        receipt = auctionFacet.connect(user3).safePlaceBid(
            ListingIdOfBiddableToken,
            PayToken.address,
            bidPrice2,
            Math.floor(new Date(bidExp2).getTime() / 1000)
        );
        await expect(receipt).to.be.reverted;
    });

    it("A user can't bid twice in a row", async function () {
        console.log("Minting...");
        let tokenId;
        receipt = nftManager.connect(seller).mintSokosTradables(
            artCollectionAddress,
            1,
            MetaDataBytesURIForArts,
            royaltyRecipient.address,
            1000
        );

        await expect(receipt).emit(nftManager, "TokenMint");

        receipt = await receipt;
        receipt = await receipt.wait()
        event = getEventData(nftManager, receipt, "TokenMint")
        tokenId = event.id.toString();
        supplyCountOfTheMintedToken = event.supply.toString();
        // List it onto marketplace
        console.log("Listing into marketplace...");
        const basePrice = BigNumber.from("10");
        // Bid will expire in an hour
        const bidExp = new Date().setSeconds(new Date().getSeconds() + 3600);
        receipt = listingManager.connect(seller).CreateListing(
            artCollectionAddress,
            tokenId,
            supplyCountOfTheMintedToken,
            basePrice,
            Math.floor(new Date().getTime() / 1000),
            Math.floor(new Date(bidExp).getTime() / 1000)
        );
        await expect(receipt).emit(listingManager, "ListingCreated");

        receipt = await receipt;
        receipt = await receipt.wait()
        event = getEventData(listingManager, receipt, "ListingCreated")
        ListingIdOfBiddableToken = event.itemId.toString();

        console.log("Placing bid on the item");
        const bidExp1 = new Date().setSeconds(new Date().getSeconds() + 3600);
        const bidPrice1 = basePrice.add(BigNumber.from("1"));
        await PayToken.connect(user2).approve(diamondAddress, bidPrice1.mul(BigNumber.from("10").pow(BigNumber.from("18"))));
        receipt = await auctionFacet.connect(user2).safePlaceBid(
            ListingIdOfBiddableToken,
            PayToken.address,
            bidPrice1,
            Math.floor(new Date(bidExp1).getTime() / 1000)
        );
        await expect(receipt).emit(auctionFacet, "BidCreated");

        console.log("Placing another bid on the item");
        const bidExp2 = new Date().setSeconds(new Date().getSeconds() + 3600)
        const bidPrice2 = bidPrice1.add(BigNumber.from("1"));
        await PayToken.connect(user2).approve(diamondAddress, bidPrice2.mul(BigNumber.from("10").pow(BigNumber.from("18"))));
        receipt = auctionFacet.connect(user2).safePlaceBid(
            ListingIdOfBiddableToken,
            PayToken.address,
            bidPrice2,
            Math.floor(new Date(bidExp2).getTime() / 1000)
        );
        await expect(receipt).to.be.reverted;
    });

    // Marketplace: tokens spend approved not enough - #ToDo1
    it("Tokens spend approved not enough", async function () {
        console.log("Minting...");
        receipt = nftManager.connect(seller).mintSokosTradables(
            artCollectionAddress,
            1,
            MetaDataBytesURIForArts,
            royaltyRecipient.address,
            1000
        );
        await expect(receipt).emit(nftManager, "TokenMint");

        receipt = await receipt;
        receipt = await receipt.wait()
        event = getEventData(nftManager, receipt, "TokenMint")
        idOfTheMintedToken = event.id.toString();
        supplyCountOfTheMintedToken = event.supply.toString();
        // List it onto marketplace
        console.log("Listing into marketplace...");
        const basePrice = BigNumber.from("15");
        // Bid will expire in an hour
        const bidExp = new Date().setSeconds(new Date().getSeconds() + 3600);
        receipt = listingManager.connect(seller).CreateListing(
            artCollectionAddress,
            idOfTheMintedToken,
            supplyCountOfTheMintedToken,
            basePrice,
            Math.floor(new Date().getTime() / 1000),
            Math.floor(new Date(bidExp).getTime() / 1000)
        );
        await expect(receipt).emit(listingManager, "ListingCreated");

        receipt = await receipt;
        receipt = await receipt.wait()
        event = getEventData(listingManager, receipt, "ListingCreated")
        ListingIdOfBiddableToken = event.itemId.toString();

        console.log("Placing bid on the item");
        const bidExp1 = new Date().setSeconds(new Date().getSeconds() + 3600);
        const bidPrice1 = basePrice.add(BigNumber.from("20"));
        await PayToken.connect(user2).approve(diamondAddress, bidPrice1.mul(BigNumber.from("10").pow(BigNumber.from("17"))));
        receipt = auctionFacet.connect(user2).safePlaceBid(
            ListingIdOfBiddableToken,
            PayToken.address,
            bidPrice1,
            Math.floor(new Date(bidExp1).getTime() / 1000)
        );
        await expect(receipt).to.be.reverted;
    });
});

