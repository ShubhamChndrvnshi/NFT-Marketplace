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
const { BigNumber, constants } = require("ethers");
const { ethers } = require("hardhat");
const { getEventData } = require("../../testHelpers.js");
const { AddressZero: ZERO_ADDRESS } = constants;

// const ROYALTY_BPS_POINTS = 700;
const MetaDataBytesURIForArts = "0x697066733a2f2f516d61614d7a67555a6f51776e6d5862336d65763567664c4c70394e4675486777527535384233475165797a7538";

describe("Negative test cases for direct purchase using matic tokens",
    async () => {

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
        let supplyCountOfTheMintedToken
        let artCollectionAddress

        before(async function () {
            diamondAddress = await deployDiamond()
            accounts = await ethers.getSigners();
            [adminAddress, userAddress2, royaltyRecipient] = accounts;
            const MockFeed = await ethers.getContractFactory("MockFeed");
            mockFeed = await MockFeed.deploy();
            listingManager = await ethers.getContractAt("ListingManager", diamondAddress);
            nftManager = await ethers.getContractAt("NftManager", diamondAddress);
            auctionFacet = await ethers.getContractAt("AuctionFacet", diamondAddress);
            collectionManagerFacet = await ethers.getContractAt('CollectionManagerFacet', diamondAddress)
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
                10,
                MetaDataBytesURIForArts,
                royaltyRecipient.address,
                1000,
            );
            await expect(receipt).emit(nftManager, "TokenMint");
            receipt = await receipt;
            receipt = await receipt.wait()
            event = getEventData(nftManager, receipt, "TokenMint")
            idOfTheMintedToken = event.id.toString();
            supplyCountOfTheMintedToken = event.supply.toString();

            receipt = nftManager.mintSokosTradables(
                artCollectionAddress,
                1,
                MetaDataBytesURIForArts,
                royaltyRecipient.address,
                1000
            );
            expect(receipt).emit(nftManager, "TokenMint");
            receipt = await receipt;
            receipt = await receipt.wait()
            event = getEventData(nftManager, receipt, "TokenMint")
            idOfBiddableToken = event.id.toString();

            // List it onto marketplace
            console.log("Listing into marketplace...");
            receipt = listingManager.CreateListing(
                artCollectionAddress,
                idOfTheMintedToken,
                supplyCountOfTheMintedToken,
                10,
                new Date().getTime(),
                Math.floor(new Date().getTime() / 1000)
            );
            await expect(receipt).emit(listingManager, "ListingCreated");
            receipt = await receipt;
            receipt = await receipt.wait()
            event = getEventData(listingManager, receipt, "ListingCreated")
            idOfTheMintedToken = event.itemId.toString();

            console.log("Listing into marketplace...");
            const bidExp = new Date().setMinutes(new Date().getMinutes() + 2);
            receipt = listingManager.CreateListing(
                artCollectionAddress,
                idOfBiddableToken,
                1,
                10,
                BigNumber.from(Math.floor(new Date().getTime() / 1000)),
                BigNumber.from(Math.floor(new Date(bidExp).getTime() / 1000) + 10000)
            );
            await expect(receipt).emit(listingManager, "ListingCreated");
            receipt = await receipt;
            receipt = await receipt.wait()
            event = getEventData(listingManager, receipt, "ListingCreated")
            idOfBiddableToken = event.itemId.toString();
        });

        it("Seller's should fail to purchase own NFT", async function () {

            const receipt = auctionFacet.buyItemEth(
                idOfTheMintedToken,
                1
            );
            await expect(receipt).to.be.reverted;
        });

        it("Should fail to purchase NFT for low matic", async function () {
            const receipt = auctionFacet.connect(userAddress2).buyItemEth(
                idOfTheMintedToken,
                1
                , { value: BigNumber.from("10").mul(BigNumber.from(10).pow(18)) });
            await expect(receipt).to.be.reverted;
        });

        it("Should fail to purchase NFT if stock not available", async function () {
            const receipt = auctionFacet.buyItemEth(
                idOfTheMintedToken,
                11
                , { value: BigNumber.from("110").mul(BigNumber.from(10).pow(18)) });
            await expect(receipt).to.be.reverted;
        });

        it("Should fail to purchase NFT which is there for bidding", async function () {
            const receipt = auctionFacet.buyItemEth(
                idOfBiddableToken,
                1
                , { value: BigNumber.from("110").mul(BigNumber.from(10).pow(18)) });
            await expect(receipt).to.be.reverted;
        });
    });
