require("@nomiclabs/hardhat-waffle");
require("dotenv").config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
// task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
//   const accounts = await hre.ethers.getSigners();

//   for (const account of accounts) {
//     console.log(account.address);
//   }
// });

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.4",
  networks: {
    matic: {
      url: `https://nd-462-884-459.p2pify.com/70eaca77551eac07163154a14c5e9432`,
      accounts: [`${process.env.MNEMONIC}`],
      gas: 2100000,
      gasPrice: 8000000000,
      chainId: 80001
    }
  }
};
