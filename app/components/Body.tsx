'use client';

import { useAnchorWallet, AnchorWallet } from '@solana/wallet-adapter-react';

import { AnchorProvider, BN, web3 } from '@coral-xyz/anchor';

import {
  addWhitelist,
  cancelLaunchpad,
  changeCreateFee,
  changeInfoSocialNetwork,
  claimToken,
  contribute,
  createLaunchpad,
  getLaunchpadInfo,
  logConfigAccount,
  logMintConfigAccount,
  logUserConfigAccount,
  logWhitelist,
  removeWhitelist,
  unContribute,
  unLockToken,
  updateAffiliate,
  updateTimePublicWls,
  updateWhitelistStatus,
  withdrawAllCommission,
  withdrawFunds,
} from '@/lib/solana/launchpad';

import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
} from '@solana/web3.js';

import { useMemo, useState } from 'react';
import { Field, Form, Formik } from 'formik';
import config from "../../lib/solana/config.json";

// Hard set
const addFeeUnCon = new PublicKey(config.addFeeUnCon);
const configAccount = new PublicKey(config.configAccount);


export default function Body() {
  const wallet = useAnchorWallet();
  const [launchpad, setLaunchpad] = useState<PublicKey[]>();

  const [tokenAddress, setTokenAddress] = useState<string>();
  const [dever, setDever] = useState<PublicKey>();
  const [lockMintAccount, setLockMintAccount] = useState<PublicKey>();

  const [whitelistAccount, setWhitelistAccount] = useState<PublicKey>();
  const [userConfigAccount, setUserConfigAccount] = useState<PublicKey>();
  const [mintConfigAccount, setMintConfigAccount] = useState<PublicKey>();
  const provider = useMemo(() => {
    const connection = new Connection("https://solana-devnet.g.alchemy.com/v2/rwUTm3w4Z7Jaf2-is6p8vjDOzETGJk9B");
    return new AnchorProvider(connection, wallet as unknown as AnchorWallet, {
      commitment: 'confirmed',
    });
  }, [wallet]);

  return (
    <div className='flex flex-row space-x-24 px-24'>
      <div className='flex flex-col justify-start'>
        <h1 className='text-green-400 mt-4'>Admin</h1>

        <Formik
          initialValues={{
            token: tokenAddress,
          }}
          onSubmit={async (values: any) => {
            setTokenAddress(values.token);
          }}
        >
          <Form className='flex flex-col'>
            <label htmlFor='token'>Token Address</label>
            <Field id='token' name='token' />
            <button type='submit' className='bg-red-500 w-max my-5'>
              Update Address
            </button>
            <div className='flex flex-col mb-4'>
              <p>token: {tokenAddress}</p>
            </div>
          </Form>
        </Formik>

        <Formik
          initialValues={{
            newFee: '0',
            creationFreeOptionSol: '0',
          }}
          onSubmit={async (values: any) => {
            if (!addFeeUnCon) return;

            const configAccount = await changeCreateFee(
              provider,
              new BN(values.newFee),
              new BN(values.creationFreeOptionSol),
              new web3.PublicKey(addFeeUnCon)
            );
            console.log('ConfigAccount: ', configAccount.toBase58());
          }}
        >
          <Form className='flex flex-col'>
            <label htmlFor='newFee'>New Fee</label>
            <Field id='newFee' name='newFee' />
            <label htmlFor='creationFreeOptionSol'>Fee Options</label>
            <Field id='creationFreeOptionSol' name='creationFreeOptionSol' />

            <button type='submit' className='bg-red-500 w-max my-5'>
              Change Create Fee
            </button>
          </Form>
        </Formik>

        <h1 className='text-green-400 mt-4'>Dever</h1>

        <Formik
          initialValues={{
            listingOption: 1,
            affiliate: 0,
            totalTokenTo: new BN(300000).toString(),
            decimals: 0,
            contractToken: tokenAddress,
            preRate: new BN(1).toString(),
            whitelist: new BN(0).toString(),
            liquidityLockDay: new BN(0).toString(),
            softCap: new BN(10 * LAMPORTS_PER_SOL).toString(),
            hardCap: new BN(100 * LAMPORTS_PER_SOL).toString(), //100 SOL
            minBuy: new BN(0.1 * LAMPORTS_PER_SOL).toString(), //0.1 SOL
            maxBuy: new BN(1 * LAMPORTS_PER_SOL).toString(), //1 SOL
            typeRefund: new BN(0).toString(),
            liquidityRate: new BN(15).toString(),
            listingRate: new BN(10).toString(),
            startTime: new BN(Date.now()).toString(),
            endTime: new BN(Date.now() + 100000).toString(),
          }}
          onSubmit={async (values: any) => {
            if (!tokenAddress || !addFeeUnCon) return;

            const { launchpadAccount, launchpadStepAccount } =
              await createLaunchpad(provider, {
                launchpad_token_address: tokenAddress,
                amountOfToken: new BN(values.totalTokenTo),
                addFeeUnCon: new PublicKey(addFeeUnCon),
                step1: {
                  listingOption: new BN(values.listingOption),
                  affiliate: new BN(values.affiliate),
                  totalTokenTo: new BN(values.totalTokenTo),
                  decimals: new BN(values.decimals),
                  contractToken: new web3.PublicKey(tokenAddress),
                },
                step2: {
                  preRate: new BN(values.preRate),
                  whitelist: new BN(values.whitelist),
                  liquidityLockDay: new BN(values.liquidityLockDay),

                  softCap: new BN(values.softCap),
                  hardCap: new BN(values.hardCap),
                  minBuy: new BN(values.minBuy),
                  maxBuy: new BN(values.maxBuy),
                  typeRefund: new BN(values.typeRefund),
                  liquidityRate: new BN(values.liquidityRate),
                  listingRate: new BN(values.listingRate),
                  startTime: new BN(values.startTime),
                  endTime: new BN(values.endTime),
                },
              });
            console.log('LaunchpadAccount: ', launchpadAccount.toBase58());
            console.log(
              'LaunchpadStepAccount: ',
              launchpadStepAccount.toBase58()
            );
            setDever(provider.wallet.publicKey);
            setLaunchpad([launchpadAccount, launchpadStepAccount]);
          }}
        >
          <Form>
            <div className='flex flex-col'>
              <label htmlFor='listingOption'>listingOption</label>
              <Field id='listingOption' name='listingOption' />

              <label htmlFor='affiliate'>affiliate</label>
              <Field id='affiliate' name='affiliate' />

              <label htmlFor='totalTokenTo'>totalTokenTo</label>
              <Field id='totalTokenTo' name='totalTokenTo' />

              <label htmlFor='decimals'>decimals</label>
              <Field id='decimals' name='decimals' />

              <label htmlFor='contractToken'>contractToken</label>
              <Field id='contractToken' name='contractToken' />

              <label htmlFor='preRate'>preRate</label>
              <Field id='preRate' name='preRate' />

              <label htmlFor='whitelist'>whitelist</label>
              <Field id='whitelist' name='whitelist' />

              <label htmlFor='liquidityLockDay'>liquidityLockDay</label>
              <Field id='liquidityLockDay' name='liquidityLockDay' />

              <label htmlFor='softCap'>softCap</label>
              <Field id='softCap' name='softCap' />

              <label htmlFor='hardCap'>hardCap</label>
              <Field id='hardCap' name='hardCap' />

              <label htmlFor='minBuy'>minBuy</label>
              <Field id='minBuy' name='minBuy' />

              <label htmlFor='maxBuy'>maxBuy</label>
              <Field id='maxBuy' name='maxBuy' />

              <label htmlFor='typeRefund'>typeRefund</label>
              <Field id='typeRefund' name='typeRefund' />

              <label htmlFor='liquidityRate'>liquidityRate</label>
              <Field id='liquidityRate' name='liquidityRate' />

              <label htmlFor='listingRate'>listingRate</label>
              <Field id='listingRate' name='listingRate' />

              <label htmlFor='startTime'>startTime</label>
              <Field id='startTime' name='startTime' />

              <label htmlFor='endTime'>endTime</label>
              <Field id='endTime' name='endTime' />
            </div>

            <button type='submit' className='bg-red-500 w-max my-5'>
              Create Launchpad
            </button>
          </Form>
        </Formik>

        <button
          className='bg-red-500 w-max my-2'
          onClick={async () => {
            if (launchpad?.length == 2 && tokenAddress) {
              await cancelLaunchpad(provider, launchpad[0], new PublicKey(tokenAddress));
            }
          }}
        >
          Cancel Launchpad
        </button>
        <button
          className='bg-red-500 w-max my-2'
          onClick={async () => {
            if (launchpad?.length == 2) {
              await changeInfoSocialNetwork(
                provider,
                launchpad[0],
                launchpad[1],
                {
                  logoUrl: 'https://pancakeswap.io/',
                  website: 'https://pancakeswap.io/',
                  facebook: 'https://pancakeswap.io/',
                  twitter: 'https://pancakeswap.io/',
                  github: 'https://pancakeswap.io/',
                  telegram: 'https://pancakeswap.io/',
                  instagram: 'https://pancakeswap.io/',
                  reddit: 'https://pancakeswap.io/',
                  discord: 'https://pancakeswap.io/',
                  youtube: 'https://pancakeswap.io/',
                  description: 'https://pancakeswap.io/',
                }
              );
            }
          }}
        >
          Change Social Network
        </button>

        <Formik
          initialValues={{
            affiliate: '0',
          }}
          onSubmit={async (values: any) => {
            if (launchpad?.length == 2) {
              await updateAffiliate(
                provider,
                launchpad[0],
                launchpad[1],
                new BN(values.affiliate)
              );
            }
          }}
        >
          <Form>
            <label htmlFor='affiliate'>affiliate</label>
            <Field id='affiliate' name='affiliate' />
            <button type='submit' className='bg-red-500 w-max my-2'>
              Update Affiliate
            </button>
          </Form>
        </Formik>

        <Formik
          initialValues={{
            time: 0,
          }}
          onSubmit={async (values: any) => {
            if (launchpad?.length == 2) {
              await updateTimePublicWls(
                provider,
                launchpad[0],
                launchpad[1],
                new BN(values.time)
              );
            }
          }}
        >
          <Form>
            <label htmlFor='time'>time</label>
            <Field id='time' name='time' />

            <button type='submit' className='bg-red-500 w-max my-2'>
              Update Time Public Wls
            </button>
          </Form>
        </Formik>

        <Formik
          initialValues={{
            status: 0,
          }}
          onSubmit={async (values: any) => {
            if (launchpad?.length == 2) {
              await updateWhitelistStatus(
                provider,
                launchpad[0],
                launchpad[1],
                new BN(values.status)
              );
            }
          }}
        >
          <Form>
            <label htmlFor='status'>status</label>
            <Field id='status' name='status' />

            <button type='submit' className='bg-red-500 w-max my-2 mb-10'>
              Update Whitelist Status
            </button>
          </Form>
        </Formik>

        <Formik
          initialValues={{
            whitelistAccountNew: '',
          }}
          onSubmit={async (values: any) => {
            if (launchpad?.length == 2) {
              const whitelistAccountNew = await addWhitelist(
                provider,
                launchpad[0],
                [new web3.PublicKey(values.whitelistAccountNew)],
                whitelistAccount
              );
              console.log('Whitelist Account: ', whitelistAccountNew);
              setWhitelistAccount(whitelistAccountNew);
            }
          }}
        >
          <Form>
            <label htmlFor='whitelistAccountNew'>Account</label>
            <Field id='whitelistAccountNew' name='whitelistAccountNew' />

            <button type='submit' className='bg-red-500 w-max my-2'>
              Add whitelist
            </button>
          </Form>
        </Formik>

        <Formik
          initialValues={{
            acccount: '0',
          }}
          onSubmit={async (values: any) => {
            if (launchpad?.length == 2 && whitelistAccount) {
              await removeWhitelist(provider, launchpad[0], whitelistAccount, [
                new web3.PublicKey(values.acccount),
              ]);
            }
          }}
        >
          <Form>
            <label htmlFor='acccount'>Account</label>
            <Field id='acccount' name='acccount' />

            <button type='submit' className='bg-red-500 w-max my-2'>
              Remove whitelist
            </button>
          </Form>
        </Formik>

        <button
          className='bg-red-500 w-max my-2 mb-12'
          onClick={async () => {
            if (launchpad?.length == 2 && tokenAddress) {
              const {lockMintAccount} = await withdrawFunds(
                provider,
                launchpad[0],
                addFeeUnCon,
                launchpad[1],
                new PublicKey(tokenAddress)
              );
              if (lockMintAccount) {
                setLockMintAccount(lockMintAccount);
              }
            }
          }}
        >
          Withdraw Funds
        </button>

        <button
          className='bg-red-500 w-max my-2 mb-12'
          onClick={async () => {
            if (launchpad?.length == 2 && lockMintAccount) {
              await unLockToken(
                provider,
                lockMintAccount,
              );
            }
          }}
        >
          Unlock Token
        </button>
        <h1 className='text-green-400 mt-4'>User</h1>

        <Formik
          initialValues={{
            amount: '0',
          }}
          onSubmit={async (values: any) => {
            if (launchpad?.length == 2 && tokenAddress) {
              const { userConfigAccount, mintConfigAccount } = await contribute(
                provider,
                new BN(values.amount),
                launchpad[0],
                launchpad[1],
                new PublicKey(tokenAddress)
              );
              console.log('userConfigAccount: ', userConfigAccount.toBase58());
              console.log('mintConfigAccount: ', mintConfigAccount.toBase58());
              setUserConfigAccount(userConfigAccount);
              setMintConfigAccount(mintConfigAccount);
            }
          }}
        >
          <Form>
            <label htmlFor='amount'>amount</label>
            <Field id='amount' name='amount' />

            <button type='submit' className='bg-red-500 w-max my-2'>
              Contribute
            </button>
          </Form>
        </Formik>

        <button
          className='bg-red-500 w-max my-2'
          onClick={async () => {
            if (launchpad?.length == 2 && tokenAddress && addFeeUnCon && dever) {
              await unContribute(
                provider,
                launchpad[0],
                launchpad[1],
                dever,
                new PublicKey(tokenAddress),
                new PublicKey(addFeeUnCon)
              );
            }
          }}
        >
          Un-Contribute
        </button>
        <button
          className='bg-red-500 w-max my-2'
          onClick={async () => {
            if (launchpad?.length == 2 && userConfigAccount) {
              await withdrawAllCommission(
                provider,
                launchpad[0],
                launchpad[1],
                userConfigAccount
              );
            }
          }}
        >
          Withdraw All Commission
        </button>
        <button
          className='bg-red-500 w-max my-2'
          onClick={async () => {
            if (
              launchpad?.length == 2 &&
              mintConfigAccount &&
              userConfigAccount &&
              tokenAddress
            ) {
              await claimToken(
                provider,
                launchpad[0],
                launchpad[1],
                mintConfigAccount,
                userConfigAccount,
                new PublicKey(tokenAddress)
              );
            }
          }}
        >
          Claim Token
        </button>
      </div>
      <div className='flex flex-col justify-start'>
        <button
          className='bg-blue-500 w-max my-72'
          onClick={async () => {
            if (configAccount) {
              await logConfigAccount(provider, configAccount);
            }
          }}
        >
          Console Log ConfigInfo
        </button>
        <button
          className='bg-blue-500 w-max my-28 mb-36'
          onClick={async () => {
            if (launchpad?.length == 2) {
              await getLaunchpadInfo(provider, launchpad[0], launchpad[1]);
            }
          }}
        >
          Console Log LaunchpadInfo
        </button>

        <button
          className='bg-blue-500 w-max my-6 mb-36'
          onClick={async () => {
            if (whitelistAccount) {
              await logWhitelist(provider, whitelistAccount);
            }
          }}
        >
          Console Log whitelist
        </button>

        <button
          className='bg-blue-500 w-max my-2'
          onClick={async () => {
            if (userConfigAccount) {
              await logUserConfigAccount(provider, userConfigAccount);
            }
          }}
        >
          Log UserConfigAccount
        </button>
        <button
          className='bg-blue-500 w-max my-2'
          onClick={async () => {
            if (mintConfigAccount) {
              await logMintConfigAccount(provider, mintConfigAccount);
            }
          }}
        >
          Log MintConfigAccount
        </button>
      </div>
    </div>
  );
}
