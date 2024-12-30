let ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
class ChainInfo {
  // UNIVERSAL SELECTED CHAIN PARAM - USED FOR `network` IN `subgraph.yaml`
  network: string;

  // UNIVERSAL PARAMS
  whitelistTokens: Array<string>;
  stableCoins: Array<string>;
  wrappedNative: string;
  minimumUSDThresholdNewPairs: string;
  minimumLiquidityThresholdETH: string;
  minimumLiquidityETH: string;
  startBlock: number;
  apiVersion: string;

  // AMM V2 PARAMS
  ammv2Name: string;
  factoryV2: string;
  wrappedNativeUSDCPoolV2: string;
  stableCoin: string;

  // AMM V3 PARAMS
  ammv3Name: string;
  factoryV3: string;
  nftPositionManagerV3: string;
  wrappedNativeUSDCPoolV3: string;

  // AMM V4 PARAMS
  ammv4Name: string;
  factoryV4: string;
  nftPositionManagerV4: string;
  wrappedNativeUSDCPoolV4: string;

  // BLOCKS PARAMS
  blocksName: string;

  // INCENTIVES PARAMS
  incentivesName: string;
  campaignFactory: string;
  distributor: string;

  constructor(
    // UNIVERSAL SELECTED CHAIN PARAM - USED FOR `network` IN `subgraph.yaml`
    network: string,

  // UNIVERSAL PARAMS
    whitelistTokens: Array<string>,
    stableCoins: Array<string>,
    wrappedNative: string,
    minimumUSDThresholdNewPairs: string,
    minimumLiquidityThresholdETH: string,
    minimumLiquidityETH: string,
    startBlock: number,
    apiVersion: string,

    // AMM V2 PARAMS
    ammv2Name: string,
    factoryV2: string,
    wrappedNativeUSDCPoolV2: string,
    stableCoin: string,
    // AMM V3 PARAMS
    ammv3Name: string,
    factoryV3: string,
    nftPositionManagerV3: string,
    wrappedNativeUSDCPoolV3: string,

    // AMM V4 PARAMS
    ammv4Name: string,
    factoryV4: string,
    nftPositionManagerV4: string,
    wrappedNativeUSDCPoolV4: string,

    // INCENTIVES PARAMS
    incentivesName: string,
    campaignFactory: string,
    distributor: string,

    // BLOCKS PARAMS
    blocksName: string,
  ) {
    // UNIVERSAL SELECTED CHAIN PARAM - USED FOR `network` IN `subgraph.yaml`
    this.network = network.toLowerCase()

    // UNIVERSAL PARAMS
    this.whitelistTokens = whitelistTokens ? whitelistTokens.map<string>((t: string): string => t.toLowerCase()) : [ZERO_ADDRESS]
    this.stableCoins = stableCoins ? stableCoins.map<string>((t: string): string => t.toLowerCase()) : [ZERO_ADDRESS]
    this.wrappedNative = wrappedNative ? wrappedNative.toLowerCase() : ZERO_ADDRESS
    this.minimumUSDThresholdNewPairs = minimumUSDThresholdNewPairs
    this.minimumLiquidityThresholdETH = minimumLiquidityThresholdETH
    this.minimumLiquidityETH = minimumLiquidityETH
    this.startBlock = startBlock
    this.apiVersion = apiVersion

    // AMM V2 PARAMS
    this.ammv2Name = ammv2Name
    this.factoryV2 = factoryV2 ? factoryV2.toLowerCase() : ZERO_ADDRESS
    this.wrappedNativeUSDCPoolV2 = wrappedNativeUSDCPoolV2 ? wrappedNativeUSDCPoolV2.toLowerCase() : ZERO_ADDRESS
    this.stableCoin = stableCoin ? stableCoin.toLowerCase() : ZERO_ADDRESS
    // AMM V3 PARAMS
    this.ammv3Name = ammv3Name
    this.factoryV3 = factoryV3 ? factoryV3.toLowerCase() : ZERO_ADDRESS
    this.nftPositionManagerV3 = nftPositionManagerV3 ? nftPositionManagerV3.toLowerCase() : ZERO_ADDRESS
    this.wrappedNativeUSDCPoolV3 = wrappedNativeUSDCPoolV3 ? wrappedNativeUSDCPoolV3.toLowerCase() : ZERO_ADDRESS

    // AMM V4 PARAMS
    this.ammv4Name = ammv4Name
    this.factoryV4 = factoryV4 ? factoryV4.toLowerCase() : ZERO_ADDRESS
    this.nftPositionManagerV4 = nftPositionManagerV4 ? nftPositionManagerV4.toLowerCase() : ZERO_ADDRESS
    this.wrappedNativeUSDCPoolV4 = wrappedNativeUSDCPoolV4 ? wrappedNativeUSDCPoolV4.toLowerCase() : ZERO_ADDRESS

    // INCENTIVES PARAMS
    this.incentivesName = incentivesName
    this.campaignFactory = campaignFactory ? campaignFactory.toLowerCase() : ZERO_ADDRESS
    this.distributor = distributor ? distributor.toLowerCase() : ZERO_ADDRESS

    // BLOCKS PARAMS
    this.blocksName = blocksName
  }
}

export default ChainInfo