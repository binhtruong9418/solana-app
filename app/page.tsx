'use client';

import {
  WalletDisconnectButton,
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui';
import Wallet from './components/Wallet';
import Body from './components/Body';
export default function Home() {
  return (
    <main className='w-full'>
      <Wallet>
        <div className='w-full text-center'>Contract</div>
        <div className='w-full text-center'>
          <WalletMultiButton />
          <WalletDisconnectButton />
  'use client';

import {
  WalletDisconnectButton,
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui';
import Wallet from './components/Wallet';
import Body from './components/Body';
export default function Home() {
  return (
    <main className='w-full'>
      <Wallet>
        <div className='w-full text-center'>Contract</div>
        <div className='w-full text-center'>
          <WalletMultiButton />
          <WalletDisconnectButton />
        </div>
        <div>Instruction: Copy IDL file into lib/solana/idl.json</div>
        <div>1. Required Create launchpad once to log launchpadInfo and all related functions.</div>
        <div>2. Required Add Whitelist once to log whitelist and all related functions.</div>
        <div>3. Required Contribute once to log user and mint config and all related functions.</div>
        <div>4. Please note all important address for later queries. Including launchpadAccount, launchpadStepAccount, whitelistAccount, userConfigAccount, mintConfigAccount</div>
        <div>
          <Body />
        </div>
      </Wallet>
    </main>
  );
}
