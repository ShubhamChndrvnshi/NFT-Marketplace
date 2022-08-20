const { deployDiamond } = require('../../scripts/deploy.js')

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
const artMetaData = "0x697066733a2f2f516d61614d7a67555a6f51776e6d5862336d65763567664c4c70394e4675486777527535384233475165797a7538";

describe("UNIT TESTING FOR Sokos Collection", () => {

	let idOfTheMintedToken,
		RoyaltyTokenContract,
		resgistry,
		adminAddress;

	let diamondAddress
	let diamondCutFacet
	let diamondLoupeFacet
	let ownershipFacet
	let tx
	let receipt
	let result
	let accounts = []
	const addresses = []

	before(async function () {
		diamondAddress = await deployDiamond()
		accounts = await ethers.getSigners();
		const SokosCollection = await ethers.getContractFactory("SokosCollection");
		RoyaltyTokenContract = await SokosCollection.deploy(diamondAddress, collections[0].name, collections[0].symbol, true, accounts[0].address);
		adminAddress = accounts[0].address;
	});

	it("should reflect the initial values", async () => {
		const initialFT_index = await RoyaltyTokenContract.tokenCounter();
		assert.equal(initialFT_index.toString(), "0");
	});

	it("should reflect the name of the token after setting a new token name", async () => {
		await RoyaltyTokenContract.setName("sokos-new");
		const updatedName = await RoyaltyTokenContract.name();
		assert.equal(updatedName, "sokos-new");
	});

	it("should mint a Fungible token WITHOUT royalties and verify the supply of the token", async () => {
		tx = RoyaltyTokenContract.mint(
			5,
			artMetaData,
			adminAddress,
			0)
		await expect(tx).emit(
			RoyaltyTokenContract,
			"TransferSingle",
		);
		receipt = await tx
		receipt = await receipt.wait()
		for (let i = 0; i < receipt.logs.length; i++) {
			const event = receipt.logs[i];
			if (event.event == "TransferSingle") {
				idOfTheMintedToken = event.args.id.toString();
				let supplyCountOfTheMintedToken = event.args.value.toString();
				const totalSupplyOfTheMintedToken = await RoyaltyTokenContract.totalSupply(idOfTheMintedToken);
				assert.equal(supplyCountOfTheMintedToken, totalSupplyOfTheMintedToken.toString());
			}
		}
	});

	it("should mint a Non Fungible token WITHOUT royalties and verify the supply of the token", async () => {
		tx = RoyaltyTokenContract.mint(
			1,
			artMetaData,
			adminAddress,
			0)
		await expect(tx).emit(
			RoyaltyTokenContract,
			"TransferSingle",
		);
		receipt = await tx
		receipt = await receipt.wait()
		for (let i = 0; i < receipt.logs.length; i++) {
			const event = receipt.logs[i];
			if (event.event == "TransferSingle") {
				idOfTheMintedToken = event.args.id.toString();
				let supplyCountOfTheMintedToken = event.args.value.toString();
				const totalSupplyOfTheMintedToken = await RoyaltyTokenContract.totalSupply(idOfTheMintedToken);
				assert.equal(supplyCountOfTheMintedToken, totalSupplyOfTheMintedToken.toString());
			}
		}
	});

	it("should reflect the increment in NFT_index after non fungible token mint", async () => {
		const initialNFT_index = await RoyaltyTokenContract.tokenCounter();
		assert.equal(initialNFT_index.toString(), 2);
	});

	it("should get uri of a minted token", async () => {
		const uri = await RoyaltyTokenContract.uri(1);
		assert.include(uri, "ipfs://")
	});

	it("should revert if the supply is 0 while minting a token", async () => {
		await expect(RoyaltyTokenContract.mint(0, artMetaData, adminAddress, 0)).to.be.revertedWith("ERC1155: Invalid value for number of tokens, can't be < 1");
	});

	it("should mint a Fungible token WITH royalties and verify the supply of the token", async () => {
		tx = RoyaltyTokenContract.mint(6, artMetaData, adminAddress, 200)
		await expect(tx).emit(
			RoyaltyTokenContract,
			"TransferSingle",
		);
		receipt = await tx
		receipt = await receipt.wait()
		for (let i = 0; i < receipt.logs.length; i++) {
			const event = receipt.logs[i];
			if (event.event == "TransferSingle") {
				idOfTheMintedToken = event.args.id.toString();
				let supplyCountOfTheMintedToken = event.args.value.toString();
				const totalSupplyOfTheMintedToken = await RoyaltyTokenContract.totalSupply(idOfTheMintedToken);
				assert.equal(supplyCountOfTheMintedToken, totalSupplyOfTheMintedToken.toString());
			}
		}
	});

	it("should reflect the increment in FT_index  after fungible token mint", async () => {
		const initialFT_index = await RoyaltyTokenContract.tokenCounter();
		assert.equal(initialFT_index.toString(), "3");
	});

	it("should mint a Non Fungible token WITH royalties and verify the supply of the token", async () => {
		tx = RoyaltyTokenContract.mint(1, artMetaData, adminAddress, 300)
		await expect(tx).emit(
			RoyaltyTokenContract,
			"TransferSingle",
		);
		receipt = await tx
		receipt = await receipt.wait()
		for (let i = 0; i < receipt.logs.length; i++) {
			const event = receipt.logs[i];
			if (event.event == "TransferSingle") {
				idOfTheMintedToken = event.args.id.toString();
				let supplyCountOfTheMintedToken = event.args.value.toString();
				const totalSupplyOfTheMintedToken = await RoyaltyTokenContract.totalSupply(idOfTheMintedToken);
				assert.equal(supplyCountOfTheMintedToken, totalSupplyOfTheMintedToken.toString());
			}
		}
	});

	it("should reflect the increment in tokenCounter after non fungible token mint", async () => {
		const initialNFT_index = await RoyaltyTokenContract.tokenCounter();
		assert.equal(initialNFT_index.toString(), 4);
	});

	it("should revert if the supply is 0 while minting a token without royalties", async () => {
		await expect(RoyaltyTokenContract.mint(0, artMetaData, adminAddress, 300)).to.be.revertedWith("ERC1155: Invalid value for number of tokens, can't be < 1");
	});

	// #ToDo - Test case can be better
	it("should get royalty amount as 0", async () => {
		const royaltyInfo = await RoyaltyTokenContract.royaltyInfo(adminAddress, 300);
		assert.equal(royaltyInfo.royaltyAmount, 0);
	});
});
