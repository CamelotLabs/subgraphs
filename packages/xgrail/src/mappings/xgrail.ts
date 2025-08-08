import { BigDecimal, BigInt, Address } from '@graphprotocol/graph-ts'
import {
  Transfer,
  Allocate,
  Deallocate,
  Redeem,
  FinalizeRedeem,
  CancelRedeem
} from '../../generated/xGrailToken/xGrailToken'
import { User, GlobalStats } from '../../generated/schema'

const ZERO_BD = BigDecimal.fromString('0')
const ZERO_BI = BigInt.fromI32(0)
const ONE_BI = BigInt.fromI32(1)
const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'

function convertTokenToDecimal(tokenAmount: BigInt, decimals: BigInt): BigDecimal {
  if (decimals == ZERO_BI) {
    return tokenAmount.toBigDecimal()
  }
  return tokenAmount.toBigDecimal().div(exponentToBigDecimal(decimals))
}

function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let bd = BigDecimal.fromString('1')
  for (let i = ZERO_BI; i.lt(decimals as BigInt); i = i.plus(ONE_BI)) {
    bd = bd.times(BigDecimal.fromString('10'))
  }
  return bd
}

function loadOrCreateUser(address: Address): User {
  let user = User.load(address.toHexString())
  if (user === null) {
    user = new User(address.toHexString())
    user.xgrailBalance = ZERO_BD
    user.allocatedBalance = ZERO_BD
    user.redemptionBalance = ZERO_BD
    user.totalBalance = ZERO_BD
    user.lastUpdateBlock = ZERO_BI
    user.lastUpdateTimestamp = ZERO_BI
    
    // Increment holder count
    let stats = loadOrCreateGlobalStats()
    stats.holdersCount = stats.holdersCount.plus(ONE_BI)
    stats.save()
  }
  return user as User
}

function loadOrCreateGlobalStats(): GlobalStats {
  let stats = GlobalStats.load('global')
  if (stats === null) {
    stats = new GlobalStats('global')
    stats.totalSupply = ZERO_BD
    stats.totalAllocated = ZERO_BD
    stats.totalInRedemption = ZERO_BD
    stats.holdersCount = ZERO_BI
    stats.lastUpdateBlock = ZERO_BI
    stats.lastUpdateTimestamp = ZERO_BI
  }
  return stats as GlobalStats
}

export function handleTransfer(event: Transfer): void {
  let amount = convertTokenToDecimal(event.params.value, BigInt.fromI32(18))
  
  // Skip zero transfers
  if (amount.equals(ZERO_BD)) {
    return
  }
  
  let fromAddress = event.params.from.toHexString()
  let toAddress = event.params.to.toHexString()
  
  // Handle from address (unless it's minting from zero address)
  if (fromAddress != ADDRESS_ZERO) {
    let fromUser = loadOrCreateUser(event.params.from)
    fromUser.xgrailBalance = fromUser.xgrailBalance.minus(amount)
    fromUser.totalBalance = fromUser.xgrailBalance.plus(fromUser.allocatedBalance).plus(fromUser.redemptionBalance)
    fromUser.lastUpdateBlock = event.block.number
    fromUser.lastUpdateTimestamp = event.block.timestamp
    fromUser.save()
    
    // Check if user has zero balance and decrement holder count
    if (fromUser.totalBalance.equals(ZERO_BD)) {
      let stats = loadOrCreateGlobalStats()
      stats.holdersCount = stats.holdersCount.minus(ONE_BI)
      stats.save()
    }
  }
  
  // Handle to address (unless it's burning to zero address)
  if (toAddress != ADDRESS_ZERO) {
    let wasNewHolder = false
    let toUser = User.load(toAddress)
    if (toUser === null || toUser.totalBalance.equals(ZERO_BD)) {
      wasNewHolder = true
    }
    
    toUser = loadOrCreateUser(event.params.to)
    toUser.xgrailBalance = toUser.xgrailBalance.plus(amount)
    toUser.totalBalance = toUser.xgrailBalance.plus(toUser.allocatedBalance).plus(toUser.redemptionBalance)
    toUser.lastUpdateBlock = event.block.number
    toUser.lastUpdateTimestamp = event.block.timestamp
    toUser.save()
  }
  
  // Update global stats
  let stats = loadOrCreateGlobalStats()
  
  // Update total supply for mints and burns
  if (fromAddress == ADDRESS_ZERO) {
    // Minting
    stats.totalSupply = stats.totalSupply.plus(amount)
  } else if (toAddress == ADDRESS_ZERO) {
    // Burning
    stats.totalSupply = stats.totalSupply.minus(amount)
  }
  
  stats.lastUpdateBlock = event.block.number
  stats.lastUpdateTimestamp = event.block.timestamp
  stats.save()
}

export function handleAllocate(event: Allocate): void {
  let amount = convertTokenToDecimal(event.params.amount, BigInt.fromI32(18))
  
  // Skip zero allocations
  if (amount.equals(ZERO_BD)) {
    return
  }
  
  let user = loadOrCreateUser(event.params.userAddress)
  
  // Move from xgrail balance to allocated balance
  user.xgrailBalance = user.xgrailBalance.minus(amount)
  user.allocatedBalance = user.allocatedBalance.plus(amount)
  // Total balance remains the same
  user.lastUpdateBlock = event.block.number
  user.lastUpdateTimestamp = event.block.timestamp
  user.save()
  
  // Update global stats
  let stats = loadOrCreateGlobalStats()
  stats.totalAllocated = stats.totalAllocated.plus(amount)
  stats.lastUpdateBlock = event.block.number
  stats.lastUpdateTimestamp = event.block.timestamp
  stats.save()
}

