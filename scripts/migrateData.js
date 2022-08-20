/* global ethers */
/* eslint prefer-const: "off" */

const { BigNumber, constants } = require('ethers');
const { writeFileSync } = require("fs");
const { ethers } = require('hardhat');
const GasEstimator = require("./gasEstimator");
const data = [
    {
        "assetId": "11",
        "nftAddress": "0xb69009F82eAC04A04E384B6e37b3C6cD1C6C5502",
        "seller": "0xf9940ef8e8125212c6fd5d5fee82f8de5a90bd8e",
        "createdAt": "2022-03-31T11:40:16.052Z",
        "expiresAt": "2022-07-31T00:00:00.000Z",
        "price": "100",
        "stock": 1
    },
    {
        "assetId": "6",
        "nftAddress": "0xb69009F82eAC04A04E384B6e37b3C6cD1C6C5502",
        "seller": "0xf9940ef8e8125212c6fd5d5fee82f8de5a90bd8e",
        "createdAt": "2022-03-31T11:34:52.386Z",
        "expiresAt": "2022-07-31T00:00:00.000Z",
        "price": "500",
        "stock": 1
    },
    {
        "assetId": "8",
        "nftAddress": "0x284C4f19aAfcb1acBFA50f08D1E232f54d345d63",
        "seller": "0x4df79bf85bcfe7b9c63c280b37da102abd1ef5ff",
        "createdAt": "2022-03-31T14:27:01.575Z",
        "expiresAt": "2022-03-31T14:26:59.000Z",
        "price": "50",
        "stock": 100
    },
    {
        "assetId": "1",
        "nftAddress": "0x284C4f19aAfcb1acBFA50f08D1E232f54d345d63",
        "seller": "0x4df79bf85bcfe7b9c63c280b37da102abd1ef5ff",
        "createdAt": "2022-03-31T14:22:35.710Z",
        "expiresAt": "2022-03-31T14:22:35.000Z",
        "price": "50",
        "stock": 100
    },
    {
        "assetId": "20",
        "nftAddress": "0x284C4f19aAfcb1acBFA50f08D1E232f54d345d63",
        "seller": "0x4df79bf85bcfe7b9c63c280b37da102abd1ef5ff",
        "createdAt": "2022-03-31T14:33:12.353Z",
        "expiresAt": "2022-03-31T14:33:11.000Z",
        "price": "50",
        "stock": 100
    },
    {
        "assetId": "5",
        "nftAddress": "0x284C4f19aAfcb1acBFA50f08D1E232f54d345d63",
        "seller": "0x4df79bf85bcfe7b9c63c280b37da102abd1ef5ff",
        "createdAt": "2022-03-31T14:25:13.986Z",
        "expiresAt": "2022-03-31T14:25:13.000Z",
        "price": "50",
        "stock": 100
    },
    {
        "assetId": "7",
        "nftAddress": "0x284C4f19aAfcb1acBFA50f08D1E232f54d345d63",
        "seller": "0x4df79bf85bcfe7b9c63c280b37da102abd1ef5ff",
        "createdAt": "2022-03-31T14:26:24.459Z",
        "expiresAt": "2022-03-31T14:26:23.000Z",
        "price": "50",
        "stock": 100
    },
    {
        "assetId": "3",
        "nftAddress": "0xc8e1aFD06F20bec84E7A91aEc318F79a696a7bcd",
        "seller": "0x1b57779fcfa1cf855869097d03b9830147176099",
        "createdAt": "2022-03-31T09:41:59.384Z",
        "expiresAt": "2022-03-31T09:41:39.000Z",
        "price": "1500",
        "stock": 1
    },
    {
        "assetId": "9",
        "nftAddress": "0xb69009F82eAC04A04E384B6e37b3C6cD1C6C5502",
        "seller": "0xf9940ef8e8125212c6fd5d5fee82f8de5a90bd8e",
        "createdAt": "2022-03-31T11:37:40.368Z",
        "expiresAt": "2022-03-31T11:37:40.000Z",
        "price": "50",
        "stock": 50
    },
    {
        "assetId": "9",
        "nftAddress": "0x284C4f19aAfcb1acBFA50f08D1E232f54d345d63",
        "seller": "0x4df79bf85bcfe7b9c63c280b37da102abd1ef5ff",
        "createdAt": "2022-03-31T14:27:43.814Z",
        "expiresAt": "2022-03-31T14:27:43.000Z",
        "price": "50",
        "stock": 100
    },
    {
        "assetId": "3",
        "nftAddress": "0xb69009F82eAC04A04E384B6e37b3C6cD1C6C5502",
        "seller": "0xf9940ef8e8125212c6fd5d5fee82f8de5a90bd8e",
        "createdAt": "2022-03-31T11:30:36.377Z",
        "expiresAt": "2022-07-31T00:00:00.000Z",
        "price": "1200",
        "stock": 1
    },
    {
        "assetId": "12",
        "nftAddress": "0x284C4f19aAfcb1acBFA50f08D1E232f54d345d63",
        "seller": "0x4df79bf85bcfe7b9c63c280b37da102abd1ef5ff",
        "createdAt": "2022-03-31T14:28:53.338Z",
        "expiresAt": "2022-03-31T14:28:51.000Z",
        "price": "50",
        "stock": 100
    },
    {
        "assetId": "0",
        "nftAddress": "0xc8e1aFD06F20bec84E7A91aEc318F79a696a7bcd",
        "seller": "0x1b57779fcfa1cf855869097d03b9830147176099",
        "createdAt": "2022-03-31T09:40:00.268Z",
        "expiresAt": "2022-03-31T09:39:47.000Z",
        "price": "1200",
        "stock": 1
    },
    {
        "assetId": "10",
        "nftAddress": "0x284C4f19aAfcb1acBFA50f08D1E232f54d345d63",
        "seller": "0x4df79bf85bcfe7b9c63c280b37da102abd1ef5ff",
        "createdAt": "2022-03-31T14:27:27.979Z",
        "expiresAt": "2022-03-31T14:27:23.000Z",
        "price": "50",
        "stock": 100
    },
    {
        "assetId": "1",
        "nftAddress": "0xb69009F82eAC04A04E384B6e37b3C6cD1C6C5502",
        "seller": "0xf9940ef8e8125212c6fd5d5fee82f8de5a90bd8e",
        "createdAt": "2022-03-31T11:29:04.920Z",
        "expiresAt": "2022-07-31T00:00:00.000Z",
        "price": "800",
        "stock": 1
    },
    {
        "assetId": "5",
        "nftAddress": "0xb69009F82eAC04A04E384B6e37b3C6cD1C6C5502",
        "seller": "0xf9940ef8e8125212c6fd5d5fee82f8de5a90bd8e",
        "createdAt": "2022-03-31T11:34:02.759Z",
        "expiresAt": "2022-07-31T00:00:00.000Z",
        "price": "500",
        "stock": 1
    },
    {
        "assetId": "12",
        "nftAddress": "0xb69009F82eAC04A04E384B6e37b3C6cD1C6C5502",
        "seller": "0xf9940ef8e8125212c6fd5d5fee82f8de5a90bd8e",
        "createdAt": "2022-03-31T11:39:50.566Z",
        "expiresAt": "2022-03-31T11:39:50.000Z",
        "price": "20",
        "stock": 50
    },
    {
        "assetId": "3",
        "nftAddress": "0x284C4f19aAfcb1acBFA50f08D1E232f54d345d63",
        "seller": "0x4df79bf85bcfe7b9c63c280b37da102abd1ef5ff",
        "createdAt": "2022-03-31T14:23:52.487Z",
        "expiresAt": "2022-03-31T14:23:51.000Z",
        "price": "50",
        "stock": 100
    },
    {
        "assetId": "2",
        "nftAddress": "0xb69009F82eAC04A04E384B6e37b3C6cD1C6C5502",
        "seller": "0xf9940ef8e8125212c6fd5d5fee82f8de5a90bd8e",
        "createdAt": "2022-03-31T11:29:48.320Z",
        "expiresAt": "2022-07-31T00:00:00.000Z",
        "price": "1000",
        "stock": 1
    },
    {
        "assetId": "4",
        "nftAddress": "0xb69009F82eAC04A04E384B6e37b3C6cD1C6C5502",
        "seller": "0xf9940ef8e8125212c6fd5d5fee82f8de5a90bd8e",
        "createdAt": "2022-03-31T11:31:55.724Z",
        "expiresAt": "2022-07-31T00:00:00.000Z",
        "price": "500",
        "stock": 1
    },
    {
        "assetId": "18",
        "nftAddress": "0x284C4f19aAfcb1acBFA50f08D1E232f54d345d63",
        "seller": "0x4df79bf85bcfe7b9c63c280b37da102abd1ef5ff",
        "createdAt": "2022-03-31T14:31:59.552Z",
        "expiresAt": "2022-03-31T14:31:59.000Z",
        "price": "50",
        "stock": 100
    },
    {
        "assetId": "0",
        "nftAddress": "0xb69009F82eAC04A04E384B6e37b3C6cD1C6C5502",
        "seller": "0xf9940ef8e8125212c6fd5d5fee82f8de5a90bd8e",
        "createdAt": "2022-03-31T11:28:20.260Z",
        "expiresAt": "2022-07-31T00:00:00.000Z",
        "price": "600",
        "stock": 1
    },
    {
        "assetId": "0",
        "nftAddress": "0x284C4f19aAfcb1acBFA50f08D1E232f54d345d63",
        "seller": "0x4df79bf85bcfe7b9c63c280b37da102abd1ef5ff",
        "createdAt": "2022-03-31T14:21:17.460Z",
        "expiresAt": "2022-03-31T14:21:17.000Z",
        "price": "50",
        "stock": 100
    },
    {
        "assetId": "17",
        "nftAddress": "0x284C4f19aAfcb1acBFA50f08D1E232f54d345d63",
        "seller": "0x4df79bf85bcfe7b9c63c280b37da102abd1ef5ff",
        "createdAt": "2022-03-31T14:31:38.082Z",
        "expiresAt": "2022-03-31T14:31:37.000Z",
        "price": "50",
        "stock": 100
    },
    {
        "assetId": "16",
        "nftAddress": "0x284C4f19aAfcb1acBFA50f08D1E232f54d345d63",
        "seller": "0x4df79bf85bcfe7b9c63c280b37da102abd1ef5ff",
        "createdAt": "2022-03-31T14:31:14.088Z",
        "expiresAt": "2022-03-31T14:31:13.000Z",
        "price": "50",
        "stock": 100
    },
    {
        "assetId": "14",
        "nftAddress": "0x284C4f19aAfcb1acBFA50f08D1E232f54d345d63",
        "seller": "0x4df79bf85bcfe7b9c63c280b37da102abd1ef5ff",
        "createdAt": "2022-03-31T14:30:20.318Z",
        "expiresAt": "2022-03-31T14:30:15.000Z",
        "price": "50",
        "stock": 100
    },
    {
        "assetId": "8",
        "nftAddress": "0xb69009F82eAC04A04E384B6e37b3C6cD1C6C5502",
        "seller": "0xf9940ef8e8125212c6fd5d5fee82f8de5a90bd8e",
        "createdAt": "2022-03-31T11:41:37.964Z",
        "expiresAt": "2022-07-31T00:00:00.000Z",
        "price": "250",
        "stock": 1
    },
    {
        "assetId": "11",
        "nftAddress": "0x284C4f19aAfcb1acBFA50f08D1E232f54d345d63",
        "seller": "0x4df79bf85bcfe7b9c63c280b37da102abd1ef5ff",
        "createdAt": "2022-03-31T14:28:23.230Z",
        "expiresAt": "2022-03-31T14:28:21.000Z",
        "price": "50",
        "stock": 100
    },
    {
        "assetId": "13",
        "nftAddress": "0x284C4f19aAfcb1acBFA50f08D1E232f54d345d63",
        "seller": "0x4df79bf85bcfe7b9c63c280b37da102abd1ef5ff",
        "createdAt": "2022-03-31T14:29:24.828Z",
        "expiresAt": "2022-03-31T14:29:23.000Z",
        "price": "50",
        "stock": 100
    },
    {
        "assetId": "10",
        "nftAddress": "0xb69009F82eAC04A04E384B6e37b3C6cD1C6C5502",
        "seller": "0xf9940ef8e8125212c6fd5d5fee82f8de5a90bd8e",
        "createdAt": "2022-03-31T11:38:39.156Z",
        "expiresAt": "2022-07-31T00:00:00.000Z",
        "price": "100",
        "stock": 1
    },
    {
        "assetId": "2",
        "nftAddress": "0xc8e1aFD06F20bec84E7A91aEc318F79a696a7bcd",
        "seller": "0x1b57779fcfa1cf855869097d03b9830147176099",
        "createdAt": "2022-03-31T09:41:22.494Z",
        "expiresAt": "2022-03-31T09:41:12.000Z",
        "price": "2000",
        "stock": 1
    },
    {
        "assetId": "15",
        "nftAddress": "0x284C4f19aAfcb1acBFA50f08D1E232f54d345d63",
        "seller": "0x4df79bf85bcfe7b9c63c280b37da102abd1ef5ff",
        "createdAt": "2022-03-31T14:30:42.223Z",
        "expiresAt": "2022-03-31T14:30:39.000Z",
        "price": "50",
        "stock": 100
    },
    {
        "assetId": "6",
        "nftAddress": "0x284C4f19aAfcb1acBFA50f08D1E232f54d345d63",
        "seller": "0x4df79bf85bcfe7b9c63c280b37da102abd1ef5ff",
        "createdAt": "2022-03-31T14:26:02.049Z",
        "expiresAt": "2022-03-31T14:25:59.000Z",
        "price": "50",
        "stock": 100
    },
    {
        "assetId": "2",
        "nftAddress": "0x284C4f19aAfcb1acBFA50f08D1E232f54d345d63",
        "seller": "0x4df79bf85bcfe7b9c63c280b37da102abd1ef5ff",
        "createdAt": "2022-03-31T14:23:06.801Z",
        "expiresAt": "2022-03-31T14:23:05.000Z",
        "price": "50",
        "stock": 100
    },
    {
        "assetId": "19",
        "nftAddress": "0x284C4f19aAfcb1acBFA50f08D1E232f54d345d63",
        "seller": "0x4df79bf85bcfe7b9c63c280b37da102abd1ef5ff",
        "createdAt": "2022-03-31T14:32:34.272Z",
        "expiresAt": "2022-03-31T14:32:33.000Z",
        "price": "50",
        "stock": 100
    },
    {
        "assetId": "1",
        "nftAddress": "0xc8e1aFD06F20bec84E7A91aEc318F79a696a7bcd",
        "seller": "0x1b57779fcfa1cf855869097d03b9830147176099",
        "createdAt": "2022-03-31T09:40:50.515Z",
        "expiresAt": "2022-03-31T09:40:39.000Z",
        "price": "1300",
        "stock": 1
    },
    {
        "assetId": "7",
        "nftAddress": "0xb69009F82eAC04A04E384B6e37b3C6cD1C6C5502",
        "seller": "0xf9940ef8e8125212c6fd5d5fee82f8de5a90bd8e",
        "createdAt": "2022-03-31T11:35:24.105Z",
        "expiresAt": "2022-03-31T11:35:22.000Z",
        "price": "50",
        "stock": 50
    },
    {
        "assetId": "4",
        "nftAddress": "0xc8e1aFD06F20bec84E7A91aEc318F79a696a7bcd",
        "seller": "0x1b57779fcfa1cf855869097d03b9830147176099",
        "createdAt": "2022-03-31T09:42:32.433Z",
        "expiresAt": "2022-03-31T09:42:24.000Z",
        "price": "1300",
        "stock": 1
    },
    {
        "assetId": "4",
        "nftAddress": "0x284C4f19aAfcb1acBFA50f08D1E232f54d345d63",
        "seller": "0x4df79bf85bcfe7b9c63c280b37da102abd1ef5ff",
        "createdAt": "2022-03-31T14:24:22.171Z",
        "expiresAt": "2022-03-31T14:24:21.000Z",
        "price": "50",
        "stock": 100
    }
];

async function deployDiamond() {
    const accounts = await ethers.getSigners()
    const contractOwner = accounts[0]
    const gasEstimator = new GasEstimator("polygon");

    const diamond = "0xD0c2e8B5718ecbD24928221A34739aB365C1a2cD"

    const migrationFacet = await ethers.getContractAt('MigrationFacet', diamond)

    for (let i = 0; i < data.length; i++) {
        console.log({
            nftAddress: data[i].nftAddress, 
            assetId:data[i].assetId
        })
        const tx = await migrationFacet.MigrateListing(data[i].nftAddress, data[i].assetId, data[i].stock, data[i].price, 
            Math.floor(new Date().getTime()/1000), Math.floor(new Date(data[i].expiresAt).getTime()/1000),
            data[i].seller, {
            gasPrice: ethers.utils.parseUnits(
                Math.ceil(await gasEstimator.estimate()).toString(),
                "gwei"
            ),
        })
        console.log('migrationFacet tx: ', tx.hash)
        const receipt = await tx.wait()
    }
    
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


exports.deployDiamond = deployDiamond
exports.stringToBytes = stringToBytes