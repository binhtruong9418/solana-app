import { AnchorProvider, BN } from "@coral-xyz/anchor";

import {
  MarketV2,
  MAINNET_PROGRAM_ID,
  DEVNET_PROGRAM_ID,
  TxVersion,
  buildSimpleTransaction,
  LOOKUP_TABLE_CACHE,
  LIQUIDITY_STATE_LAYOUT_V4,
  MARKET_STATE_LAYOUT_V3,
  SPL_MINT_LAYOUT,
  Market,
  Liquidity,
  ApiPoolInfoV4,
  LiquidityPoolKeys,
  jsonInfo2PoolKeys,
  Token,
  Percent,
  TokenAmount,
  TOKEN_PROGRAM_ID,
  SPL_ACCOUNT_LAYOUT,
  TokenAccount,
} from "@raydium-io/raydium-sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import assert from "assert";

export async function createMarket(
  baseToken: PublicKey,
  baseTokenDecimals: number,
  quoteToken: PublicKey,
  quoteTokenDecimals: number,
  provider: AnchorProvider,
  lotSize: number,
  tickSize: number
) {
  const RAYDIUM_PROGRAM_ID =
    process.env.NETWORK == "mainnet" ? MAINNET_PROGRAM_ID : DEVNET_PROGRAM_ID;
  const addLookupTableInfo =
    process.env.NETWORK == "mainnet" ? LOOKUP_TABLE_CACHE : undefined;
  // -------- step 1: make instructions --------
  const createMarketInstruments =
    await MarketV2.makeCreateMarketInstructionSimple({
      connection: provider.connection,
      wallet: provider.wallet.publicKey,
      baseInfo: { mint: baseToken, decimals: baseTokenDecimals },
      quoteInfo: { mint: quoteToken, decimals: quoteTokenDecimals },
      lotSize: lotSize, // default 1
      tickSize: tickSize, // default 0.01
      dexProgramId: RAYDIUM_PROGRAM_ID.OPENBOOK_MARKET,
      makeTxVersion: TxVersion.LEGACY,
    });

  const marketId = createMarketInstruments.address.marketId;

  const tx = await buildSimpleTransaction({
    connection: provider.connection,
    makeTxVersion: TxVersioimport { AnchorProvider, BN } from "@coral-xyz/anchor";

import {
  MarketV2,
  MAINNET_PROGRAM_ID,
  DEVNET_PROGRAM_ID,
  TxVersion,
  buildSimpleTransaction,
  LOOKUP_TABLE_CACHE,
  LIQUIDITY_STATE_LAYOUT_V4,
  MARKET_STATE_LAYOUT_V3,
  SPL_MINT_LAYOUT,
  Market,
  Liquidity,
  ApiPoolInfoV4,
  LiquidityPoolKeys,
  jsonInfo2PoolKeys,
  Token,
  Percent,
  TokenAmount,
  TOKEN_PROGRAM_ID,
  SPL_ACCOUNT_LAYOUT,
  TokenAccount,
} from "@raydium-io/raydium-sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import assert from "assert";

export async function createMarket(
  baseToken: PublicKey,
  baseTokenDecimals: number,
  quoteToken: PublicKey,
  quoteTokenDecimals: number,
  provider: AnchorProvider,
  lotSize: number,
  tickSize: number
) {
  const RAYDIUM_PROGRAM_ID =
    process.env.NETWORK == "mainnet" ? MAINNET_PROGRAM_ID : DEVNET_PROGRAM_ID;
  const addLookupTableInfo =
    process.env.NETWORK == "mainnet" ? LOOKUP_TABLE_CACHE : undefined;
  // -------- step 1: make instructions --------
  const createMarketInstruments =
    await MarketV2.makeCreateMarketInstructionSimple({
      connection: provider.connection,
      wallet: provider.wallet.publicKey,
      baseInfo: { mint: baseToken, decimals: baseTokenDecimals },
      quoteInfo: { mint: quoteToken, decimals: quoteTokenDecimals },
      lotSize: lotSize, // default 1
      tickSize: tickSize, // default 0.01
      dexProgramId: RAYDIUM_PROGRAM_ID.OPENBOOK_MARKET,
      makeTxVersion: TxVersion.LEGACY,
    });

  const marketId = createMarketInstruments.address.marketId;

  const tx = await buildSimpleTransaction({
    connection: provider.connection,
    makeTxVersion: TxVersion.LEGACY,
    payer: provider.wallet.publicKey,
    innerTransactions: createMarketInstruments.innerTransactions,
    addLookupTableInfo: addLookupTableInfo,
  });

  return { marketId, tx };
}

export async function formatAmmKeysById(
  provider: AnchorProvider,
  id: string
): Promise<ApiPoolInfoV4> {
  const account = await provider.connection.getAccountInfo(new PublicKey(id));
  if (account === null) throw Error(" get id info error ");
  const info = LIQUIDITY_STATE_LAYOUT_V4.decode(account.data);

  const marketId = info.marketId;
  const marketAccount = await provider.connection.getAccountInfo(marketId);
  if (marketAccount === null) throw Error(" get market info error");
  const marketInfo = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data);

  const lpMint = info.lpMint;
  const lpMintAccount = await provider.connection.getAccountInfo(lpMint);
  if (lpMintAccount === null) throw Error(" get lp mint info error");
  const lpMintInfo = SPL_MINT_LAYOUT.decode(lpMintAccount.data);

  return {
    id,
    baseMint: info.baseMint.toString(),
    quoteMint: info.quoteMint.toString(),
    lpMint: info.lpMint.toString(),
    baseDecimals: info.baseDecimal.toNumber(),
    quoteDecimals: info.quoteDecimal.toNumber(),
    lpDecimals: lpMintInfo.decimals,
    version: 4,
    programId: account.owner.toString(),
    authority: Liquidity.getAssociatedAuthority({
      programId: account.owner,
    }).publicKey.toString(),
    openOrders: info.openOrders.toString(),
    targetOrders: info.targetOrders.toString(),
    baseVault: info.baseVault.toString(),
    quoteVault: info.quoteVault.toString(),
    withdrawQueue: info.withdrawQueue.toString(),
    lpVault: info.lpVault.toString(),
    marketVersion: 3,
    marketProgramId: info.marketProgramId.toString(),
    marketId: info.marketId.toString(),
    marketAuthority: Market.getAssociatedAuthority({
      programId: info.marketProgramId,
      marketId: info.marketId,
    }).publicKey.toString(),
    marketBaseVault: marketInfo.baseVault.toString(),
    marketQuoteVault: marketInfo.quoteVault.toString(),
    marketBids: marketInfo.bids.toString(),
    marketAsks: marketInfo.asks.toString(),
    marketEventQueue: marketInfo.eventQueue.toString(),
    lookupTableAccount: PublicKey.default.toString(),
  };
}

export async function ammCreatePool(
  provider: AnchorProvider,
  market_id: PublicKey,
  baseToken: Token,
  quoteToken: Token,
  baseAmount: BN,
  quoteAmount: BN,
  startTime: number
) {
  // -------- step 1: make instructions --------
  const walletTokenAccounts = await getWalletTokenAccount(
    provider.connection,
    provider.wallet.publicKey
  );
  const addLookupTableInfo =
    process.env.NETWORK == "mainnet" ? LOOKUP_TABLE_CACHE : undefined;

  const initPoolInstructionResponse =
    await Liquidity.makeCreatePoolV4InstructionV2Simple({
      connection: provider.connection,
      programId: DEVNET_PROGRAM_ID.AmmV4,
      marketInfo: {
        marketId: market_id,
        programId: DEVNET_PROGRAM_ID.OPENBOOK_MARKET,
      },
      baseMintInfo: baseToken,
      quoteMintInfo: quoteToken,
      baseAmount: baseAmount,
      quoteAmount: quoteAmount,
      startTime: new BN(Math.floor(startTime)),
      ownerInfo: {
        feePayer: provider.wallet.publicKey,
        wallet: provider.wallet.publicKey,
        tokenAccounts: walletTokenAccounts,
        useSOLBalance: true,
      },
      associatedOnly: false,
      checkCreateATAOwner: true,
      lookupTableCache: addLookupTableInfo,
      makeTxVersion: TxVersion.V0,
      feeDestinationId: new PublicKey(
        "3XMrhbv989VxAMi3DErLV9eJht1pHppW5LbKxe9fkEFR"
      ), // only devnet use this
    });

  return {
    pool_info: initPoolInstructionResponse.address,
    instruction: initPoolInstructionResponse.innerTransactions[0].instructions,
  };
}

export async function ammAddLiquidity(
  provider: AnchorProvider,
  baseToken: Token,
  quoteToken: Token,
  targetPool: string,
  amount: number,
  slippage: Percent
) {
  const inputTokenAmount = new TokenAmount(baseToken, amount);
  const targetPoolInfo = await formatAmmKeysById(provider, targetPool);
  console.log(targetPoolInfo);
  assert(targetPoolInfo, "cannot find the target pool");
  // -------- step 1: compute another amount --------
  const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys;
  const extraPoolInfo = await Liquidity.fetchInfo({
    connection: provider.connection,
    poolKeys,
  });
  const { maxAnotherAmount, anotherAmount, liquidity } =
    Liquidity.computeAnotherAmount({
      poolKeys,
      poolInfo: { ...targetPoolInfo, ...extraPoolInfo },
      amount: inputTokenAmount,
      anotherCurrency: quoteToken,
      slippage: slippage,
    });

  console.log("will add liquidity info", {
    liquidity: liquidity.toString(),
    liquidityD: extraPoolInfo.lpDecimals,
  });
  const addLookupTableInfo =
    process.env.NETWORK == "mainnet" ? LOOKUP_TABLE_CACHE : undefined;
  // -------- step 2: make instructions --------
  const walletTokenAccounts = await getWalletTokenAccount(
    provider.connection,
    provider.wallet.publicKey
  );
  const addLiquidityInstructionResponse =
    await Liquidity.makeAddLiquidityInstructionSimple({
      connection: provider.connection,
      poolKeys,
      userKeys: {
        owner: provider.wallet.publicKey,
        payer: provider.wallet.publicKey,
        tokenAccounts: walletTokenAccounts,
      },
      amountInA: inputTokenAmount,
      amountInB: maxAnotherAmount,
      fixedSide: "a",
      makeTxVersion: TxVersion.LEGACY,
    });

  const tx = await buildSimpleTransaction({
    connection: provider.connection,
    makeTxVersion: TxVersion.LEGACY,
    payer: provider.wallet.publicKey,
    innerTransactions: addLiquidityInstructionResponse.innerTransactions,
    addLookupTableInfo: addLookupTableInfo,
  });

  return {
    tx,
    anotherAmount,
  };
}

export async function getWalletTokenAccount(
  connection: Connection,
  wallet: PublicKey
): Promise<TokenAccount[]> {
  const walletTokenAccount = await connection.getTokenAccountsByOwner(wallet, {
    programId: TOKEN_PROGRAM_ID,
  });
  return walletTokenAccount.value.map((i) => ({
    pubkey: i.pubkey,
    programId: i.account.owner,
    accountInfo: SPL_ACCOUNT_LAYOUT.decode(i.account.data),
  }));
}
