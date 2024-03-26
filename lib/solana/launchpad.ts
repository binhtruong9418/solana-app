import { AnchorProvider, BN, Program, web3 } from "@coral-xyz/anchor";
import * as config from "./config.json";
import idl from "./anchor_launchpad.json";
import lockIdl from "./lock_token.json";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTimport { AnchorProvider, BN, Program, web3 } from "@coral-xyz/anchor";
import * as config from "./config.json";
import idl from "./anchor_launchpad.json";
import lockIdl from "./lock_token.json";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { ammCreatePool, createMarket } from "./raydium";
import { Token } from "@raydium-io/raydium-sdk";
import { getMockData } from "./mock_data";

const programId = new web3.PublicKey(config.programId);
const lockTokenProgramId = new web3.PublicKey(config.lockTokenProgramId);
const configAccount = new web3.PublicKey(config.configAccount);

/// ADMIN
export async function changeCreateFee(
  provider: AnchorProvider,
  newFee: BN,
  creationFreeOptionSol: BN,
  addFeeUnCon: PublicKey
) {
  const program = new Program(idl as any, programId, provider);

  const tx = await program.methods
    .changeCreateFee(
      new web3.PublicKey(addFeeUnCon),
      newFee,
      creationFreeOptionSol
    )
    .accounts({
      authority: provider.wallet.publicKey,
      configAccount: configAccount,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log("Change Create Fee: ", tx);
  return configAccount;
}

export async function logConfigAccount(
  provider: AnchorProvider,
  configAccount: PublicKey
) {
  //1. load the program's idl -- make sure the path is correct
  const program = new Program(idl as any, programId, provider);

  const config = await program.account.configAccount.fetch(configAccount);

  console.log("Config address: ", (config as any).addFeeUnCon.toBase58());
  console.log("Config account: ", config);
}

export async function getVaultLaunchpad(
  provider: AnchorProvider,
  vaultLaunchpadAccount: PublicKey
) {
  //1. load the program's idl -- make sure the path is correct
  const program = new Program(idl as any, programId, provider);

  const vaultLaunchpad = await program.account.vaultLaunchpad.fetch(
    vaultLaunchpadAccount
  );

  return vaultLaunchpad;
}

/// DEVER
export async function getLaunchpadInfo(
  provider: AnchorProvider,
  launchpadAccount: PublicKey,
  launchpadStepAccount: PublicKey
) {
  const myLaunchpad = new Program(idl as any, programId, provider);

  const launchpad = await myLaunchpad.account.launchpadAccount.fetch(
    launchpadAccount
  );
  const launchpadStep = await myLaunchpad.account.launchpadStepAccount.fetch(
    launchpadStepAccount
  );

  console.log({
    launchpad,
    launchpadStep,
  });
}

type LaunchpadArgs = {
  launchpad_token_address: string;
  addFeeUnCon: PublicKey;
  step1: any;
  step2: any;
  amountOfToken: BN;
};

export async function createLaunchpad(
  provider: AnchorProvider,
  args: LaunchpadArgs
) {
  const program = new Program(idl as any, programId, provider);

  const configAcc = await program.account.configAccount.fetch(configAccount);

  //2. Create Launchpad and wait. Accounts should same as IDL
  //2.a Random for new launchpad address
  const launchpadAccount = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("lp"),
      Buffer.from((configAcc as any).launchpadCount.toString()),
      provider.wallet.publicKey.toBuffer(),
    ],
    programId
  )[0];
  const launchpadStepAccount = web3.PublicKey.findProgramAddressSync(
    [launchpadAccount.toBuffer(), provider.wallet.publicKey.toBuffer()],
    programId
  )[0];

  const launchpadTokenAddress = new web3.PublicKey(
    args.launchpad_token_address
  );
  const mintLaunchpadConfigAccount = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("mint_config"),
      launchpadTokenAddress.toBuffer(),
      provider.wallet.publicKey.toBuffer(),
    ],
    programId
  )[0];

  const tokenVaultLaunchpad = await getAssociatedTokenAddress(
    launchpadTokenAddress,
    launchpadAccount,
    true
  );
  const create_tx = createAssociatedTokenAccountIdempotentInstruction(
    provider.wallet.publicKey,
    tokenVaultLaunchpad,
    launchpadAccount,
    launchpadTokenAddress
  );
  const deverTokenAccount = await getAssociatedTokenAddress(
    launchpadTokenAddress,
    provider.wallet.publicKey,
    true
  );
  const create_tx2 = createAssociatedTokenAccountIdempotentInstruction(
    provider.wallet.publicKey,
    deverTokenAccount,
    provider.wallet.publicKey,
    launchpadTokenAddress
  );
  const data = await getMockData(provider.connection, launchpadTokenAddress);

  const tx = await program.methods
    .createLaunchpad(new BN(args.step1.totalTokenTo))
    .accounts({
      dever: provider.wallet.publicKey,
      launchpadMint: launchpadTokenAddress,
      launchpadAccount: launchpadAccount,
      vaultLaunchpad: tokenVaultLaunchpad,
      addFeeUnCon: args.addFeeUnCon,
      configAccount: configAccount,
      mintConfigAccount: mintLaunchpadConfigAccount,
      deverTokenAccount: deverTokenAccount,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .instruction();

  const tx2 = await program.methods
    .createLaunchpadStep(args.step1, args.step2, data.launchpadParamsStep3)
    .accounts({
      dever: provider.wallet.publicKey,
      launchpadAccount: launchpadAccount,
      configAccount: configAccount,
      launchpadStepAccount: launchpadStepAccount,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  const all_tx = new Transaction();
  let blockhash = await provider.connection.getLatestBlockhash("finalized");
  all_tx.add(create_tx).add(create_tx2).add(tx).add(tx2).recentBlockhash =
    blockhash.blockhash;
  all_tx.feePayer = provider.wallet.publicKey;
  const signed_tx = await provider.wallet.signAllTransactions([all_tx]);
  for (const ta of signed_tx) {
    const txid = await provider.connection.sendRawTransaction(ta.serialize(), {
      skipPreflight: true,
    });
    const latestBlockHash = await provider.connection.getLatestBlockhash();

    await provider.connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: txid,
    });
    console.log(txid);
  }
  return { launchpadAccount, launchpadStepAccount };
}

export async function cancelLaunchpad(
  provider: AnchorProvider,
  launchpadAccount: PublicKey,
  tokenAddress: PublicKey
) {
  const program = new Program(idl as any, programId, provider);

  const tx = await program.methods
    .cancelLaunchpad()
    .accounts({
      dever: provider.wallet.publicKey,
      launchpadAccount: launchpadAccount,
      launchpadMint: tokenAddress,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log("Cancel launchpad: ", tx);
}
export async function changeInfoSocialNetwork(
  provider: AnchorProvider,
  launchpadAccount: PublicKey,
  launchpadStepAccount: PublicKey,
  launchpadParamsStep3: {}
) {
  //1. load the program's idl -- make sure the path is correct
  const program = new Program(idl as any, programId, provider);

  //2. Create Launchpad and wait. Accounts should same as IDL
  //2.a Random for new launchpad address
  const tx = await program.methods
    .changeInfoSocialNetwork(launchpadParamsStep3)
    .accounts({
      authority: provider.wallet.publicKey,
      launchpadAccount: launchpadAccount,
      launchpadStepAccount: launchpadStepAccount,
    })
    .rpc();

  console.log("Change Social Network account: ", tx);
}
export async function updateAffiliate(
  provider: AnchorProvider,
  launchpadAccount: PublicKey,
  launchpadStepAccount: PublicKey,
  new_affiliate: BN // 1-254
) {
  //1. load the program's idl -- make sure the path is correct
  const program = new Program(idl as any, programId, provider);

  //2. Create Launchpad and wait. Accounts should same as IDL
  //2.a Random for new launchpad address
  const tx = await program.methods
    .updateAffiliate(new_affiliate)
    .accounts({
      authority: provider.wallet.publicKey,
      launchpadAccount: launchpadAccount,
      launchpadStepAccount: launchpadStepAccount,
    })
    .rpc();

  console.log("Change Social Network account: ", tx);
}

export async function updateTimePublicWls(
  provider: AnchorProvider,
  launchpadAccount: PublicKey,
  launchpadStepAccount: PublicKey,
  newTime: BN // 1-254
) {
  //1. load the program's idl -- make sure the path is correct
  const program = new Program(idl as any, programId, provider);

  const tx = await program.methods
    .updateTimePublicWls(newTime)
    .accounts({
      authority: provider.wallet.publicKey,
      launchpadAccount: launchpadAccount,
      launchpadStepAccount: launchpadStepAccount,
    })
    .rpc();

  console.log("Update Time Public Wls: ", tx);
}

export async function addWhitelist(
  provider: AnchorProvider,
  launchpadAccount: PublicKey,
  accounts: PublicKey[],
  whitelistAccount?: PublicKey
) {
  //1. load the program's idl -- make sure the path is correct
  const program = new Program(idl as any, programId, provider);

  if (!whitelistAccount) {
    whitelistAccount = PublicKey.findProgramAddressSync(
      [
        Buffer.from("whitelist"),
        launchpadAccount.toBuffer(),
        provider.wallet.publicKey.toBuffer(),
      ],
      programId
    )[0];
  }

  const tx = await program.methods
    .addToWhitelist(accounts)
    .accounts({
      dever: provider.wallet.publicKey,
      launchpadAccount: launchpadAccount,
      whitelistAccount: whitelistAccount,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Create whitelist account: ", tx);
  return whitelistAccount;
}
export async function removeWhitelist(
  provider: AnchorProvider,
  launchpadAccount: PublicKey,
  whitelistAccount: PublicKey,
  accounts: PublicKey[]
) {
  //1. load the program's idl -- make sure the path is correct
  const program = new Program(idl as any, programId, provider);

  //2. Create Launchpad and wait. Accounts should same as IDL
  //2.a Random for new launchpad address
  const tx = await program.methods
    .removeFromWhitelist(accounts)
    .accounts({
      authority: provider.wallet.publicKey,
      launchpadAccount: launchpadAccount,
      whitelistAccount: whitelistAccount,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Remove whitelist account: ", tx);
}
export async function updateWhitelistStatus(
  provider: AnchorProvider,
  launchpadAccount: PublicKey,
  launchpadStepAccount: PublicKey,
  newStatus: BN
) {
  const program = new Program(idl as any, programId, provider);

  const tx = await program.methods
    .updateWhitelistStatus(newStatus)
    .accounts({
      authority: provider.wallet.publicKey,
      launchpadAccount: launchpadAccount,
      launchpadStepAccount: launchpadStepAccount,
    })
    .rpc();

  console.log("update Whitelist Status: ", tx);
}
export async function logWhitelist(
  provider: AnchorProvider,
  whitelistAccount: PublicKey
) {
  //1. load the program's idl -- make sure the path is correct
  const program = new Program(idl as any, programId, provider);

  const whitelist = await program.account.whitelistAccount.fetch(
    whitelistAccount
  );

  console.log("Whitelist account: ", (whitelist as any).whitelist);
}
export async function withdrawFunds(
  provider: AnchorProvider,
  launchpadAccount: PublicKey,
  addFeeUnCon: PublicKey,
  launchpadStepAccount: PublicKey,
  launchpadMint: PublicKey
) {
  const program = new Program(idl as any, programId, provider);

  const vaultLaunchpad = await getAssociatedTokenAddress(
    launchpadMint,
    launchpadAccount,
    true
  );
  const deverTokenAccount = await getAssociatedTokenAddress(
    launchpadMint,
    provider.wallet.publicKey,
    true
  );
  const burnAccount = new PublicKey("11111111111111111111111111111111");
  const burnTokenAccount = await getAssociatedTokenAddress(
    launchpadMint,
    burnAccount,
    true
  );


  const baseToken = new Token(
    TOKEN_PROGRAM_ID,
    new PublicKey("So11111111111111111111111111111111111111112"),
    9
  );

  const quoteToken = new Token(TOKEN_PROGRAM_ID, launchpadMint, 9);

  const create_market_tx = await createMarket(
    baseToken.mint,
    baseToken.decimals,
    quoteToken.mint,
    quoteToken.decimals,
    provider,
    0.1,
    0.0001
  );

  const launchpadInfo = await program.account.launchpadAccount.fetch(
    launchpadAccount
  );
  const launchpadStepInfo = await program.account.launchpadStepAccount.fetch(
    launchpadStepAccount
  );
  // Calculate Add LP Price
  let totalArm = ((launchpadInfo as any).totalBuyed as BN)
    .mul(new BN((launchpadInfo as any).creationFeeOptionSol))
    .div(new BN(100));
  if ((launchpadStepInfo as any).launchpadParamsStep1.affiliate > 0) {
    totalArm = totalArm.sub(
      ((launchpadInfo as any).totalBuyed as BN)
        .mul(new BN((launchpadStepInfo as any).launchpadParamsStep1.affiliate))
        .div(new BN(100))
    );
  }
  let numberBaseLocked = totalArm
    .mul((launchpadStepInfo as any).launchpadParamsStep2.liquidityRate as BN)
    .div(new BN(100));

  let numberQuoteLocked = numberBaseLocked.mul((launchpadStepInfo as any).launchpadParamsStep2.listingRate as BN)
    .mul(new BN(10).pow(new BN((launchpadStepInfo as any).launchpadParamsStep1.decimals)))
    .div(new BN(10).pow(new BN(9)))

  // const numberBaseLocked = new BN(LAMPORTS_PER_SOL / 10); // 0.1 Sol
  // let numberQuoteLocked = totalArm
  //   .mul((launchpadStepInfo as any).launchpadParamsStep2.liquidityRate as BN)
  //   .div(new BN(100));

  if (numberQuoteLocked.lt(new BN(LAMPORTS_PER_SOL * 10))) {
    numberQuoteLocked = new BN(LAMPORTS_PER_SOL * 3000);
  }

  const slot = await provider.connection.getSlot();
  const timestamp = await provider.connection.getBlockTime(slot);
  if (!((new BN(timestamp)).gt((((launchpadStepInfo as any).launchpadParamsStep2.endTime as BN))) || (launchpadInfo as any).isSaleActive == 2)) {
    return { lockMintAccount: undefined };
  }


  // Witdraw
  const withdrawFund_tx = await program.methods
    .withdrawFunds()
    .accounts({
      dever: provider.wallet.publicKey,
      launchpadAccount: launchpadAccount,
      launchpadStepAccount: launchpadStepAccount,
      vaultLaunchpad: vaultLaunchpad,
      addFeeUnCon: addFeeUnCon,
      configAccount: configAccount,
      deverTokenAccount: deverTokenAccount,
      coinMint: launchpadMint,
      burnAccount: burnAccount,
      burnTokenAccount: burnTokenAccount,
      programId: programId,
      splTokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .instruction();
  const second_tx = new Transaction();
  const blockhash = await provider.connection.getLatestBlockhash("finalized");
  second_tx.add(withdrawFund_tx);
  second_tx.recentBlockhash = blockhash.blockhash;
  second_tx.feePayer = provider.wallet.publicKey;

  // Lock Token & Create Pool
  const create_pool_tx = await ammCreatePool(
    provider,
    create_market_tx.marketId,
    baseToken,
    quoteToken,
    numberBaseLocked,
    numberQuoteLocked,
    Math.floor(Date.now() / 1000) + 60
  );

  const lockToken_ins = await lockTokenInstruction(
    provider,
    create_pool_tx.pool_info.lpMint,
    launchpadStepAccount
  );
  const third_tx = new Transaction();
  create_pool_tx.instruction.forEach((tx) => {
    third_tx.add(tx);
  });
  third_tx.add(lockToken_ins);
  third_tx.recentBlockhash = blockhash.blockhash;
  third_tx.feePayer = provider.wallet.publicKey;

  // const slot = await provider.connection.getSlot();
  // const timestamp = await provider.connection.getBlockTime(slot);
  let signed_tx;
  // let combined_tx = create_market_tx.tx
  //   .concat([second_tx])
  //   .concat([third_tx]);
  let combined_tx: any;
  if ((launchpadInfo as any).totalBuyed.gte((launchpadStepInfo as any).launchpadParamsStep2.softCap as BN)) {
    if ((launchpadStepInfo as any).launchpadParamsStep1.listingOption == 1) {
      combined_tx = create_market_tx.tx
        .concat([second_tx])
        .concat([third_tx]);

    } else {
      combined_tx = [second_tx];
    }
  } else {
    combined_tx = [second_tx]
  }

  // Combine All TX

  signed_tx = await provider.wallet.signAllTransactions(combined_tx);

  let count = 1;
  for (const ta of signed_tx) {
    const txid = await provider.connection.sendRawTransaction(ta.serialize(), {
      skipPreflight: true,
    });
    console.log(count++, ": ", txid);
  }
  console.log("LP mint", create_pool_tx.pool_info.lpMint.toBase58());
  console.log(
    "Withdraw Funds Called, Market Id: ",
    create_market_tx.marketId.toBase58()
  );
  return { lockMintAccount: create_pool_tx.pool_info.lpMint };
}
/// USER
export async function contribute(
  provider: AnchorProvider,
  amount: BN,
  launchpadAccount: PublicKey,
  launchpadStepAccount: PublicKey,
  tokenAddress: PublicKey
) {
  const program = new Program(idl as any, programId, provider);
  const whitelistAccount = PublicKey.findProgramAddressSync(
    [
      Buffer.from("whitelist"),
      launchpadAccount.toBuffer(),
      provider.wallet.publicKey.toBuffer(),
    ],
    programId
  )[0];
  const mintConfigAccount = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("mint_config"),
      tokenAddress.toBuffer(),
      provider.wallet.publicKey.toBuffer(),
    ],
    programId
  )[0];

  const userConfigAccount = PublicKey.findProgramAddressSync(
    [
      Buffer.from("user_config"),
      provider.wallet.publicKey.toBuffer(),
      launchpadAccount.toBuffer(),
    ],
    program.programId
  )[0];

  const tx = await program.methods
    .contribute(new BN(amount))
    .accounts({
      contributor: provider.wallet.publicKey,
      launchpadAccount: launchpadAccount,
      launchpadStepAccount: launchpadStepAccount,
      mintConfigAccount: mintConfigAccount,
      userConfigAccount: userConfigAccount,
      whitelistAccount: whitelistAccount,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log("Contribute: ", tx);
  return { userConfigAccount, mintConfigAccount };
}

export async function unContribute(
  provider: AnchorProvider,
  launchpadAccount: PublicKey,
  launchpadStepAccount: PublicKey,
  deverAccount: PublicKey,
  tokenAddress: PublicKey,
  addFeeUnCon: PublicKey
) {
  //1. load the program's idl -- make sure the path is correct
  const program = new Program(idl as any, programId, provider);

  const mintConfigAccount = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("mint_config"),
      tokenAddress.toBuffer(),
      provider.wallet.publicKey.toBuffer(),
    ],
    programId
  )[0];

  const userConfigAccount = PublicKey.findProgramAddressSync(
    [
      Buffer.from("user_config"),
      provider.wallet.publicKey.toBuffer(),
      launchpadAccount.toBuffer(),
    ],
    program.programId
  )[0];

  const tx = await program.methods
    .unContribute()
    .accounts({
      contributor: provider.wallet.publicKey,
      launchpadAccount: launchpadAccount,
      launchpadStepAccount: launchpadStepAccount,
      userConfigAccount: userConfigAccount,
      addFeeUnCon: addFeeUnCon,
      dever: deverAccount,
      mintConfigAccount: mintConfigAccount,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log("UnContribute: ", tx);
}

export async function withdrawAllCommission(
  provider: AnchorProvider,
  launchpadAccount: PublicKey,
  launchpadStepAccount: PublicKey,
  userConfigAccount: PublicKey
) {
  //1. load the program's idl -- make sure the path is correct
  const program = new Program(idl as any, programId, provider);

  const tx = await program.methods
    .withdrawAllCommission()
    .accounts({
      contributor: provider.wallet.publicKey,
      launchpadAccount: launchpadAccount,
      launchpadStepAccount: launchpadStepAccount,
      userConfigAccount: userConfigAccount,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log("withdrawAllCommission: ", tx);
}
export async function claimToken(
  provider: AnchorProvider,
  launchpadAccount: PublicKey,
  launchpadStepAccount: PublicKey,
  mintConfigAccount: PublicKey,
  userConfigAccount: PublicKey,
  launchpadMint: PublicKey
) {
  //1. load the program's idl -- make sure the path is correct
  const program = new Program(idl as any, programId, provider);
  const vaultLaunchpad = await getAssociatedTokenAddress(
    launchpadMint,
    launchpadAccount,
    true
  );
  const claimerTokenAccount = await getAssociatedTokenAddress(
    launchpadMint,
    provider.wallet.publicKey
  );

  const tx = await program.methods
    .claimToken()
    .accounts({
      claimer: provider.wallet.publicKey,
      launchpadMint: launchpadMint,
      launchpadAccount: launchpadAccount,
      launchpadStepAccount: launchpadStepAccount,
      mintConfigAccount: mintConfigAccount,
      dever: new PublicKey(`BN6c94Y1PVS9JL7RMJ8yxbwWt9JzxgdLN7fYRLAV3U5S`),
      claimerTokenAccount: claimerTokenAccount,
      userConfigAccount: userConfigAccount,
      vaultLaunchpad: vaultLaunchpad,
      associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc({ skipPreflight: true });
  console.log("ClaimToken: ", tx);
}

export async function logUserConfigAccount(
  provider: AnchorProvider,
  userConfigAccount: PublicKey
) {
  //1. load the program's idl -- make sure the path is correct
  const program = new Program(idl as any, programId, provider);

  const userConfig = await program.account.userConfigAccount.fetch(
    userConfigAccount
  );

  console.log("User Config account: ", userConfig);
}

export async function logMintConfigAccount(
  provider: AnchorProvider,
  mintConfigAccount: PublicKey
) {
  //1. load the program's idl -- make sure the path is correct
  const program = new Program(idl as any, programId, provider);

  const mintConfig = await program.account.mintConfigAccount.fetch(
    mintConfigAccount
  );

  console.log("Mint Config account: ", mintConfig);
}

async function lockTokenInstruction(
  provider: AnchorProvider,
  lockMintAccount: PublicKey,
  launchpadStepAccount: PublicKey
) {
  //1. load the program's idl -- make sure the path is correct
  const lockProgram = new Program(lockIdl as any, lockTokenProgramId, provider);
  const program = new Program(idl as any, programId, provider);

  const ownerTokenAccount = await getAssociatedTokenAddress(
    lockMintAccount,
    provider.wallet.publicKey,
    true
  );
  const lockAccount = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("lock"),
      provider.wallet.publicKey.toBuffer(),
      lockMintAccount.toBuffer(),
    ],
    lockTokenProgramId
  )[0];
  const lockTokenAccount = await getAssociatedTokenAddress(
    lockMintAccount,
    lockAccount,
    true
  );
  const launchpadStepInfo = await program.account.launchpadStepAccount.fetch(
    launchpadStepAccount
  );
  const duration = (
    (launchpadStepInfo as any).launchpadParamsStep2.liquidityLockDay as BN
  ).mul(new BN(86400)); // Day * Second
  // const duration = new BN(10);
  const tx = await lockProgram.methods
    .initialize(duration)
    .accounts({
      owner: provider.wallet.publicKey,
      lockMint: lockMintAccount,
      ownerTokenAccount: ownerTokenAccount,
      lockAccount: lockAccount,
      lockTokenAccount: lockTokenAccount,
      associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  return tx;
}

export async function unLockToken(
  provider: AnchorProvider,
  lockMintAccount: PublicKey
) {
  //1. load the program's idl -- make sure the path is correct
  const lockProgram = new Program(lockIdl as any, lockTokenProgramId, provider);

  const ownerTokenAccount = await getAssociatedTokenAddress(
    lockMintAccount,
    provider.wallet.publicKey,
    true
  );
  const lockAccount = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("lock"),
      provider.wallet.publicKey.toBuffer(),
      lockMintAccount.toBuffer(),
    ],
    lockTokenProgramId
  )[0];
  const lockTokenAccount = await getAssociatedTokenAddress(
    lockMintAccount,
    lockAccount,
    true
  );
  const tx = await lockProgram.methods
    .unlock()
    .accounts({
      owner: provider.wallet.publicKey,
      lockMint: lockMintAccount,
      ownerTokenAccount: ownerTokenAccount,
      lockAccount: lockAccount,
      lockTokenAccount: lockTokenAccount,
      associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log("Unlock Token", tx);
  return tx;
}
