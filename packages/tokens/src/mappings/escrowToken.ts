import { 
  Transfer as TransferEvent,
  Allocate as AllocateEvent,
  Deallocate as DeallocateEvent,
  Redeem as RedeemEvent,
  FinalizeRedeem as FinalizeRedeemEvent,
  CancelRedeem as CancelRedeemEvent
} from '../../generated/EscrowToken/EscrowToken'
import { User, Token, TokenBalance, GlobalEscrowStats } from '../../generated/schema'
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
  loadOrCreateGlobalEscrowStats,
  updateEscrowTotalSupply,
  ADDRESS_ZERO
} from './helpers'
import { TARGET_CHAIN } from 'common'
let ESCROW_DECIMALS = BigInt.fromI32(18)

export function handleEscrowTransfer(event: TransferEvent): void {
  let timestamp = event.block.timestamp
  let from = event.params.from
  let to = event.params.to
  let value = convertTokenToDecimal(event.params.value, ESCROW_DECIMALS)
  
  // Skip zero transfers
  if (value.equals(ZERO_BD)) {
    return
  }
  
  let fromAddress = from.toHex()
  let toAddress = to.toHex()
  
  // Skip internal transfers involving the escrow contract (handled by specific event handlers)
  if (fromAddress.toLowerCase() == TARGET_CHAIN.escrowToken.toLowerCase() || 
      toAddress.toLowerCase() == TARGET_CHAIN.escrowToken.toLowerCase()) {
    return
  }
  
  // Load or create token
  let token = loadOrCreateToken(
    Address.fromString(TARGET_CHAIN.escrowToken),
    'ESCROW',
    'Escrowed Token',
    ESCROW_DECIMALS
  )
  
  // Handle from user (sender)
  if (fromAddress != ADDRESS_ZERO) {
    let fromUser = loadOrCreateUser(from, timestamp)
    fromUser.escrowBalance = fromUser.escrowBalance.minus(value)
    fromUser.totalEscrowBalance = fromUser.escrowBalance.plus(fromUser.allocatedBalance)
    fromUser.updatedAt = timestamp
    fromUser.save()
    
    // Update token balance for sender
    let fromBalance = loadOrCreateTokenBalance(fromUser.id, token.id, timestamp)
    fromBalance.amount = fromUser.escrowBalance
    fromBalance.updatedAt = timestamp
    fromBalance.save()
    
    // Update holder count if total balance reaches zero
    if (fromUser.totalEscrowBalance.equals(ZERO_BD)) {
      token.holderCount = token.holderCount.minus(ONE_BI)
      let stats = loadOrCreateGlobalEscrowStats()
      stats.holdersCount = stats.holdersCount.minus(ONE_BI)
      updateEscrowTotalSupply(stats)
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
    if (toUser === null || toUser.totalEscrowBalance.equals(ZERO_BD)) {
      wasNewHolder = true
    }
    
    toUser = loadOrCreateUser(to, timestamp)
    toUser.escrowBalance = toUser.escrowBalance.plus(value)
    toUser.totalEscrowBalance = toUser.escrowBalance.plus(toUser.allocatedBalance)
    toUser.updatedAt = timestamp
    toUser.save()
    
    // Update token balance for receiver
    let toBalance = loadOrCreateTokenBalance(toUser.id, token.id, timestamp)
    toBalance.amount = toUser.escrowBalance
    toBalance.updatedAt = timestamp
    toBalance.save()
    
    // Update holder count if this is first token
    if (wasNewHolder && !toUser.totalEscrowBalance.equals(ZERO_BD)) {
      token.holderCount = token.holderCount.plus(ONE_BI)
    }
  } else {
    // Burning - decrease total supply
    token.totalSupply = token.totalSupply.minus(value)
  }
  
  token.save()
  
  // Update global stats for external transfers
  let stats = loadOrCreateGlobalEscrowStats()
  updateEscrowTotalSupply(stats)
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
  let amount = convertTokenToDecimal(event.params.amount, ESCROW_DECIMALS)
  
  // Skip zero allocations
  if (amount.equals(ZERO_BD)) {
    return
  }
  
  let user = loadOrCreateUser(event.params.userAddress, timestamp)
  
  // Move from escrow balance to allocated balance
  user.escrowBalance = user.escrowBalance.minus(amount)
  user.allocatedBalance = user.allocatedBalance.plus(amount)
  // Total balance remains the same (both are included)
  user.totalEscrowBalance = user.escrowBalance.plus(user.allocatedBalance)
  user.updatedAt = timestamp
  user.save()
  
  // Update global stats
  let stats = loadOrCreateGlobalEscrowStats()
  stats.totalAllocated = stats.totalAllocated.plus(amount)
  updateEscrowTotalSupply(stats)
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
  let amountReturned = convertTokenToDecimal(event.params.amountReturnedToUser, ESCROW_DECIMALS)
  let fee = convertTokenToDecimal(event.params.feeAmount, ESCROW_DECIMALS)
  let totalAmount = amountReturned.plus(fee)
  
  // Skip zero deallocations
  if (totalAmount.equals(ZERO_BD)) {
    return
  }
  
  let user = loadOrCreateUser(event.params.userAddress, timestamp)
  
  // Move from allocated balance back to escrow token balance (minus fee)
  user.allocatedBalance = user.allocatedBalance.minus(totalAmount)
  user.escrowBalance = user.escrowBalance.plus(amountReturned)
  user.totalEscrowBalance = user.escrowBalance.plus(user.allocatedBalance)
  user.updatedAt = timestamp
  user.save()
  
  // Update global stats
  let stats = loadOrCreateGlobalEscrowStats()
  stats.totalAllocated = stats.totalAllocated.minus(totalAmount)
  updateEscrowTotalSupply(stats)
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
  let escrowAmount = convertTokenToDecimal(event.params.escrowAmount, ESCROW_DECIMALS)
  
  // Skip zero redemptions
  if (escrowAmount.equals(ZERO_BD)) {
    return
  }
  
  let user = loadOrCreateUser(event.params.userAddress, timestamp)
  
  // Move from escrow balance to redemption balance
  user.escrowBalance = user.escrowBalance.minus(escrowAmount)
  user.redemptionBalance = user.redemptionBalance.plus(escrowAmount)
  // Update total balance (now excludes redemption balance)
  user.totalEscrowBalance = user.escrowBalance.plus(user.allocatedBalance)
  user.updatedAt = timestamp
  user.save()
  
  // Update global stats
  let stats = loadOrCreateGlobalEscrowStats()
  stats.totalInRedemption = stats.totalInRedemption.plus(escrowAmount)
  updateEscrowTotalSupply(stats)
  stats.lastUpdateBlock = event.block.number
  stats.lastUpdateTimestamp = timestamp
  stats.save()
  
  log.info('Redemption started: user={}, amount={}, id={}', [
    user.id,
    escrowAmount.toString(),
    event.params.id.toString()
  ])
}

export function handleFinalizeRedeem(event: FinalizeRedeemEvent): void {
  let timestamp = event.block.timestamp
  let escrowAmount = convertTokenToDecimal(event.params.escrowAmount, ESCROW_DECIMALS)
  
  // Skip zero finalizations
  if (escrowAmount.equals(ZERO_BD)) {
    return
  }
  
  let user = loadOrCreateUser(event.params.userAddress, timestamp)
  
  // Remove from redemption balance (escrow token is converted to underlying)
  user.redemptionBalance = user.redemptionBalance.minus(escrowAmount)
  user.totalEscrowBalance = user.escrowBalance.plus(user.allocatedBalance)
  user.updatedAt = timestamp
  user.save()
  
  // Update global stats - escrow token is burned
  let stats = loadOrCreateGlobalEscrowStats()
  stats.totalInRedemption = stats.totalInRedemption.minus(escrowAmount)
  updateEscrowTotalSupply(stats)
  stats.lastUpdateBlock = event.block.number
  stats.lastUpdateTimestamp = timestamp
  stats.save()
  
  // Check if user has zero balance and decrement holder count
  if (user.totalEscrowBalance.equals(ZERO_BD)) {
    stats.holdersCount = stats.holdersCount.minus(ONE_BI)
    updateEscrowTotalSupply(stats)
    stats.save()
    
    let token = Token.load(TARGET_CHAIN.escrowToken)
    if (token !== null) {
      token.holderCount = token.holderCount.minus(ONE_BI)
      token.save()
    }
  }
  
  log.info('Redemption finalized: user={}, amount={}, id={}', [
    user.id,
    escrowAmount.toString(),
    event.params.id.toString()
  ])
}

export function handleCancelRedeem(event: CancelRedeemEvent): void {
  let timestamp = event.block.timestamp
  let escrowAmount = convertTokenToDecimal(event.params.escrowAmount, ESCROW_DECIMALS)
  
  // Skip zero cancellations
  if (escrowAmount.equals(ZERO_BD)) {
    return
  }
  
  let user = loadOrCreateUser(event.params.userAddress, timestamp)
  
  // Move from redemption balance back to escrow balance
  user.redemptionBalance = user.redemptionBalance.minus(escrowAmount)
  user.escrowBalance = user.escrowBalance.plus(escrowAmount)
  // Update total balance
  user.totalEscrowBalance = user.escrowBalance.plus(user.allocatedBalance)
  user.updatedAt = timestamp
  user.save()
  
  // Update global stats
  let stats = loadOrCreateGlobalEscrowStats()
  stats.totalInRedemption = stats.totalInRedemption.minus(escrowAmount)
  updateEscrowTotalSupply(stats)
  stats.lastUpdateBlock = event.block.number
  stats.lastUpdateTimestamp = timestamp
  stats.save()
  
  log.info('Redemption cancelled: user={}, amount={}, id={}', [
    user.id,
    escrowAmount.toString(),
    event.params.id.toString()
  ])
}