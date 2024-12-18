import fs from "fs"
import { fileURLToPath } from 'url'
import path from "path"
import ChainInfo from "./chainInfo.ts"
import dotenv from "dotenv"

const getCurrentDir = () => {
  const __filename = fileURLToPath(import.meta.url)
  return path.dirname(__filename)
}
const currentDir = getCurrentDir()
dotenv.config({ path: path.resolve(currentDir, '../../../.env') });

const chainConfigRaw = fs.readFileSync(path.resolve(currentDir, '../generated/chainConfig.json'), "utf-8")
const chainConfig = JSON.parse(chainConfigRaw)
const TARGET_CHAIN_ID = process.env.CHAIN_ID || "42161"

const config = chainConfig.find(chain => parseInt(chain.id) === parseInt(TARGET_CHAIN_ID))

if (!config) throw new Error("Chain ID not supported")

const subgraphConfig = config?.subgraphs.config

// UNIVERSAL SELECTED CHAIN PARAM - USED FOR `network` IN `subgraph.yaml`
const network = subgraphConfig?.network || "arbitrum-one"

// UNIVERSAL PARAMS
const whitelistTokens = subgraphConfig?.whitelistTokens.map(token => token.toLowerCase())
const stableCoins = subgraphConfig?.stableCoins.map(coin => coin.toLowerCase())
const minimumUSDThresholdNewPairs = subgraphConfig?.minimumUSDThresholdNewPairs
const minimumLiquidityThresholdETH = subgraphConfig?.minimumLiquidityThresholdETH
const minimumLiquidityETH = subgraphConfig?.minimumLiquidityETH
const startBlock = subgraphConfig?.startBlock
const apiVersion = subgraphConfig?.apiVersion

// AMM V2 PARAMS
const ammv2Name = config?.subgraphs.ammV2.name
const factoryV2 = config?.contracts.factoryV2?.toLowerCase()
const wrappedNativeV2 = config?.assets.native.address.toLowerCase()
const wrappedNativeUSDCPoolV2 = config?.assets.nativePairV2?.toLowerCase()
const stableCoin = config?.assets.stable.toLowerCase()

// AMM V3 PARAMS
const ammv3Name = config?.subgraphs.ammV3.name
const factoryV3 = config?.contracts.factoryV3?.toLowerCase()
const nftPositionManagerV3 = config?.contracts.nftPositionManagerV3?.toLowerCase()
const wrappedNativeV3 = config?.assets.native.address.toLowerCase()
const wrappedNativeUSDCPoolV3 = config?.assets.nativePairV3?.toLowerCase()

// AMM V4 PARAMS
const ammv4Name = config?.subgraphs.ammV4.name
const factoryV4 = config?.contracts.factoryV4?.toLowerCase()
const nftPositionManagerV4 = config?.contracts.nftPositionManagerV4?.toLowerCase()
const wrappedNativeV4 = config?.assets.native.address.toLowerCase()
const wrappedNativeUSDCPoolV4 = config?.assets.nativePairV4?.toLowerCase()

// INCENTIVES PARAMS
const incentivesName = config?.subgraphs.incentives.name
const campaignFactory = config?.contracts.campaignFactory?.toLowerCase()
const distributor = config?.contracts.distributor?.toLowerCase()

// BLOCKS PARAMS
const blocksName = config?.subgraphs.blocks.name

console.log("AMMv2", config?.subgraphs.ammV2)
console.log("AMMv3", config?.subgraphs.ammV3)
console.log("AMMv4", config?.subgraphs.ammV4)
console.log("blocks", config?.subgraphs.blocks)
console.log("incentives", config?.subgraphs.incentives)

const TARGET_CHAIN: ChainInfo = new ChainInfo(
  network,

  whitelistTokens,
  stableCoins,
  minimumUSDThresholdNewPairs,
  minimumLiquidityThresholdETH,
  minimumLiquidityETH,
  startBlock,
  apiVersion,

  // AMM V2 PARAMS
  ammv2Name,
  factoryV2,
  wrappedNativeV2,
  wrappedNativeUSDCPoolV2,
  stableCoin,

  // AMM V3 PARAMS
  ammv3Name,
  factoryV3,
  nftPositionManagerV3,
  wrappedNativeV3,
  wrappedNativeUSDCPoolV3,

  // AMM V4 PARAMS
  ammv4Name,
  factoryV4,
  nftPositionManagerV4,
  wrappedNativeV4,
  wrappedNativeUSDCPoolV4,

  // BLOCKS PARAMS
  blocksName,

  // INCENTIVES PARAMS
  incentivesName,
  campaignFactory,
  distributor
)

const targetChainContent = `
// @ts-nocheck

// *********************************************************
// THIS IS A GENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.
// *********************************************************

import ChainInfo from '../helpers/chainInfo';

const TARGET_CHAIN: ChainInfo = new ChainInfo(
  "${network}",

  // UNIVERSAL PARAMS
  ${JSON.stringify(whitelistTokens)},
  ${JSON.stringify(stableCoins)},
  "${minimumUSDThresholdNewPairs}",
  "${minimumLiquidityThresholdETH}",
  "${minimumLiquidityETH}",
  ${startBlock},
  "${apiVersion}",

  "${ammv2Name}",
  "${factoryV2}",
  "${wrappedNativeV2}",
  "${wrappedNativeUSDCPoolV2}",
  "${stableCoin}",
  
  "${ammv3Name}",
  "${factoryV3}",
  "${nftPositionManagerV3}",
  "${wrappedNativeV3}",
  "${wrappedNativeUSDCPoolV3}",

  "${ammv4Name}",
  "${factoryV4}",
  "${nftPositionManagerV4}",
  "${wrappedNativeV4}",
  "${wrappedNativeUSDCPoolV4}",

  "${incentivesName}",
  "${campaignFactory}",
  "${distributor}",

  "${blocksName}",
);

export default TARGET_CHAIN;
`

// write chain config to a separate TS file
fs.writeFileSync(path.resolve(currentDir, "../generated/targetChain.ts"), targetChainContent)

export default TARGET_CHAIN