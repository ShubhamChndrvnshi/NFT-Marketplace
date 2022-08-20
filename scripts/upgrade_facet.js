const { getSelectors, FacetCutAction, StorageAction } = require('./libraries/diamond.js');

task("upgradefacet", "Upgrade facet function of diamond")
  .addParam("facetname", "Facet name")
  .addParam("diamondaddress", "Diamond address")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const DiamondCutFacet = await ethers.getContractAt('DiamondCutFacet', taskArgs.diamondaddress);
    const Facet = await ethers.getContractFactory(taskArgs.facetname)
    const facet = await Facet.deploy()
    await facet.deployed()

    const tx = await DiamondCutFacet.diamondCut(
      [{
        facetAddress: facet.address,
        facetAction: FacetCutAction.Replace,
        storageAction: StorageAction.None,
        deprecatedFacetAddress: ethers.constants.AddressZero,
        functionSelectors: getSelectors(Facet)
      }], ethers.constants.AddressZero, "0x");
    await tx.wait();
    console.log("Facet upgrade Tx: ", tx.hash);
  });
module.exports = {};
