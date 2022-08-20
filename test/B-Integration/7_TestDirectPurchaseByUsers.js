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
const { deployDiamond } = require('../../scripts/deploy.js')
const { BigNumber, constants } = require("ethers");
const { ethers } = require("hardhat");
const { getEventData } = require("../testHelpers.js");
const { AddressZero: ZERO_ADDRESS } = constants;
const { waffle } = require("hardhat");
const provider = waffle.provider;

// const ROYALTY_BPS_POINTS = 700;
const MetaDataBytesURIForArts = "0x697066733a2f2f516d61614d7a67555a6f51776e6d5862336d65763567664c4c70394e4675486777527535384233475165797a7538";

describe("Positive test cases for direct purchase using matic tokens",
    async () => {

        let payToken1,
            payToken2;

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

            payToken1 = await payToken.deploy("USDT", "STABLE COIN", 18, BigNumber.from("10000000000000000000"));
            payToken2 = await payToken.deploy("USDT", "STABLE COIN", 18, BigNumber.from("10000000000000000000"));

            await marketplaceManager.updateMaticPriceFeed(mockFeed.address);
            await marketplaceManager.addTokenFeed(payToken1.address, mockFeed.address);
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
            ListingIdOfTheMintedToken = event.itemId.toString();
        });

        it("Should be able to purchase NFT exact matic change", async function () {
            const NFT = await ethers.getContractAt("SokosCollection",artCollectionAddress);
            const platFormFee = await marketplaceManager.platformFee();
            const itemPrice = BigNumber.from("10").mul(BigNumber.from(10).pow(18));
            const serviceFee = BigNumber.from(platFormFee.toString()).mul(itemPrice).div(BigNumber.from(1e4));
            const nftBalanceOfUserBeforePurchase = await NFT.balanceOf(userAddress2.address, idOfTheMintedToken);
            const balaceOfRoyaltyRecieverBeforeSell = await provider.getBalance(royaltyRecipient.address);
            const listingBeforeSell = await listingManager.listings(ListingIdOfTheMintedToken);
             receipt = auctionFacet.connect(userAddress2).buyItemEth(
                ListingIdOfTheMintedToken,
                1
                , { value: itemPrice });
            await expect(receipt).emit(auctionFacet, "ItemSold");

            console.log("Check balance of user after purchase");
            const nftBalanceOfUserAfterPurchase = await NFT.balanceOf(userAddress2.address, idOfTheMintedToken);
            console.log({
                "beforePurchase": Number(nftBalanceOfUserBeforePurchase.toString()),
                "afterPurchasde": Number(nftBalanceOfUserAfterPurchase.toString())
            })
            expect(Number(nftBalanceOfUserAfterPurchase.toString())).to.be.greaterThan(Number(nftBalanceOfUserBeforePurchase.toString()))

            console.log("Checking royalty paid");
            const { royaltyAmount } = await NFT.royaltyInfo(idOfTheMintedToken, itemPrice.sub(serviceFee));
            const balanceAfterSell = await provider.getBalance(royaltyRecipient.address);
            const balanceObj = {
                balaceOfRoyaltyRecieverBeforeSell: balaceOfRoyaltyRecieverBeforeSell.toString(),
                royaltyToBePaid: royaltyAmount.toString(),
                balanceAfterSell: balanceAfterSell.toString(),
                RoyaltyPaid: BigNumber.from(balanceAfterSell.toString()).sub(BigNumber.from(balaceOfRoyaltyRecieverBeforeSell.toString())).toString(),
            };
            console.log(balanceObj);

            expect(balanceObj.royaltyToBePaid).to.be.deep.equal(balanceObj.RoyaltyPaid)

            console.log("Check listing state");
            const listingAfterSell = await listingManager.listings(ListingIdOfTheMintedToken);
            console.log({ listingBeforeSell: listingBeforeSell.quantity.toString() })
            console.log({ listingAfterSell: listingAfterSell.quantity.toString() })
            expect(Number(listingBeforeSell.quantity.toString())).to.not.be.equal(Number(listingAfterSell.quantity.toString()));
            expect(Number(listingBeforeSell.quantity.toString()) - 1).to.be.equal(Number(listingAfterSell.quantity.toString()));
        });
    });