const collections = [
    {
        name: "SOKOS ART",
        symbol: "SOKOS TOKEN V3",
        displayName: "Art"
    }
];

const { assert, expect } = require("chai");
const { deployDiamond } = require('../../scripts/deploy.js')
const { BigNumber, constants } = require("ethers");
const { ethers } = require("hardhat");
const { getEventData } = require("../testHelpers.js");
const { AddressZero: ZERO_ADDRESS } = constants;

const MetaDataBytesURIForArts = "0x697066733a2f2f516d61614d7a67555a6f51776e6d5862336d65763567664c4c70394e4675486777527535384233475165797a7538";


describe("Accept bid for seller's integration test cases", async () => {

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
        let adminAddress, seller, user2, user3, royaltyRecipient, platformFeeRecipient;
        let idOfTheMintedToken
        let idOfBiddableToken
        let ListingIdOfBiddableToken
        let ListingIdOfTheMintedToken
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
        let receipt = collectionManagerFacet.createCollection(
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
            Math.floor(new Date(bidExp).getTime() / 1000 + 10000),
        );
        await expect(receipt).emit(listingManager, "ListingCreated");
        receipt = await receipt;
        receipt = await receipt.wait()
        event = getEventData(listingManager, receipt, "ListingCreated")
        ListingIdOfBiddableToken = event.itemId.toString();

        console.log("Placing bid on the item");
        const bidExp1 = new Date().setSeconds(new Date().getSeconds() + 60)
        const bidPrice1 = basePrice.add(BigNumber.from("1"));
        await PayToken.connect(user2).approve(diamondAddress, bidPrice1.mul(BigNumber.from("10").pow(BigNumber.from("18"))));
        const user2BalBeforeBid = await PayToken.balanceOf(user2.address);
        receipt = auctionFacet.connect(user2).safePlaceBid(
            ListingIdOfBiddableToken,
            PayToken.address,
            bidPrice1,
            Math.floor(new Date(bidExp1).getTime() / 1000),
        );
        await expect(receipt).emit(auctionFacet, "BidCreated");

        const user2BalAfterBid = await PayToken.balanceOf(user2.address);

        console.log("Placing another bid on the item");
        const bidExp2 = new Date().setSeconds(new Date().getSeconds() + 60)
        const bidPrice2 = basePrice.add(BigNumber.from("2"));
        await PayToken.connect(user3).approve(diamondAddress, bidPrice2.mul(BigNumber.from("10").pow(BigNumber.from("18"))));

        receipt = auctionFacet.connect(user3).safePlaceBid(
            ListingIdOfBiddableToken,
            PayToken.address,
            bidPrice2,
            Math.floor((new Date(bidExp2).getTime() + 20000000) / 1000),
        );
        await expect(receipt).emit(auctionFacet, "BidCreated");

        const user2BalAfterBidReturn = await PayToken.balanceOf(user2.address);

        console.log({
            user2BalBeforeBid: user2BalBeforeBid.toString(),
            user2BalAfterBid: user2BalAfterBid.toString(),
            user2BalAfterBidReturn: user2BalAfterBidReturn.toString()
        })
        expect(user2BalBeforeBid.toString()).to.be.equal(user2BalAfterBidReturn.toString())
        expect(user2BalBeforeBid.toString()).to.not.be.equal(user2BalAfterBid.toString())
    });



    it("Seller should be able to accept highest bid on the his/her listed item", async function () {
        const NFT = await ethers.getContractAt("SokosCollection",artCollectionAddress)
        const balaceOfRoyaltyRecieverBeforeSell = await PayToken.balanceOf(royaltyRecipient.address);
        const feeReceipient = await marketplaceManager.feeReceipient();
        const platformFee = await marketplaceManager.platformFee();

        const balanceOfFeeReceipientBeforeSell = await PayToken.balanceOf(feeReceipient);
        // const listing = await SokosMarketplaceContract.listings(artCollectionAddress, idOfTheMintedToken, adminAddress);
        const sellerBalanceBeforeSell = await PayToken.balanceOf(seller.address)
        const { offerer, paidTokens } = await listingManager.offers(ListingIdOfBiddableToken);
        
        const nftBalanceBeforeAccept = await NFT.balanceOf(offerer, idOfTheMintedToken);
        console.log({
            feeReceipient,
            ListingIdOfBiddableToken,
            offerer
        })
        let receipt = auctionFacet.connect(seller).acceptOffer(
            ListingIdOfBiddableToken
        );

        await expect(receipt).emit(auctionFacet, "ItemSold");

        console.log("Check if platform fee transfered");
        const balanceOfFeeReceipientAfterSell = await PayToken.balanceOf(feeReceipient);

        const platformFeePaid = BigNumber.from(paidTokens.toString()).mul(BigNumber.from(platformFee.toString())).div(BigNumber.from("10000"));
        console.log({
            balanceOfFeeReceipientBeforeSell: balanceOfFeeReceipientBeforeSell.toString(),
            balanceOfFeeReceipientAfterSell: balanceOfFeeReceipientAfterSell.toString(),
            paidTokens: paidTokens.toString(),
            platformFee: platformFee.toString(),
            platformFeePaid: platformFeePaid.toString()
        })
        expect(balanceOfFeeReceipientAfterSell.toString()).to.be.equal(
            BigNumber.from(balanceOfFeeReceipientBeforeSell.toString()).add(platformFeePaid ).toString()
        )

        console.log("Check if royalty transfered ");
        const { royaltyAmount } = await NFT.royaltyInfo(idOfTheMintedToken, BigNumber.from(paidTokens.toString()).sub(platformFeePaid));
        const balanceAfterSell = await PayToken.balanceOf(royaltyRecipient.address);
        const balanceObj = {
            balaceOfRoyaltyRecieverBeforeSell: balaceOfRoyaltyRecieverBeforeSell.toString(),
            royaltyToBePaid: royaltyAmount.toString(),
            balanceAfterSell: balanceAfterSell.toString(),
            RoyaltyPaid: BigNumber.from(balanceAfterSell.toString()).sub(BigNumber.from(balaceOfRoyaltyRecieverBeforeSell.toString())).toString(),
        };
        console.log(balanceObj);

        expect(balanceObj.royaltyToBePaid).to.be.deep.equal(balanceObj.RoyaltyPaid)

        console.log("Check if Seller got the required amount");
        const sellerCut = BigNumber.from(paidTokens.toString()).sub(platformFeePaid).sub(BigNumber.from(balanceObj.RoyaltyPaid))
        const sellerBalanceAfterSell = await PayToken.balanceOf(seller.address);
        const sellsBalanceObj = {
            sellerBalanceBeforeSell: sellerBalanceBeforeSell.toString(),
            sellerCutToBePaid: sellerCut.toString(),
            sellerBalanceAfterSell: sellerBalanceAfterSell.toString(),
            sellerCutPaid: BigNumber.from(sellerBalanceAfterSell.toString()).sub(BigNumber.from(sellerBalanceBeforeSell.toString())).toString(),
        };
        console.log({...sellsBalanceObj, diff: sellerCut.sub(sellsBalanceObj.sellerCutPaid).toString()});

        expect(sellsBalanceObj.sellerCutToBePaid).to.be.deep.equal(sellsBalanceObj.sellerCutPaid)

        console.log("Check if Bidder got the NFT");
        const nftBalanceAfterAccept = await NFT.balanceOf(offerer, idOfTheMintedToken);

        expect(nftBalanceBeforeAccept.toString()).to.not.be.deep.equal(nftBalanceAfterAccept.toString())
    });
});
