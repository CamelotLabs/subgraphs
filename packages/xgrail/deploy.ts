import TARGET_CHAIN from "common/generated/targetChain"
import { fileURLToPath } from 'url'
import path from "path"
import {execSync} from "child_process"
import dotenv from "dotenv"

const getCurrentDir = () => {
  const __filename = fileURLToPath(import.meta.url)
  return path.dirname(__filename)
}
const currentDir = getCurrentDir()
dotenv.config({ path: path.resolve(currentDir, '../../.env') });

const { VERSION_XGRAIL, NODE_XGRAIL, DEPLOY_KEY  } = process.env

let ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

// Only deploy on Arbitrum One since xGRAIL only exists there
if (TARGET_CHAIN.network !== 'arbitrum-one') {
  throw new Error(`xGRAIL: xGRAIL token only exists on Arbitrum One, not on ${TARGET_CHAIN.network}`)
}

const subgraphName = 'camelot-xgrail'

execSync(`graph deploy ${subgraphName} --version-label ${VERSION_XGRAIL || 'v1.0.0'} --node ${NODE_XGRAIL || "https://subgraphs.alchemy.com/api/subgraphs/deploy"} --deploy-key ${DEPLOY_KEY} --ipfs https://ipfs.satsuma.xyz`, { stdio: 'inherit' })