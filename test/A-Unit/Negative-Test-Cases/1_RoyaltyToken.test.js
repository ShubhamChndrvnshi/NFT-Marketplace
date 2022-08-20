const { deployDiamond } = require('../../../scripts/deploy.js')
const { constants, BigNumber } = require("ethers")
// const chai = require("chai");
// const { solidity } = require("ethereum-waffle");

// chai.use(solidity);
const { expect, assert } = require("chai");
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

const ArtMetaData = "0x697066733a2f2f516d58786e684c79336b4a4c513158636866787954794d484b454c3941745042746446733343475746396f75486d";

describe("Art collection negative test cases", async () => {
	let ArtFactory;
	let supply = 10;
	let accounts = []
	let deployer, hacker;

	before(async function () {
		accounts = await ethers.getSigners();
		[deployer, hacker] = accounts;
		diamondAddress = await deployDiamond()
		const SokosCollection = await ethers.getContractFactory("SokosCollection");
		ArtFactory = await SokosCollection.deploy(diamondAddress, collections[0].name, collections[0].symbol, true, accounts[0].address);
	});

	it("Should fail to transfer the contract ownership", async () => {
		const owner = await ArtFactory.owner();
		assert.equal(owner, deployer.address);
		const reciept = ArtFactory.connect(hacker).transferOwnership(hacker.address);
		await expect(reciept).to.be.revertedWith("Ownable: caller is not the owner");
		const changedOwner = await ArtFactory.owner();
		assert.equal(owner, changedOwner);
	});

	it("Should fail to mint an token, the indexes should be unchanged- only marketplace/owner is authorised to mint", async () => {
		const tokenCounter = await ArtFactory.tokenCounter();
		const NFT_index = await ArtFactory.tokenCounter();

		const reciept = ArtFactory.connect(hacker).mint(
			supply,
			ArtMetaData,
			hacker.address,
			1000);
		await expect(reciept).to.be.revertedWith("SOKOS: Caller not allowed to mint");

		const FT_index_NEW = await ArtFactory.tokenCounter();
		const NFT_index_NEW = await ArtFactory.tokenCounter();

		assert.equal(tokenCounter.toString(), FT_index_NEW.toString());
		assert.equal(tokenCounter.toString(), NFT_index_NEW.toString());
	});

	it("Should fail to set royalty info of a minted token- only marketplace/owner is authorised to mint", async () => {
		const mintIndex = await ArtFactory.tokenCounter();
		tx = ArtFactory.connect(deployer).mint(
			supply,
			ArtMetaData,
			deployer.address,
			0)
		await expect(tx).emit(
				ArtFactory,
				"TokenMint"
			);
		reciept = await tx;
		reciept = await reciept.wait()
		const royaltyInfo = await ArtFactory.royaltyInfo(mintIndex, BigNumber.from(100000));
		assert.equal(royaltyInfo.receiver, constants.AddressZero);
		assert.equal(royaltyInfo.royaltyAmount.toString(), "0");
	});

	it("Other user should fail to set royalty for minted tokens", async () => {
		const mintIndex = await ArtFactory.tokenCounter();
		await expect(ArtFactory.mint(
			supply,
			ArtMetaData,
			deployer.address,
			0)).emit(
				ArtFactory,
				"TokenMint",
			);

		const royaltyTXN = ArtFactory.connect(hacker).setRoyalties(mintIndex, hacker.address, BigNumber.from(100000));
		await expect(royaltyTXN).to.be.revertedWith("SOKOS: Caller not allowed");
	});

	it("Royalty should be less than 100 %", async () => {
		// const mintIndex = await ArtFactory.FT_index();
		const reciept = ArtFactory.connect(deployer).mint(
			supply,
			ArtMetaData,
			deployer.address,
			10000);
		await expect(reciept).to.be.revertedWith("SOKOS: Royalty invalid");
	});

	it("Renounce Ownership function should fail for user's other than owner", async () => {
		const reciept = ArtFactory.connect(hacker).renounceOwnership();
		await expect(reciept).to.be.revertedWith("Ownable: caller is not the owner");
	}); // supportsInterface

	it("Should return false for ERC721 interface", async () => {
		const ERC721_Supported = await ArtFactory.supportsInterface("0x80ac58cd");
		assert.notEqual(ERC721_Supported, true);
	});

	it("Hackers should fail to update the address registry", async () => {
		const reciept = ArtFactory.connect(hacker).updateMarketplace(hacker.address);
		await expect(reciept).to.be.revertedWith("Ownable: caller is not the owner");
		const addressRegistry = await ArtFactory.sokosMarketplace();
		assert.notEqual(addressRegistry, hacker.address);
	});
});