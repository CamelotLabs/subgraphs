import TARGET_CHAIN from "common/helpers/createTargetChain"
import { loadSubgraphConfig, saveSubgraphConfig } from "common/helpers/subgraphConfig"

const {
  // UNIVERSAL SELECTED CHAIN PARAM - USED FOR `network` IN `subgraph.yaml`
  network,

  // AMM V3 PARAMS
  factoryV3,
  nftPositionManagerV3,
  startBlock,
  apiVersion,
} = TARGET_CHAIN

const { subgraphYaml, subgraphPath } = loadSubgraphConfig()

const factory = subgraphYaml.dataSources[0]
const NFTPositionManager = subgraphYaml.dataSources[1]

factory.network = network
factory.source.address = factoryV3
factory.source.startBlock = startBlock
factory.mapping.apiVersion = apiVersion

NFTPositionManager.network = network
NFTPositionManager.source.address = nftPositionManagerV3
NFTPositionManager.source.startBlock = startBlock
NFTPositionManager.mapping.apiVersion = apiVersion

subgraphYaml.templates[0].network = network
subgraphYaml.templates[0].mapping.apiVersion = apiVersion

saveSubgraphConfig(subgraphYaml, subgraphPath)