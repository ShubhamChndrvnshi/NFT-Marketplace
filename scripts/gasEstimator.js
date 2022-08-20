const axios = require("axios");

module.exports = class GasPriceEstimator {
  constructor(
    network,
    { level = "instant", adjustment = 0, requestTimeout = 30000 } = {}
  ) {
    this.network = network;
    this.level = level;
    this.adjustment = adjustment;
    this.fetcher = axios.create({ timeout: requestTimeout });
  }

  async estimate() {
    let gasInfo;
    switch (this.network) {
      case "ethereum":
        gasInfo = await this.onEthereum();
        break;
      case "bsc":
        gasInfo = await this.onBSC();
        break;
      case "polygon":
        gasInfo = await this.onPolygon();
        break;
      default:
        throw new Error(`unsupported network: ${this.network}`);
    }
    const gasPriceInGwei = gasInfo[this.level];
    // console.log("gas: ", gasPriceInGwei);
    return gasPriceInGwei * (1 + this.adjustment);
  }

  async onEthereum() {
    const apiKey =
      "30eb5515b1db7bd1a342d328af85bfbbc9e58ed0ddffac3979b5987d1c6a";
    const res = await this.fetcher.get(
      `https://ethgasstation.info/api/ethgasAPI.json?api-key=${apiKey}`
    );
    const data = res.data;
    return {
      instant: data.fastest / 10,
      fast: data.fast / 10,
      standard: data.average / 10,
      slow: data.safeLow / 10,
    };
  }

  async onBSC() {
    const res = await this.fetcher.get("https://owlracle.info/bsc/gas");
    const data = res.data;
    if (data.error !== undefined) {
      throw new Error(res.error);
    }
    let gas = 0, prevAcceptance = 0;
    data.speeds.forEach((speed)=>{
      if(prevAcceptance < speed.acceptance){
        prevAcceptance = speed.acceptance;
        gas = speed.gasPrice;
      }
    })
    return {
      instant: gas,
      fast: gas,
      standard: gas,
      slow: gas,
    };
  }

  async onPolygon() {
    const res = await this.fetcher.get(
      "https://gasstation-mainnet.matic.network"
    );
    const data = res.data;
    return {
      instant: data.fastest,
      fast: data.fast,
      standard: data.standard,
      slow: data.safeLow,
    };
  }
};