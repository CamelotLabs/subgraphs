import TARGET_CHAIN from "common/helpers/createTargetChain"
import { loadSubgraphConfig, saveSubgraphConfig } from "common/helpers/subgraphConfig"

const {
  // UNIVERSAL SELECTED CHAIN PARAM - USED FOR `network` IN `subgraph.yaml`
  network,

  // TOKENS PARAMS
  startBlock,
  optionsToken: optionsTokenAddress,
  escrowToken: escrowTokenAddress,
} = TARGET_CHAIN

const { subgraphYaml, subgraphPath } = loadSubgraphConfig()

// Configure OptionsToken datasource
const optionsToken = subgraphYaml.dataSources[0] as any
optionsToken.network = network
if (optionsTokenAddress && optionsTokenAddress !== '0x0000000000000000000000000000000000000000') {
  optionsToken.source.address = optionsTokenAddress
}
optionsToken.source.startBlock = startBlock

// Configure EscrowToken datasource  
const escrowToken = subgraphYaml.dataSources[1] as any
escrowToken.network = network
if (escrowTokenAddress && escrowTokenAddress !== '0x0000000000000000000000000000000000000000') {
  escrowToken.source.address = escrowTokenAddress
}
escrowToken.source.startBlock = startBlock

saveSubgraphConfig(subgraphYaml, subgraphPath)