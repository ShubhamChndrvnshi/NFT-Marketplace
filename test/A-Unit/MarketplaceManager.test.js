const { deployDiamond } = require('../../scripts/deploy.js')
// const sleep = (milliseconds) => {
// 	return new Promise(resolve => setTimeout(resolve, milliseconds));
// };
//let SokosMarketplaceContract;
const {
	// expectRevert,
	expectEvent,
	// BN,
	// ether,
	// constants,
	// balance,
	// send
} = require("@openzeppelin/test-helpers");
const { expect, assert } = require("chai");
const { BigNumber } = require('ethers');
const { ethers } = require('hardhat');
// const { address } = require("faker");

describe("MarketplaceManager", async () => {

	let SokosAddressRegistryContract;
	let diamondAddress
	let marketplaceManager
	let diamondLoupeFacet
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

	before(async () => {
		accounts = await ethers.getSigners();
		[owner, feeReceipient, feeReceipient2, owner2] = accounts;
		diamondAddress = await deployDiamond()
		const MockFeed = await ethers.getContractFactory("MockFeed");
		mockFeed = await MockFeed.deploy();
		marketplaceManager = await ethers.getContractAt('MarketplaceManager', diamondAddress)
		ownershipFacet = await ethers.getContractAt('OwnershipFacet', diamondAddress)
		const PayToken = await ethers.getContractFactory("BEP20Token")
		payToken = await PayToken.deploy("USDT", "STABLE COIN", 18, BigNumber.from("10000000000000000000"));
	});

	// This will throw error in the second run # ToDo - Redeploy everytime before()
	it("should reflect the initial values set by the constructor", async () => {
		const initialOwner = await ownershipFacet.owner();
		const initialPlatformFee = await marketplaceManager.platformFee();
		const initialFeeRecepient = await marketplaceManager.feeReceipient();
		assert.equal(initialOwner, String(owner.address));
		assert.equal(initialFeeRecepient, String(owner.address));
		assert.equal(initialPlatformFee, 200);
	});

	// initialise function values are not getting updated! - #ToDo
	it("should change the initial values", async () => {
		let updatedOwner, updatedPlatformFee, updatedFeeRecepient;

		const initialOwner = await ownershipFacet.owner();
		const initialPlatformFee = await marketplaceManager.platformFee();
		const initialFeeRecepient = await marketplaceManager.feeReceipient();
		console.log(`
			Initial owner: ${initialOwner}
			owner: ${owner.address}
            initialPlatformFee: ${initialPlatformFee}
            initialFeeRecepient: ${initialFeeRecepient}`);
		// console.log(accounts[1]);
		tx = await ownershipFacet.transferOwnership(owner2.address);
		await tx.wait()
		tx = await marketplaceManager.connect(owner2).updatePlatformFee(400)
		await tx.wait()
		tx = await marketplaceManager.connect(owner2).updatePlatformFeeRecipient(feeReceipient.address)
		await tx.wait()

		updatedOwner = await ownershipFacet.owner();
		updatedPlatformFee = await marketplaceManager.platformFee();
		updatedFeeRecepient = await marketplaceManager.feeReceipient();

		console.log(`
			updatedOwner: ${updatedOwner}
            updatedPlatformFee: ${updatedPlatformFee}
            updatedFeeRecepient: ${updatedFeeRecepient}
			`);

		assert.notEqual(updatedOwner, initialOwner);
		assert.notEqual(updatedFeeRecepient, initialFeeRecepient);
		assert.notEqual(updatedPlatformFee, initialPlatformFee);

		assert.equal(updatedOwner, owner2.address);
		assert.equal(updatedFeeRecepient, feeReceipient.address);
		assert.equal(updatedPlatformFee, 400);

	});

	it("should update the platform fee", async () => {
		const initialPlatformFee = await marketplaceManager.platformFee();
		await expect(marketplaceManager.connect(owner2).updatePlatformFee(900)).emit(
			marketplaceManager,
			"UpdatePlatformFee",
		  );
		const updatedPlatformFee = await marketplaceManager.platformFee();
		assert.equal(updatedPlatformFee, 900);
		assert.notEqual(initialPlatformFee, updatedPlatformFee);
	});

	it("should update the platform mint fee", async () => {
		const initialPlatformMintFee = await marketplaceManager.mintFee();
		await expect(marketplaceManager.connect(owner2).updatePlatformMintFee(10)).emit(
			marketplaceManager,
			"UpdatePlatformMintFee",
		  );
		const updatedPlatformMintFee = await marketplaceManager.mintFee();
		assert.equal(updatedPlatformMintFee, 10);
		assert.notEqual(initialPlatformMintFee, updatedPlatformMintFee);
	});

	it("should update the platform fee receipient", async () => {
		const initialPlatformMintFeeReceipient = await marketplaceManager.feeReceipient();
		const currOwner = await ownershipFacet.owner();
		assert(owner.address, currOwner);
		await expect(marketplaceManager.connect(owner2).updatePlatformFeeRecipient(feeReceipient2.address)).emit(
			marketplaceManager,
			"UpdatePlatformFeeRecipient",
		  );
		const updatedPlatformMintFeeReceipient = await marketplaceManager.feeReceipient();
		assert.equal(updatedPlatformMintFeeReceipient, feeReceipient2.address);
		assert.notEqual(initialPlatformMintFeeReceipient, updatedPlatformMintFeeReceipient);
	});

	it("should be able to add a token as payment methods", async function () {
		await expect(marketplaceManager.connect(owner2).addTokenFeed(payToken.address, mockFeed.address)).emit(
			marketplaceManager,
			"PaymentOptionAdded",
		  );
	});

	it("should be able to remove a token as payment methods", async function () {
		await expect(marketplaceManager.connect(owner2).removePaymentOption(payToken.address)).emit(
			marketplaceManager,
			"PaymentOptionRemoved",
		  );
	});

}); 
