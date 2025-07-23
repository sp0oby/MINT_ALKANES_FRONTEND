# Love Bombs - Alkanes Minting dApp

A dApp for minting Love Bombs tokens using the Alkanes protocol on Bitcoin.

## Overview

This project is a web application that allows users to mint Love Bombs tokens using the Alkanes protocol. It uses:

- React + Vite for the frontend
- OYL SDK for Bitcoin and Alkanes protocol interactions
- LaserEyes for wallet connections
- Oylnet (shared regtest environment) for testing

## Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your actual API key
# Replace 'your_sandshrew_api_key_here' with your real Sandshrew API key
```

The `.env.example` file contains all the necessary environment variables with explanations. You'll need to:

- Get a Sandshrew API key from the [Sandshrew service](https://sandshrew.com)
- Replace `your_sandshrew_api_key_here` with your actual API key
- Optionally configure other settings like network type or debug mode

## Development

1. Start the development server:

```bash
npm run dev
```

2. In a separate terminal, start the backend server:

```bash
node server.cjs
```

## Using Oylnet

This project uses Oylnet, a shared regtest environment for Bitcoin development. To use it:

1. Make sure you have a compatible wallet (Unisat, Leather, OYL, etc.) installed
2. Connect your wallet to the dApp
3. Fund your address with test BTC using the fund-address.js script:

```bash
node fund-address.js <your-address> <amount-in-sats>
```

Example:
```bash
node fund-address.js bcrt1p9n9twhzk4sql3j9t7slj7v9des4ykxn2yt9chxf09c32hg0pef0sg74egg 1000000
```

4. After funding, you can mint your tokens using the dApp

## Troubleshooting

If you encounter issues with transaction signing:

1. Make sure your wallet is connected to Oylnet (testnet mode)
2. Check that your address has sufficient funds
3. For Taproot addresses, ensure the wallet properly supports P2TR signing
4. Check the server logs for detailed error information

## Resources

- [Oylnet Explorer](https://oylnet.oyl.gg)
- [OYL SDK Documentation](https://docs.oyl.gg)
- [Alkanes Protocol Documentation](https://alkanes.org)
