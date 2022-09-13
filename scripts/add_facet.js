const { getSelectors, FacetCutAction, StorageAction } = require('./libraries/diamond.js');
const GasEstimator = require("./gasEstimator");
// npx hardhat addFacets --facetname facetName --diamondaddress address
task("addFacets", "Adds one or more facets to diamond")
    .addParam("facetname", "Facet name")
    .addParam("diamondaddress", "Diamond address")
    .setAction(async (taskArgs, hre) => {
        const gasEstimator = new GasEstimator("polygon");
        const { ethers } = hre;

        // const wallet = new ethers.Wallet(process.env.PRIV_KEY, new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545/"))

        const DiamondCutFacet = await ethers.getContractAt('DiamondCutFacet', taskArgs.diamondaddress);
        const Facet = await ethers.getContractFactory(taskArgs.facetname)
        const facet = await Facet.deploy({
            gasPrice: ethers.utils.parseUnits(
                Math.ceil(await gasEstimator.estimate()).toString(),
                "gwei"
            ),
        })
        await facet.deployed()
        console.log(`${taskArgs.facetname}: ${facet.address}`)

        const tx = await DiamondCutFacet
        // .connect(wallet)
        .diamondCut(
            [{
                facetAddress: facet.address,
                facetAction: FacetCutAction.Add,
                storageAction: StorageAction.None,
                deprecatedFacetAddress: ethers.constants.AddressZero,
                functionSelectors: getSelectors(facet)
            }], ethers.constants.AddressZero, "0x", {
            gasPrice: ethers.utils.parseUnits(
                Math.ceil(await gasEstimator.estimate()).toString(),
                "gwei"
            ),
        });
        await tx.wait();
        console.log("Facet add Tx: ", tx.hash);
    });
module.exports = {};
