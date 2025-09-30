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

const { VERSION_TOKENS, NODE_TOKENS, DEPLOY_KEY  } = process.env

let ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

if (TARGET_CHAIN.optionsToken === ZERO_ADDRESS) throw new Error(`Tokens: missing options token contract for ${TARGET_CHAIN.network}`)
if (TARGET_CHAIN.escrowToken === ZERO_ADDRESS) throw new Error(`Tokens: missing escrow token contract for ${TARGET_CHAIN.network}`)

execSync(`graph deploy ${TARGET_CHAIN.tokensName} --version-label ${VERSION_TOKENS} --node ${NODE_TOKENS || "https://subgraphs.alchemy.com/api/subgraphs/deploy"} --deploy-key ${DEPLOY_KEY} --ipfs https://ipfs.satsuma.xyz`, { stdio: 'inherit' })