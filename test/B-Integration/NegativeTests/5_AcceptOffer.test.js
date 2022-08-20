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

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
};
// const ROYALTY_BPS_POINTS = 700;
const MetaDataBytesURIForArts = "0x697066733a2f2f516d61614d7a67555a6f51776e6d5862336d65763567664c4c70394e4675486777527535384233475165797a7538";

describe("Negative test cases for direct purchase using ERC20 tokens",
    async () => {

        let resgistry,
            SokosMarketplaceContract,
            idOfBiddableToken1;

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
        let adminAddress, userAddress2, userAddress3, royaltyRecipient;
        let idOfTheMintedToken
        let idOfBiddableToken
        let ListingIdOfBiddableToken
        let ListingIdOfBiddableToken1
        let supplyCountOfTheMintedToken
        let artCollectionAddress

        before(async function () {

            diamondAddress = await deployDiamond()
            accounts = await ethers.getSigners();
            [adminAddress, userAddress2, userAddress3, royaltyRecipient] = accounts;
            const MockFeed = await ethers.getContractFactory("MockFeed");
            mockFeed = await MockFeed.deploy();
            listingManager = await ethers.getContractAt("ListingManager", diamondAddress);
            marketplaceManager = await ethers.getContractAt("MarketplaceManager", diamondAddress);
            nftManager = await ethers.getContractAt("NftManager", diamondAddress);
            auctionFacet = await ethers.getContractAt("AuctionFacet", diamondAddress);
            collectionManagerFacet = await ethers.getContractAt('CollectionManagerFacet', diamondAddress)
            const payToken = await ethers.getContractFactory("BEP20Token")
            PayToken = await payToken.deploy("USDT", "STABLE COIN", 18, BigNumber.from("10000000000000000000"));

            await marketplaceManager.addTokenFeed(PayToken.address, mockFeed.address);
            await PayToken.transfer(userAddress2.address, BigNumber.from("10").mul(BigNumber.from("10").pow("19")));
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

            // Mint a NFT
            console.log("Minting...");
            receipt = nftManager.mintSokosTradables(
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
            idOfBiddableToken = event.id.toString();

            console.log("Minting...");
            receipt = nftManager.mintSokosTradables(
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
            idOfBiddableToken1 = event.id.toString();

            // List it onto marketplace
            console.log("Listing into marketplace...");
            const bidExp = new Date().setMinutes(new Date().getMinutes() + 2);
            receipt = listingManager.CreateListing(
                artCollectionAddress,
                idOfBiddableToken,
                1,
                10,
                BigNumber.from(Math.floor(new Date().getTime() / 1000)),
                BigNumber.from(Math.floor(new Date(bidExp).getTime() / 1000) + 100000)
            );

            await expect(receipt).emit(listingManager, "ListingCreated");

            receipt = await receipt;
            receipt = await receipt.wait()
            event = getEventData(listingManager, receipt, "ListingCreated")
            ListingIdOfBiddableToken = event.itemId.toString();

            receipt = listingManager.CreateListing(
                artCollectionAddress,
                idOfBiddableToken1,
                1,
                10,
                BigNumber.from(Math.floor(new Date().getTime() / 1000)),
                BigNumber.from(Math.floor(new Date(bidExp).getTime() / 1000) + 100000)
            );

            await expect(receipt).emit(listingManager, "ListingCreated");

            receipt = await receipt;
            receipt = await receipt.wait()
            event = getEventData(listingManager, receipt, "ListingCreated")
            ListingIdOfBiddableToken1 = event.itemId.toString();

        });

        it("Should fail to accept bid, if no bid placed", async function () {
            console.log("Admin trying to accept bid");
            const receipt = auctionFacet.acceptOffer(
                ListingIdOfBiddableToken1
            );
            expect(receipt).to.be.reverted;
        });

        it("Should fail to accept bid, if bid expired", async function () {
            // Place a bid
            console.log("Placing bid on listed item");
            await PayToken.connect(userAddress2).approve(diamondAddress, BigNumber.from("10").mul(BigNumber.from("10").pow("19")));
            receipt = auctionFacet.connect(userAddress2).safePlaceBid(
                ListingIdOfBiddableToken,
                PayToken.address,
                BigNumber.from("15"),
                Math.floor(new Date().getTime() / 1000)
            );
            await expect(receipt).emit(auctionFacet, "BidCreated");

            await sleep(1000);
            console.log("Admin trying to accept bid");
            receipt = auctionFacet.connect(adminAddress).acceptOffer(
                ListingIdOfBiddableToken
            );
            await expect(receipt).to.be.reverted;
            // expectRevert(receiptFromAcceptOffer, "highest bid expired");
        });
    });