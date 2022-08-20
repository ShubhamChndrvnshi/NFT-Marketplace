/* global ethers */
/* eslint prefer-const: "off" */

const { BigNumber, constants } = require('ethers');
const { writeFileSync } = require("fs");
const { ethers } = require('hardhat');
const { getSelectors, FacetCutAction, StorageAction } = require('./libraries/diamond.js')
const USDC_CHAINLINK_FEED = "0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7";
const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const GasEstimator = require("./gasEstimator");

async function deployDiamond() {
  const accounts = await ethers.getSigners()
  const contractOwner = accounts[0]
  const gasEstimator = new GasEstimator("polygon");

  // deploy DiamondCutFacet
  const DiamondCutFacet = await ethers.getContractFactory('DiamondCutFacet')
  const diamondCutFacet = await DiamondCutFacet.deploy({
		gasPrice: ethers.utils.parseUnits(
			Math.ceil(await gasEstimator.estimate()).toString(),
			"gwei"
		),
	})
  await diamondCutFacet.deployed()
  console.log('DiamondCutFacet deployed:', diamondCutFacet.address)

  // deploy Diamond
  const Diamond = await ethers.getContractFactory('Diamond')
  const diamond = await Diamond.deploy(contractOwner.address, diamondCutFacet.address,{
		gasPrice: ethers.utils.parseUnits(
			Math.ceil(await gasEstimator.estimate()).toString(),
			"gwei"
		),
	})
  await diamond.deployed()
  console.log('Diamond deployed:', diamond.address)

  // deploy DiamondInit
  // DiamondInit provides a function that is called when the diamond is upgraded to initialize state variables
  // Read about how the diamondCut function works here: https://eips.ethereum.org/EIPS/eip-2535#addingreplacingremoving-functions
  const DiamondInit = await ethers.getContractFactory('DiamondInit')
  const diamondInit = await DiamondInit.deploy({
		gasPrice: ethers.utils.parseUnits(
			Math.ceil(await gasEstimator.estimate()).toString(),
			"gwei"
		),
	})
  await diamondInit.deployed()
  console.log('DiamondInit deployed:', diamondInit.address)

  // deploy facets
  console.log('')
  console.log('Deploying facets')
  let FacetNames = [
    'AdminFacet',
    'AuctionFacet',
    'CollectionManagerFacet',
  ]
  const cut = []
  for (const FacetName of FacetNames) {
    const Facet = await ethers.getContractFactory(FacetName)
    const facet = await Facet.deploy({
      gasPrice: ethers.utils.parseUnits(
        Math.ceil(await gasEstimator.estimate()).toString(),
        "gwei"
      ),
    })
    await facet.deployed()
    console.log(`${FacetName} deployed: ${facet.address}`)
    cut.push({
      facetAddress: facet.address,
      facetAction: FacetCutAction.Add,
      storageAction: StorageAction.None,
      deprecatedFacetAddress: ethers.constants.AddressZero,
      functionSelectors: getSelectors(facet)
    })
    createAbiJSON(Facet, FacetName)
  }

  FacetNames = [
    'DiamondLoupeFacet',
    'ListingManager',
    'MarketplaceManager',
  ]
  const cut1 = []
  for (const FacetName of FacetNames) {
    const Facet = await ethers.getContractFactory(FacetName)
    const facet = await Facet.deploy({
      gasPrice: ethers.utils.parseUnits(
        Math.ceil(await gasEstimator.estimate()).toString(),
        "gwei"
      ),
    })
    await facet.deployed()
    console.log(`${FacetName} deployed: ${facet.address}`)
    cut1.push({
      facetAddress: facet.address,
      facetAction: FacetCutAction.Add,
      storageAction: StorageAction.None,
      deprecatedFacetAddress: ethers.constants.AddressZero,
      functionSelectors: getSelectors(facet)
    })
    createAbiJSON(Facet, FacetName)
  }

  FacetNames = [
    'NftManager',
    'NFTReceiverFacet',
    'OwnershipFacet',
  ]
  const cut2 = []
  for (const FacetName of FacetNames) {
    const Facet = await ethers.getContractFactory(FacetName)
    const facet = await Facet.deploy({
      gasPrice: ethers.utils.parseUnits(
        Math.ceil(await gasEstimator.estimate()).toString(),
        "gwei"
      ),
    })
    await facet.deployed()
    console.log(`${FacetName} deployed: ${facet.address}`)
    cut2.push({
      facetAddress: facet.address,
      facetAction: FacetCutAction.Add,
      storageAction: StorageAction.None,
      deprecatedFacetAddress: ethers.constants.AddressZero,
      functionSelectors: getSelectors(facet)
    })
    createAbiJSON(Facet, FacetName)
  }

  // upgrade diamond with facets
  console.log('')
  // console.log('Diamond Cut:', cut)
  const diamondCut = await ethers.getContractAt('IDiamondCut', diamond.address)
  let tx
  let receipt
  // call to init function
  let functionCall = diamondInit.interface.encodeFunctionData('init')
  console.log("diamondInit.address, functionCall",diamondInit.address, functionCall)
  tx = await diamondCut.diamondCut(cut, diamondInit.address, functionCall, {
		gasPrice: ethers.utils.parseUnits(
			Math.ceil(await gasEstimator.estimate()).toString(),
			"gwei"
		),
	})
  console.log('Diamond cut tx: ', tx.hash)
  receipt = await tx.wait()

  // cut1
  tx = await diamondCut.diamondCut(cut1, constants.AddressZero, "0x", {
		gasPrice: ethers.utils.parseUnits(
			Math.ceil(await gasEstimator.estimate()).toString(),
			"gwei"
		),
	})
  console.log('Diamond cut tx: ', tx.hash)
  receipt = await tx.wait()

  // cut2
  tx = await diamondCut.diamondCut(cut2, constants.AddressZero, "0x", {
		gasPrice: ethers.utils.parseUnits(
			Math.ceil(await gasEstimator.estimate()).toString(),
			"gwei"
		),
	})
  console.log('Diamond cut tx: ', tx.hash)
  receipt = await tx.wait()

  if (!receipt.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`)
  }
  console.log('Completed diamond cut\n')

  // Update platform fee and reciient address
  const marketplaceManager = await ethers.getContractAt("MarketplaceManager",diamond.address);
  tx = await marketplaceManager.updatePlatformFee(1500, {
		gasPrice: ethers.utils.parseUnits(
			Math.ceil(await gasEstimator.estimate()).toString(),
			"gwei"
		),
	});
  await tx.wait()
  console.log("Platform fee updated: ",tx.hash)

  tx = await marketplaceManager.updatePlatformFeeRecipient(accounts[0].address, {
		gasPrice: ethers.utils.parseUnits(
			Math.ceil(await gasEstimator.estimate()).toString(),
			"gwei"
		),
	});
  await tx.wait()
  console.log("Platform fee recepient: ",tx.hash)

  // Adding USDC as payment
  tx = await marketplaceManager.addTokenFeed(USDC_ADDRESS, USDC_CHAINLINK_FEED, {
		gasPrice: ethers.utils.parseUnits(
			Math.ceil(await gasEstimator.estimate()).toString(),
			"gwei"
		),
	});
  await tx.wait()
  console.log("USDC feed added: ",tx.hash)

  return diamond.address
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  deployDiamond()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}
const stringToBytes = (str) => ethers.utils.hexlify(ethers.utils.toUtf8Bytes(str))

/// CREATE ABI OF CONTRACTS
function createAbiJSON(artifact, filename) {
  const data = JSON.parse(artifact.interface.format("json"));
  writeFileSync(`${__dirname}/../abi/${filename}.json`, JSON.stringify(data));
}

exports.deployDiamond = deployDiamond
exports.stringToBytes = stringToBytes