export function handleDeallocate(event: Deallocate): void {
  let amount = convertTokenToDecimal(event.params.amount, BigInt.fromI32(18))
  let fee = convertTokenToDecimal(event.params.fee, BigInt.fromI32(18))
  
  // Skip zero deallocations
  if (amount.equals(ZERO_BD)) {
    return
  }
  
  let user = loadOrCreateUser(event.params.userAddress)
  
  // Move from allocated balance back to xgrail balance (minus fee)
  user.allocatedBalance = user.allocatedBalance.minus(amount)
  user.xgrailBalance = user.xgrailBalance.plus(amount.minus(fee))
  user.totalBalance = user.xgrailBalance.plus(user.allocatedBalance).plus(user.redemptionBalance)
  user.lastUpdateBlock = event.block.number
  user.lastUpdateTimestamp = event.block.timestamp
  user.save()
  
  // Update global stats
  let stats = loadOrCreateGlobalStats()
  stats.totalAllocated = stats.totalAllocated.minus(amount)
  
  // Fee is burned, so reduce total supply
  if (fee.gt(ZERO_BD)) {
    stats.totalSupply = stats.totalSupply.minus(fee)
  }
  
  stats.lastUpdateBlock = event.block.number
  stats.lastUpdateTimestamp = event.block.timestamp
  stats.save()
}

export function handleRedeem(event: Redeem): void {
  let xGrailAmount = convertTokenToDecimal(event.params.xGrailAmount, BigInt.fromI32(18))
  
  // Skip zero redemptions
  if (xGrailAmount.equals(ZERO_BD)) {
    return
  }
  
  let user = loadOrCreateUser(event.params.userAddress)
  
  // Move from xgrail balance to redemption balance
  user.xgrailBalance = user.xgrailBalance.minus(xGrailAmount)
  user.redemptionBalance = user.redemptionBalance.plus(xGrailAmount)
  // Total balance remains the same since xGRAIL is still locked
  user.lastUpdateBlock = event.block.number
  user.lastUpdateTimestamp = event.block.timestamp
  user.save()
  
  // Update global stats
  let stats = loadOrCreateGlobalStats()
  stats.totalInRedemption = stats.totalInRedemption.plus(xGrailAmount)
  stats.lastUpdateBlock = event.block.number
  stats.lastUpdateTimestamp = event.block.timestamp
  stats.save()
}

export function handleFinalizeRedeem(event: FinalizeRedeem): void {
  let xGrailAmount = convertTokenToDecimal(event.params.xGrailAmount, BigInt.fromI32(18))
  
  // Skip zero finalizations
  if (xGrailAmount.equals(ZERO_BD)) {
    return
  }
  
  let user = loadOrCreateUser(event.params.userAddress)
  
  // Remove from redemption balance (xGRAIL is converted to GRAIL)
  user.redemptionBalance = user.redemptionBalance.minus(xGrailAmount)
  user.totalBalance = user.xgrailBalance.plus(user.allocatedBalance).plus(user.redemptionBalance)
  user.lastUpdateBlock = event.block.number
  user.lastUpdateTimestamp = event.block.timestamp
  user.save()
  
  // Update global stats - xGRAIL is burned
  let stats = loadOrCreateGlobalStats()
  stats.totalSupply = stats.totalSupply.minus(xGrailAmount)
  stats.totalInRedemption = stats.totalInRedemption.minus(xGrailAmount)
  stats.lastUpdateBlock = event.block.number
  stats.lastUpdateTimestamp = event.block.timestamp
  stats.save()
  
  // Check if user has zero balance and decrement holder count
  if (user.totalBalance.equals(ZERO_BD)) {
    stats.holdersCount = stats.holdersCount.minus(ONE_BI)
    stats.save()
  }
}

export function handleCancelRedeem(event: CancelRedeem): void {
  let xGrailAmount = convertTokenToDecimal(event.params.xGrailAmount, BigInt.fromI32(18))
  
  // Skip zero cancellations
  if (xGrailAmount.equals(ZERO_BD)) {
    return
  }
  
  let user = loadOrCreateUser(event.params.userAddress)
  
  // Move from redemption balance back to xgrail balance
  user.redemptionBalance = user.redemptionBalance.minus(xGrailAmount)
  user.xgrailBalance = user.xgrailBalance.plus(xGrailAmount)
  // Total balance remains the same
  user.lastUpdateBlock = event.block.number
  user.lastUpdateTimestamp = event.block.timestamp
  user.save()
  
  // Update global stats
  let stats = loadOrCreateGlobalStats()
  stats.totalInRedemption = stats.totalInRedemption.minus(xGrailAmount)
  stats.lastUpdateBlock = event.block.number
  stats.lastUpdateTimestamp = event.block.timestamp
  stats.save()
}