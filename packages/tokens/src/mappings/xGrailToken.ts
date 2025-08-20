import { 
  Transfer as TransferEvent,
  Allocate as AllocateEvent,
  Deallocate as DeallocateEvent,
  Redeem as RedeemEvent,
  FinalizeRedeem as FinalizeRedeemEvent,
  CancelRedeem as CancelRedeemEvent
} from '../../generated/XGrailToken/XGrailToken'
import { User, Token, TokenBalance, GlobalXGrailStats } from '../../generated/schema'
import { Address, BigInt, log } from '@graphprotocol/graph-ts'
import {
  ZERO_BI,
  ONE_BI,
  ZERO_BD,
  convertTokenToDecimal,
  loadOrCreateUser,
  loadOrCreateToken,
  loadOrCreateTokenBalance,
  loadOrCreateTransaction,
  updateTokenDayData,
  loadOrCreateGlobalXGrailStats,
  updateXGrailTotalSupply,
  ADDRESS_ZERO
} from './helpers'

let XGRAIL_ADDRESS = '0x3CAaE25Ee616f2C8E13C74dA0813402eae3F496b'
let XGRAIL_DECIMALS = BigInt.fromI32(18)

export function handleXGrailTransfer(event: TransferEvent): void {
  let timestamp = event.block.timestamp
  let from = event.params.from
  let to = event.params.to
  let value = convertTokenToDecimal(event.params.value, XGRAIL_DECIMALS)
  
  // Skip zero transfers
  if (value.equals(ZERO_BD)) {
    return
  }
  
  let fromAddress = from.toHex()
  let toAddress = to.toHex()
  
  // Skip internal transfers involving the xGRAIL contract (handled by specific event handlers)
  if (fromAddress.toLowerCase() == XGRAIL_ADDRESS.toLowerCase() || 
      toAddress.toLowerCase() == XGRAIL_ADDRESS.toLowerCase()) {
    return
  }
  
  // Load or create token
  let token = loadOrCreateToken(
    Address.fromString(XGRAIL_ADDRESS),
    'xGRAIL',
    'Staked GRAIL',
    XGRAIL_DECIMALS
  )
  
  // Handle from user (sender)
  if (fromAddress != ADDRESS_ZERO) {
    let fromUser = loadOrCreateUser(from, timestamp)
    fromUser.xGrailBalance = fromUser.xGrailBalance.minus(value)
    fromUser.totalXGrailBalance = fromUser.xGrailBalance.plus(fromUser.allocatedBalance)
    fromUser.updatedAt = timestamp
    fromUser.save()
    
    // Update token balance for sender
    let fromBalance = loadOrCreateTokenBalance(fromUser.id, token.id, timestamp)
    fromBalance.amount = fromUser.xGrailBalance
    fromBalance.updatedAt = timestamp
    fromBalance.save()
    
    // Update holder count if total balance reaches zero
    if (fromUser.totalXGrailBalance.equals(ZERO_BD)) {
      token.holderCount = token.holderCount.minus(ONE_BI)
      let stats = loadOrCreateGlobalXGrailStats()
      stats.holdersCount = stats.holdersCount.minus(ONE_BI)
      updateXGrailTotalSupply(stats)
      stats.save()
    }
  } else {
    // Minting - increase total supply
    token.totalSupply = token.totalSupply.plus(value)
  }
  
  // Handle to user (receiver)
  if (toAddress != ADDRESS_ZERO) {
    let wasNewHolder = false
    let toUser = User.load(toAddress)
    if (toUser === null || toUser.totalXGrailBalance.equals(ZERO_BD)) {
      wasNewHolder = true
    }
    
    toUser = loadOrCreateUser(to, timestamp)
    toUser.xGrailBalance = toUser.xGrailBalance.plus(value)
    toUser.totalXGrailBalance = toUser.xGrailBalance.plus(toUser.allocatedBalance)
    toUser.updatedAt = timestamp
    toUser.save()
    
    // Update token balance for receiver
    let toBalance = loadOrCreateTokenBalance(toUser.id, token.id, timestamp)
    toBalance.amount = toUser.xGrailBalance
    toBalance.updatedAt = timestamp
    toBalance.save()
    
    // Update holder count if this is first token
    if (wasNewHolder && !toUser.totalXGrailBalance.equals(ZERO_BD)) {
      token.holderCount = token.holderCount.plus(ONE_BI)
    }
  } else {
    // Burning - decrease total supply
    token.totalSupply = token.totalSupply.minus(value)
  }
  
  token.save()
  
  // Update global stats for external transfers
  let stats = loadOrCreateGlobalXGrailStats()
  updateXGrailTotalSupply(stats)
  stats.lastUpdateBlock = event.block.number
  stats.lastUpdateTimestamp = timestamp
  stats.save()
  
  // Update day data
  updateTokenDayData(
    token.id,
    timestamp,
    value,
    ZERO_BD,
    ZERO_BD
  )
}

