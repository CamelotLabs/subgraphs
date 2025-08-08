import TARGET_CHAIN from "common/helpers/createTargetChain"
import { loadSubgraphConfig, saveSubgraphConfig } from "common/helpers/subgraphConfig"

const {
  // UNIVERSAL SELECTED CHAIN PARAM - USED FOR `network` IN `subgraph.yaml`
  network,
  startBlock,
  apiVersion,
} = TARGET_CHAIN

// xGRAIL token address for Arbitrum One
const XGRAIL_TOKEN_ADDRESS = '0x3CAaE25Ee616f2C8E13C74dA0813402eae3F496b'

const { subgraphYaml, subgraphPath } = loadSubgraphConfig()

const xGrailDataSource = subgraphYaml.dataSources[0]

xGrailDataSource.network = network
xGrailDataSource.source.address = XGRAIL_TOKEN_ADDRESS.toLowerCase()
xGrailDataSource.source.startBlock = startBlock
xGrailDataSource.mapping.apiVersion = apiVersion

saveSubgraphConfig(subgraphYaml, subgraphPath)