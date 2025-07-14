/* eslint-disable prefer-const */
import {BigDecimal, log} from '@graphprotocol/graph-ts'
import { PairCreated, OwnerFeeShareUpdated } from '../../generated/Factory/Factory'
import { Bundle, Pair, Token, UniswapFactory } from '../../generated/schema'
import { Pair as PairTemplate } from '../../generated/templates'
import {
  fetchTokenDecimals,
  fetchTokenName,
  fetchTokenSymbol,
  // fetchTokenTotalSupply,
} from './helpers'
import {
  FACTORY_ADDRESS,
  ZERO_BD,
  ZERO_BI,
  OWNER_DEFAULT_FEE_SHARE
} from "./constants"

let BLACKLISTED_PAIRS: string[] = [
  // '0x6a78e84fa0edad4d99eb90edc041cdbf85925961', // AIDOGE/WETH
]

export function handleNewPair(event: PairCreated): void {
  // load factory (create if first exchange)
  let factory = UniswapFactory.load(FACTORY_ADDRESS)
  if (factory === null) {
    factory = new UniswapFactory(FACTORY_ADDRESS)
    factory.pairCount = 0
    factory.totalVolumeETH = ZERO_BD
    factory.totalLiquidityETH = ZERO_BD
    factory.totalVolumeUSD = ZERO_BD
    factory.untrackedVolumeUSD = ZERO_BD
    factory.totalLiquidityUSD = ZERO_BD
    factory.totalFeeUSD = ZERO_BD
    factory.totalFeeETH = ZERO_BD
    factory.txCount = ZERO_BI
    factory.ownerFeeShare = OWNER_DEFAULT_FEE_SHARE

    // create new bundle
    let bundle = new Bundle('1')
    bundle.ethPrice = ZERO_BD
    bundle.save()
  }
  factory.pairCount = factory.pairCount + 1
  factory.save()

  // create the tokens
  let token0 = Token.load(event.params.token0.toHexString())
  let token1 = Token.load(event.params.token1.toHexString())

  // fetch info if null
  if (token0 === null) {
    token0 = new Token(event.params.token0.toHexString())
    token0.symbol = fetchTokenSymbol(event.params.token0)
    token0.name = fetchTokenName(event.params.token0)
    token0.totalSupply = ZERO_BI
    let decimals = fetchTokenDecimals(event.params.token0)

    // bail if we couldn't figure out the decimals
    if (decimals === null) {
      log.debug('mybug the decimal on token 0 was null', [])
      return
    }

    token0.decimals = decimals
    token0.derivedETH = ZERO_BD
    token0.tradeVolume = ZERO_BD
    token0.tradeVolumeUSD = ZERO_BD
    token0.untrackedVolumeUSD = ZERO_BD
    token0.totalLiquidity = ZERO_BD
    // token0.allPairs = []
    token0.txCount = ZERO_BI
  }

  // fetch info if null
  if (token1 === null) {
    token1 = new Token(event.params.token1.toHexString())
    token1.symbol = fetchTokenSymbol(event.params.token1)
    token1.name = fetchTokenName(event.params.token1)
    token1.totalSupply = ZERO_BI
    let decimals = fetchTokenDecimals(event.params.token1)

    // bail if we couldn't figure out the decimals
    if (decimals === null) {
      return
    }
    token1.decimals = decimals
    token1.derivedETH = ZERO_BD
    token1.tradeVolume = ZERO_BD
    token1.tradeVolumeUSD = ZERO_BD
    token1.untrackedVolumeUSD = ZERO_BD
    token1.totalLiquidity = ZERO_BD
    token1.txCount = ZERO_BI
  }

  let pair = new Pair(event.params.pair.toHexString()) as Pair
  pair.token0 = token0.id
  pair.token1 = token1.id
  pair.liquidityProviderCount = ZERO_BI
  pair.createdAtTimestamp = event.block.timestamp
  pair.createdAtBlockNumber = event.block.number
  pair.txCount = ZERO_BI
  pair.reserve0 = ZERO_BD
  pair.reserve1 = ZERO_BD
  pair.fee = BigDecimal.fromString("0.5")
  pair.trackedReserveETH = ZERO_BD
  pair.reserveETH = ZERO_BD
  pair.reserveUSD = ZERO_BD
  pair.totalSupply = ZERO_BD
  pair.volumeToken0 = ZERO_BD
  pair.volumeToken1 = ZERO_BD
  pair.volumeUSD = ZERO_BD
  pair.untrackedVolumeUSD = ZERO_BD
  pair.token0Price = ZERO_BD
  pair.token1Price = ZERO_BD
  pair.feeUSD = ZERO_BD

  if(!(BLACKLISTED_PAIRS.includes(event.params.pair.toHex()))) {
    // create the tracked contract based on the template
    PairTemplate.create(event.params.pair)
  }

  // const token0AllPairs = token0.allPairs
  // const token1AllPairs = token1.allPairs
  // token0AllPairs.push(pair.id)
  // token1AllPairs.push(pair.id)
  // token0.allPairs = token0AllPairs
  // token1.allPairs = token1AllPairs

  // save updated values

  token0.save()
  token1.save()
  pair.save()
  factory.save()
}

export function handleOwnerFeeShareUpdated(event: OwnerFeeShareUpdated): void {
  let factory = UniswapFactory.load(FACTORY_ADDRESS)
  if (factory === null) {
    return
  }

  factory.ownerFeeShare = BigDecimal.fromString(event.params.newOwnerFeeShare.toString()).div(BigDecimal.fromString('1000'))
  factory.save()
}