export function handleAllocate(event: AllocateEvent): void {
  let timestamp = event.block.timestamp
  let amount = convertTokenToDecimal(event.params.amount, XGRAIL_DECIMALS)
  
  // Skip zero allocations
  if (amount.equals(ZERO_BD)) {
    return
  }
  
  let user = loadOrCreateUser(event.params.userAddress, timestamp)
  
  // Move from xgrail balance to allocated balance
  user.xGrailBalance = user.xGrailBalance.minus(amount)
  user.allocatedBalance = user.allocatedBalance.plus(amount)
  // Total balance remains the same (both are included)
  user.totalXGrailBalance = user.xGrailBalance.plus(user.allocatedBalance)
  user.updatedAt = timestamp
  user.save()
  
  // Update global stats
  let stats = loadOrCreateGlobalXGrailStats()
  stats.totalAllocated = stats.totalAllocated.plus(amount)
  updateXGrailTotalSupply(stats)
  stats.lastUpdateBlock = event.block.number
  stats.lastUpdateTimestamp = timestamp
  stats.save()
  
  log.info('Allocation processed: user={}, usage={}, amount={}', [
    user.id,
    event.params.usageAddress.toHex(),
    amount.toString()
  ])
}

export function handleDeallocate(event: DeallocateEvent): void {
  let timestamp = event.block.timestamp
  let amountReturned = convertTokenToDecimal(event.params.amountReturnedToUser, XGRAIL_DECIMALS)
  let fee = convertTokenToDecimal(event.params.fee, XGRAIL_DECIMALS)
  let totalAmount = amountReturned.plus(fee)
  
  // Skip zero deallocations
  if (totalAmount.equals(ZERO_BD)) {
    return
  }
  
  let user = loadOrCreateUser(event.params.userAddress, timestamp)
  
  // Move from allocated balance back to xgrail balance (minus fee)
  user.allocatedBalance = user.allocatedBalance.minus(totalAmount)
  user.xGrailBalance = user.xGrailBalance.plus(amountReturned)
  user.totalXGrailBalance = user.xGrailBalance.plus(user.allocatedBalance)
  user.updatedAt = timestamp
  user.save()
  
  // Update global stats
  let stats = loadOrCreateGlobalXGrailStats()
  stats.totalAllocated = stats.totalAllocated.minus(totalAmount)
  updateXGrailTotalSupply(stats)
  stats.lastUpdateBlock = event.block.number
  stats.lastUpdateTimestamp = timestamp
  stats.save()
  
  log.info('Deallocation processed: user={}, usage={}, returned={}, fee={}', [
    user.id,
    event.params.usageAddress.toHex(),
    amountReturned.toString(),
    fee.toString()
  ])
}

