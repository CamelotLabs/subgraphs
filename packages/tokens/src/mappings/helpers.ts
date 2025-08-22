import { BigDecimal, BigInt, Bytes, Address } from '@graphprotocol/graph-ts'
import { User, Token, TokenBalance, Transaction, TokenDayData, GlobalEscrowStats } from '../../generated/schema'
import { EscrowToken } from '../../generated/EscrowToken/EscrowToken'

export let ZERO_BI = BigInt.fromI32(0)
export let ONE_BI = BigInt.fromI32(1)
export let ZERO_BD = BigDecimal.fromString('0')
export let ONE_BD = BigDecimal.fromString('1')

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let bd = BigDecimal.fromString('1')
  for (let i = ZERO_BI; i.lt(decimals as BigInt); i = i.plus(ONE_BI)) {
    bd = bd.times(BigDecimal.fromString('10'))
  }
  return bd
}

export function convertTokenToDecimal(tokenAmount: BigInt, exchangeDecimals: BigInt): BigDecimal {
  if (exchangeDecimals == ZERO_BI) {
    return tokenAmount.toBigDecimal()
  }
  return tokenAmount.toBigDecimal().div(exponentToBigDecimal(exchangeDecimals))
}

export function loadOrCreateUser(address: Bytes, timestamp: BigInt): User {
  let user = User.load(address.toHex())
  if (user === null) {
    user = new User(address.toHex())
    user.optionsBalance = ZERO_BD
    user.escrowBalance = ZERO_BD
    user.allocatedBalance = ZERO_BD
    user.redemptionBalance = ZERO_BD
    user.totalEscrowBalance = ZERO_BD
    user.allTimeExercisedLiquid = ZERO_BD
    user.allTimeExercisedEscrow = ZERO_BD
    user.allTimeEthPaid = ZERO_BD
    user.createdAt = timestamp
    user.updatedAt = timestamp
    user.save()
    
    // Increment holder count for new user
    let stats = loadOrCreateGlobalEscrowStats()
    stats.holdersCount = stats.holdersCount.plus(ONE_BI)
    stats.save()
  }
  return user as User
}

export function loadOrCreateToken(address: Bytes, symbol: string, name: string, decimals: BigInt): Token {
  let token = Token.load(address.toHex())
  if (token === null) {
    token = new Token(address.toHex())
    token.symbol = symbol
    token.name = name
    token.decimals = decimals
    token.totalSupply = ZERO_BD
    token.holderCount = ZERO_BI
    token.save()
  }
  return token as Token
}

export function loadOrCreateTokenBalance(userId: string, tokenId: string, timestamp: BigInt): TokenBalance {
  let id = userId + '-' + tokenId
  let balance = TokenBalance.load(id)
  if (balance === null) {
    balance = new TokenBalance(id)
    balance.token = tokenId
    balance.user = userId
    balance.amount = ZERO_BD
    balance.updatedAt = timestamp
    balance.save()
  }
  return balance as TokenBalance
}

export function loadOrCreateTransaction(txHash: Bytes, blockNumber: BigInt, timestamp: BigInt): Transaction {
  let transaction = Transaction.load(txHash.toHex())
  if (transaction === null) {
    transaction = new Transaction(txHash.toHex())
    transaction.blockNumber = blockNumber
    transaction.timestamp = timestamp
    transaction.save()
  }
  return transaction as Transaction
}

export function updateTokenDayData(
  tokenAddress: string,
  timestamp: BigInt,
  volumeToken: BigDecimal,
  exercisedAmount: BigDecimal,
  ethPaid: BigDecimal
): TokenDayData {
  let dayID = timestamp.toI32() / 86400
  let dayStartTimestamp = dayID * 86400
  let dayDataID = tokenAddress + '-' + dayID.toString()
  
  let tokenDayData = TokenDayData.load(dayDataID)
  if (tokenDayData === null) {
    tokenDayData = new TokenDayData(dayDataID)
    tokenDayData.date = dayStartTimestamp
    tokenDayData.token = tokenAddress
    tokenDayData.dailyVolumeToken = ZERO_BD
    tokenDayData.dailyExercisedAmount = ZERO_BD
    tokenDayData.dailyEthPaid = ZERO_BD
    tokenDayData.totalSupply = ZERO_BD
    tokenDayData.holderCount = ZERO_BI
  }
  
  tokenDayData.dailyVolumeToken = tokenDayData.dailyVolumeToken.plus(volumeToken)
  tokenDayData.dailyExercisedAmount = tokenDayData.dailyExercisedAmount.plus(exercisedAmount)
  tokenDayData.dailyEthPaid = tokenDayData.dailyEthPaid.plus(ethPaid)
  
  let token = Token.load(tokenAddress)
  if (token !== null) {
    tokenDayData.totalSupply = token.totalSupply
    tokenDayData.holderCount = token.holderCount
  }
  
  tokenDayData.save()
  return tokenDayData as TokenDayData
}

export function loadOrCreateGlobalEscrowStats(): GlobalEscrowStats {
  let stats = GlobalEscrowStats.load('global')
  if (stats === null) {
    stats = new GlobalEscrowStats('global')
    stats.totalSupply = ZERO_BD
    stats.totalAllocated = ZERO_BD
    stats.totalInRedemption = ZERO_BD
    stats.holdersCount = ZERO_BI
    stats.lastUpdateBlock = ZERO_BI
    stats.lastUpdateTimestamp = ZERO_BI
  }
  return stats as GlobalEscrowStats
}

export function updateEscrowTotalSupply(stats: GlobalEscrowStats): void {
  // Get actual totalSupply from the contract
  let ESCROW_CONTRACT = '0x3CAaE25Ee616f2C8E13C74dA0813402eae3F496b'
  let contract = EscrowToken.bind(Address.fromString(ESCROW_CONTRACT))
  let totalSupplyCall = contract.try_totalSupply()
  
  if (!totalSupplyCall.reverted) {
    stats.totalSupply = convertTokenToDecimal(totalSupplyCall.value, BigInt.fromI32(18))
  }
}

export let ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'