export function handleRedeem(event: RedeemEvent): void {
  let timestamp = event.block.timestamp
  let xGrailAmount = convertTokenToDecimal(event.params.xGrailAmount, XGRAIL_DECIMALS)
  
  // Skip zero redemptions
  if (xGrailAmount.equals(ZERO_BD)) {
    return
  }
  
  let user = loadOrCreateUser(event.params.userAddress, timestamp)
  
  // Move from xgrail balance to redemption balance
  user.xGrailBalance = user.xGrailBalance.minus(xGrailAmount)
  user.redemptionBalance = user.redemptionBalance.plus(xGrailAmount)
  // Update total balance (now excludes redemption balance)
  user.totalXGrailBalance = user.xGrailBalance.plus(user.allocatedBalance)
  user.updatedAt = timestamp
  user.save()
  
  // Update global stats
  let stats = loadOrCreateGlobalXGrailStats()
  stats.totalInRedemption = stats.totalInRedemption.plus(xGrailAmount)
  updateXGrailTotalSupply(stats)
  stats.lastUpdateBlock = event.block.number
  stats.lastUpdateTimestamp = timestamp
  stats.save()
  
  log.info('Redemption started: user={}, amount={}, id={}', [
    user.id,
    xGrailAmount.toString(),
    event.params.id.toString()
  ])
}

export function handleFinalizeRedeem(event: FinalizeRedeemEvent): void {
  let timestamp = event.block.timestamp
  let xGrailAmount = convertTokenToDecimal(event.params.xGrailAmount, XGRAIL_DECIMALS)
  
  // Skip zero finalizations
  if (xGrailAmount.equals(ZERO_BD)) {
    return
  }
  
  let user = loadOrCreateUser(event.params.userAddress, timestamp)
  
  // Remove from redemption balance (xGRAIL is converted to GRAIL)
  user.redemptionBalance = user.redemptionBalance.minus(xGrailAmount)
  user.totalXGrailBalance = user.xGrailBalance.plus(user.allocatedBalance)
  user.updatedAt = timestamp
  user.save()
  
  // Update global stats - xGRAIL is burned
  let stats = loadOrCreateGlobalXGrailStats()
  stats.totalInRedemption = stats.totalInRedemption.minus(xGrailAmount)
  updateXGrailTotalSupply(stats)
  stats.lastUpdateBlock = event.block.number
  stats.lastUpdateTimestamp = timestamp
  stats.save()
  
  // Check if user has zero balance and decrement holder count
  if (user.totalXGrailBalance.equals(ZERO_BD)) {
    stats.holdersCount = stats.holdersCount.minus(ONE_BI)
    updateXGrailTotalSupply(stats)
    stats.save()
    
    let token = Token.load(XGRAIL_ADDRESS)
    if (token !== null) {
      token.holderCount = token.holderCount.minus(ONE_BI)
      token.save()
    }
  }
  
  log.info('Redemption finalized: user={}, amount={}, id={}', [
    user.id,
    xGrailAmount.toString(),
    event.params.id.toString()
  ])
}

export function handleCancelRedeem(event: CancelRedeemEvent): void {
  let timestamp = event.block.timestamp
  let xGrailAmount = convertTokenToDecimal(event.params.xGrailAmount, XGRAIL_DECIMALS)
  
  // Skip zero cancellations
  if (xGrailAmount.equals(ZERO_BD)) {
    return
  }
  
  let user = loadOrCreateUser(event.params.userAddress, timestamp)
  
  // Move from redemption balance back to xgrail balance
  user.redemptionBalance = user.redemptionBalance.minus(xGrailAmount)
  user.xGrailBalance = user.xGrailBalance.plus(xGrailAmount)
  // Update total balance
  user.totalXGrailBalance = user.xGrailBalance.plus(user.allocatedBalance)
  user.updatedAt = timestamp
  user.save()
  
  // Update global stats
  let stats = loadOrCreateGlobalXGrailStats()
  stats.totalInRedemption = stats.totalInRedemption.minus(xGrailAmount)
  updateXGrailTotalSupply(stats)
  stats.lastUpdateBlock = event.block.number
  stats.lastUpdateTimestamp = timestamp
  stats.save()
  
  log.info('Redemption cancelled: user={}, amount={}, id={}', [
    user.id,
    xGrailAmount.toString(),
    event.params.id.toString()
  ])
}