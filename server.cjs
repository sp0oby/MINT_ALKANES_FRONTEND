const express = require('express');
const cors = require('cors');
const bitcoin = require('bitcoinjs-lib');
const ecc = require('tiny-secp256k1');
const fetch = require('node-fetch');
const { encodeRunestoneProtostone, ProtoStone, encipher } = require('alkanes/lib/index');
const path = require('path');
const fs = require('fs');
const { Provider } = require('@oyl/sdk');

// Load environment variables from .env file
try {
  const envPath = path.resolve(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = envContent.split('\n').filter(line => line.trim() !== '');
    
    envVars.forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
    
    console.log('Environment variables loaded from .env file');
  }
} catch (error) {
  console.warn('Error loading .env file:', error.message);
}

// Try to import OYL SDK
let oylSdk = null;
try {
  // Adjust the path as needed to point to the actual location
  oylSdk = require('../oyl-sdk-main/oyl-sdk-main/lib/index');
  console.log('OYL SDK loaded successfully');
} catch (error) {
  console.warn('OYL SDK not found, using fallback implementation:', error.message);
}

// Initialize the ECC library
bitcoin.initEccLib(ecc);

const app = express();
app.use(cors());
app.use(express.json());

// Environment-based logging
const isDevelopment = process.env.NODE_ENV === 'development';
const isVerboseLogging = process.env.VITE_VERBOSE_LOGGING === 'true';
const debugLog = (...args) => {
  if (isDevelopment || isVerboseLogging) {
    console.log(...args);
  }
};

// Network configuration for Mainnet
const MAINNET_CONFIG = {
  ...bitcoin.networks.bitcoin, // Use mainnet parameters
  bech32: 'bc',  // Mainnet bech32 prefix
  messagePrefix: '\x18Bitcoin Signed Message:\n'
};

// Network configuration for TestNet (kept for fallback)
const TESTNET_CONFIG = {
  ...bitcoin.networks.testnet
};

// Log network configuration
// Network configurations loaded

// API keys for external services
const API_KEYS = {
  sandshrew: process.env.VITE_SANDSHREW_PROJECT_ID
};

// Validate required environment variables
if (!API_KEYS.sandshrew) {
  console.error('ERROR: VITE_SANDSHREW_PROJECT_ID environment variable is required but not set!');
  console.error('Please check your .env file or environment configuration.');
  process.exit(1);
}

// Define dust amount for Bitcoin transactions
const DUST_AMOUNT = Number(process.env.VITE_DUST_AMOUNT) || 546; // Minimum amount in satoshis for a valid UTXO

// Production server - no test keys needed

// Mainnet API configuration - Updated to use Sandshrew
const MAINNET_API = {
  url: process.env.VITE_SANDSHREW_API_URL || 'https://api.sandshrew.io/v2',
  projectId: process.env.VITE_SANDSHREW_PROJECT_ID,
  networkType: 'mainnet'
};

// Sandshrew API helper for UTXO fetching
const sandshrewApi = {
  baseUrl: process.env.VITE_SANDSHREW_API_URL || 'https://api.sandshrew.io/v2',
  projectId: process.env.VITE_SANDSHREW_PROJECT_ID
};

// Helper function to detect address type
const getAddressInfo = (address) => {
  if (!address) {
    return { isValid: false, isTaproot: false, isSegwit: false, original: address };
  }
  
  // Check if the address is a valid mainnet address
  const isMainnetAddress = address.startsWith('bc1');
  const isTestnetAddress = address.startsWith('tb1');
  
  // Check if the address is a Taproot address (P2TR)
  const isTaproot = address.startsWith('bc1p') || address.startsWith('tb1p');
  
  // Check if the address is a SegWit address (P2WPKH)
  const isSegwit = address.startsWith('bc1q') || address.startsWith('tb1q');
  
  // Get the appropriate network configuration
  const network = isMainnetAddress ? MAINNET_CONFIG : TESTNET_CONFIG;
  
  // Validate the address
  let isValid = false;
  try {
    // Try to decode the address using bitcoinjs-lib
    bitcoin.address.toOutputScript(address, network);
    isValid = true;
  } catch (error) {
    console.error(`Invalid address: ${address}`, error.message);
    isValid = false;
  }
  
  return {
    original: address,
    isTaproot,
    isSegwit,
    isValid,
    network: isMainnetAddress ? 'mainnet' : 'testnet'
  };
};

// Try to extract the public key from a Taproot address
function extractPubKeyFromTaprootAddress(address) {
  try {
    const scriptPubKey = bitcoin.address.toOutputScript(address, bitcoin.networks.bitcoin);
    
    // The scriptPubKey should be 34 bytes: OP_1 (0x51) + push 32 bytes (0x20) + 32-byte x-only pubkey
    if (scriptPubKey.length === 34 && scriptPubKey[0] === 0x51 && scriptPubKey[1] === 0x20) {
      // Extract the 32-byte x-only public key
      const xOnlyPubKey = scriptPubKey.slice(2).toString('hex');
      return xOnlyPubKey;
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting public key from address:', error.message);
    return null;
  }
}

// Helper function to create OP_RETURN data for Alkanes protocol
function createAlkanesOpReturn(executeData) {
  try {
    // Use OYL SDK's encodeProtostone function if available
    if (oylSdk && oylSdk.alkanes && oylSdk.alkanes.encodeProtostone) {
      console.log('Using OYL SDK encodeProtostone function');
      
      // Extract the data from executeData
      const { alkaneId, opcode, calldata = [] } = executeData;
      
      // Convert values to BigInt for the Alkanes protocol
      const blockBigInt = BigInt(alkaneId.block || 0);
      const txBigInt = BigInt(alkaneId.tx || 0);
      const opcodeBigInt = BigInt(opcode || 77); // Default to 77 (M) for minting
      
      // Create calldata array - for mint operation
      const calldataArray = [blockBigInt, txBigInt, opcodeBigInt];
      
      // Debug the inputs
      debugLog('Creating Alkanes OP_RETURN with OYL SDK inputs:', {
        block: alkaneId.block,
        tx: alkaneId.tx,
        opcode,
        calldata: calldataArray
      });
      
      // Use OYL SDK's encodeProtostone function
      const protostone = oylSdk.alkanes.encodeProtostone({
        protocolTag: 1n,
        edicts: [], // No edicts for minting
        pointer: 0,
        refundPointer: 0,
        calldata: calldataArray,
      });
      
      console.log('Created Alkanes protostone with OYL SDK:', {
        protostoneHex: protostone.toString('hex'),
        protostoneLength: protostone.length
      });
      
      // Check if the protostone already starts with OP_RETURN (6a)
      const protostoneHex = protostone.toString('hex');
      let opReturnScript;
      
      if (protostoneHex.startsWith('6a')) {
        // The OYL SDK already returned a complete OP_RETURN script
        console.log('OYL SDK returned complete OP_RETURN script, using as-is');
        opReturnScript = protostone;
      } else {
        // The OYL SDK returned raw protostone data, wrap it in OP_RETURN
        console.log('OYL SDK returned raw protostone data, wrapping in OP_RETURN');
        opReturnScript = bitcoin.script.compile([
          bitcoin.opcodes.OP_RETURN,
          protostone
        ]);
      }
      
      debugLog('OP_RETURN data breakdown:');
      debugLog('- Starts with 6a (OP_RETURN):', protostoneHex.startsWith('6a'));
      debugLog('- Protostone data:', protostoneHex);
      debugLog('- Final OP_RETURN script:', opReturnScript.toString('hex'));
      
      return opReturnScript;
    } else {
      // Fallback to manual implementation
      console.log('Using fallback alkanes implementation');
      
      // Import the required functions from alkanes
      const { encipher } = require('alkanes/lib/index.js');
      const { ProtoStone, encodeRunestoneProtostone } = require('alkanes/lib/index.js');
      
      // Extract the data from executeData
      const { alkaneId, opcode, calldata = [] } = executeData;
      
      // Convert values to BigInt for the Alkanes protocol
      const blockBigInt = BigInt(alkaneId.block || 0);
      const txBigInt = BigInt(alkaneId.tx || 0);
      const opcodeBigInt = BigInt(opcode || 77); // Default to 77 (M) for minting
      
      // Create calldata array - for mint operation
      const calldataArray = [blockBigInt, txBigInt, opcodeBigInt];
      
      // Debug the inputs
      console.log('Creating Alkanes OP_RETURN with fallback inputs:', {
        block: alkaneId.block,
        tx: alkaneId.tx,
        opcode,
        calldata: calldataArray
      });
      
      // For tokens created from factory contracts, use ProtoStone wrapper without edicts
      // This matches the CLI example: oyl alkane execute -data '2, 14, 77'
      const protostone = encodeRunestoneProtostone({
        protostones: [
          ProtoStone.message({
            protocolTag: 1n,
            edicts: [], // No edicts for minting
            pointer: 0,
            refundPointer: 0,
            calldata: encipher(calldataArray),
          }),
        ],
      }).encodedRunestone;
      
      console.log('Created Alkanes protostone with fallback:', {
        protostoneHex: protostone.toString('hex'),
        protostoneLength: protostone.length
      });
      
      // Check if the protostone already starts with OP_RETURN (6a)
      const protostoneHex = protostone.toString('hex');
      let opReturnScript;
      
      if (protostoneHex.startsWith('6a')) {
        // The fallback already returned a complete OP_RETURN script
        console.log('Fallback returned complete OP_RETURN script, using as-is');
        opReturnScript = protostone;
      } else {
        // The fallback returned raw protostone data, wrap it in OP_RETURN
        console.log('Fallback returned raw protostone data, wrapping in OP_RETURN');
        opReturnScript = bitcoin.script.compile([
          bitcoin.opcodes.OP_RETURN,
          protostone
        ]);
      }
      
      debugLog('OP_RETURN data breakdown (fallback):');
      debugLog('- Starts with 6a (OP_RETURN):', protostoneHex.startsWith('6a'));
      debugLog('- Protostone data:', protostoneHex);
      debugLog('- Final OP_RETURN script:', opReturnScript.toString('hex'));
      
      return opReturnScript;
    }
    
  } catch (error) {
    console.error('Error creating Alkanes OP_RETURN:', error);
    throw error;
  }
}

// Note: processUTXOs function removed - UTXOs are now processed directly in processUTXOResponse

// Fetch UTXOs for an address using Sandshrew JSON-RPC API with fallbacks
const fetchUTXOs = async (address, publicKey) => {
  // First try Sandshrew JSON-RPC API (the correct way)
  try {
    console.log(`Fetching UTXOs from Sandshrew JSON-RPC API for address: ${address}`);
    
    const sandshrewRpcUrl = `${sandshrewApi.baseUrl}/${sandshrewApi.projectId}`;
    console.log(`Sandshrew RPC URL: ${sandshrewRpcUrl}`);
    
    const rpcRequest = {
      jsonrpc: '2.0',
      method: 'esplora_address::utxo',
      params: [address],
      id: 1
    };
    
    const response = await fetch(sandshrewRpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(rpcRequest),
      timeout: 10000
    });
    
    if (!response.ok) {
      throw new Error(`Sandshrew RPC error: ${response.status} ${response.statusText}`);
    }
    
    const rpcResponse = await response.json();
    
    if (rpcResponse.error) {
      throw new Error(`Sandshrew RPC error: ${rpcResponse.error.message}`);
    }
    
    const utxoResponse = rpcResponse.result;
    console.log(`Successfully fetched UTXOs from Sandshrew RPC, found ${utxoResponse.length} UTXOs`);
    
    return processUTXOResponse(utxoResponse, address, publicKey);
    
  } catch (sandshrewError) {
    console.error('Sandshrew RPC failed:', sandshrewError.message);
    
    // Fallback to REST APIs
    const restSources = [
      {
        name: 'Blockstream',
        url: `https://blockstream.info/api/address/${address}/utxo`,
        headers: {}
      },
      {
        name: 'Mempool.space',
        url: `https://mempool.space/api/address/${address}/utxo`,
        headers: {}
      }
    ];

    let lastError = sandshrewError;
    
    for (const source of restSources) {
      try {
        console.log(`Fetching UTXOs from ${source.name}: ${source.url}`);
        
        const response = await fetch(source.url, {
          headers: source.headers,
          timeout: 10000 // 10 second timeout
        });
        
        if (!response.ok) {
          throw new Error(`${source.name} API error: ${response.status} ${response.statusText}`);
        }
        
        const utxoResponse = await response.json();
        console.log(`Successfully fetched UTXOs from ${source.name}, found ${utxoResponse.length} UTXOs`);
        
        // Process the response - all sources should return similar format
        return processUTXOResponse(utxoResponse, address, publicKey);
        
      } catch (error) {
        console.error(`${source.name} failed:`, error.message);
        lastError = error;
        continue; // Try next source
      }
    }
    
    // If all sources failed, throw the last error
    throw lastError || new Error('All UTXO data sources failed');
  }
};

// Process UTXO response from any source
const processUTXOResponse = (utxoResponse, address, publicKey) => {
  try {
    
    console.log(`Found ${utxoResponse.length} UTXOs for address`);
    
    // Get the script pubkey for this address using the provided public key
    let scriptPubKey;
    try {
      if (address.startsWith('bc1q') && publicKey) {
        // Native Segwit (P2WPKH) - use the public key to generate the correct scriptPubKey
        const publicKeyBuffer = Buffer.from(publicKey, 'hex');
        const hash = bitcoin.crypto.hash160(publicKeyBuffer);
        scriptPubKey = bitcoin.script.compile([
          bitcoin.opcodes.OP_0,
          hash
        ]).toString('hex');
        // Generated Segwit scriptPubKey from public key
      } else if (address.startsWith('bc1p') && publicKey) {
        // Taproot (P2TR) - use the public key (x-only format)
        let xOnlyPubKey;
        if (publicKey.length === 66 && publicKey.startsWith('02')) {
          // Convert compressed public key to x-only
          xOnlyPubKey = publicKey.slice(2);
        } else if (publicKey.length === 64) {
          // Already x-only format
          xOnlyPubKey = publicKey;
        } else {
          throw new Error(`Invalid public key format: ${publicKey}`);
        }
        scriptPubKey = bitcoin.script.compile([
          bitcoin.opcodes.OP_1,
          Buffer.from(xOnlyPubKey, 'hex')
        ]).toString('hex');
        // Generated Taproot scriptPubKey from public key
      } else if (address.startsWith('bc1q')) {
        // Fallback: Native Segwit (P2WPKH) without public key
        const decoded = bitcoin.address.fromBech32(address);
        scriptPubKey = bitcoin.script.compile([
          bitcoin.opcodes.OP_0,
          decoded.data
        ]).toString('hex');
        // Generated Segwit scriptPubKey from address
      } else if (address.startsWith('bc1p')) {
        // Fallback: Taproot (P2TR) without public key
        const decoded = bitcoin.address.fromBech32(address);
        scriptPubKey = bitcoin.script.compile([
          bitcoin.opcodes.OP_1,
          decoded.data
        ]).toString('hex');
        // Generated Taproot scriptPubKey from address
      } else {
        console.warn('Unknown address type, cannot generate scriptPubKey');
        scriptPubKey = '';
      }
    } catch (error) {
      console.error('Error generating scriptPubKey:', error);
      scriptPubKey = '';
    }
    
    // Transform UTXOs to the format we need
    const utxos = utxoResponse.map(utxo => ({
      txid: utxo.txid,
      vout: utxo.vout,
      value: utxo.value,
      scriptPubKey: scriptPubKey // Use the generated scriptPubKey for all UTXOs from this address
    }));
    
    // Filter out spent UTXOs and sort by value
    const spendableUtxos = utxos
      .filter(utxo => utxo.value > 0)
      .sort((a, b) => b.value - a.value);
    
    console.log(`Spendable UTXOs: ${spendableUtxos.length}`);
    
    return {
      utxos: utxos,
      spendableUtxos: spendableUtxos
    };
  } catch (error) {
    console.error('Error processing UTXO response:', error);
    throw error;
  }
};

// Get account UTXOs
async function getAccountUTXOs(address, walletPublicKey) {
  console.log(`Fetching account UTXOs for address: ${address}`);
  
  try {
    // Fetch UTXOs from external APIs
    const utxoData = await fetchUTXOs(address, walletPublicKey);
    
    // utxoData already contains the processed UTXOs from processUTXOResponse
    // Calculate summary stats for logging
    const totalBalance = utxoData.spendableUtxos.reduce((sum, utxo) => sum + utxo.value, 0);
    
    // Log UTXO portfolio summary
    debugLog('UTXO Portfolio Summary:');
    debugLog(`- Total Balance: ${totalBalance} sats`);
    debugLog(`- Spendable: ${totalBalance} sats (${utxoData.spendableUtxos.length} UTXOs)`);
    debugLog(`- Ordinals: 0 UTXOs`);
    debugLog(`- Runes/Alkanes: 0 UTXOs`);
    debugLog(`- Pending: 0 sats (0 UTXOs)`);
    
    // If no UTXOs found, create mock UTXOs for testing
    if (utxoData.utxos.length === 0) {
      console.log('No real UTXOs found, using mock UTXOs for testing');
      
      let mockScriptPubKey;
      const addressInfo = getAddressInfo(address);
      
      try {
        // Try to derive a valid scriptPubKey from the address
        mockScriptPubKey = bitcoin.address.toOutputScript(address, bitcoin.networks.bitcoin).toString('hex');
        console.log('Created valid scriptPubKey from address:', mockScriptPubKey);
      } catch (error) {
        console.error('Failed to create scriptPubKey from address:', error.message);
        
        // Fallback to placeholder script for development only
        mockScriptPubKey = `76a914${"a".repeat(40)}88ac`; // P2PKH script placeholder
        console.log('Created fallback P2PKH script:', mockScriptPubKey);
      }
      
      const mockUtxos = [{
        txid: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        vout: 0,
        value: 100000, // 100,000 sats (0.001 BTC)
        scriptPubKey: mockScriptPubKey,
        confirmations: 1
      }];
      
      console.log('Created mock UTXOs:', mockUtxos);
      
      // Return mock UTXOs in the correct format
      const mockUtxoData = {
        utxos: mockUtxos,
        spendableUtxos: mockUtxos
      };
      
      // Log mock UTXO portfolio summary
      debugLog('Mock UTXO Portfolio Summary:');
      debugLog(`- Total Balance: ${mockUtxos[0].value} sats`);
      debugLog(`- Spendable: ${mockUtxos[0].value} sats (${mockUtxos.length} UTXOs)`);
      debugLog(`- Ordinals: 0 UTXOs`);
      debugLog(`- Runes/Alkanes: 0 UTXOs`);
      debugLog(`- Pending: 0 sats (0 UTXOs)`);
      
      return mockUtxoData;
    }
    
    console.log('Processed UTXOs:', utxoData);
    return utxoData;
  } catch (error) {
    console.error('Error fetching account UTXOs:', error);
    throw error;
  }
}

// Format UTXOs for OYL SDK
function formatUtxosForOylSdk(utxos, address) {
  return utxos.map(utxo => ({
    txId: utxo.txid,
    outputIndex: utxo.vout,
    satoshis: utxo.value,
    scriptPk: utxo.scriptPubKey,
    address: address
  }));
}

// Create a custom PSBT (fallback method)
const createCustomPsbt = (utxoAddress, outputAddress, executeData, utxos, feeRate, walletPublicKey, networkParam, feeConfig = null) => {
  try {
    console.log(`Creating custom PSBT:`);
    console.log(`- UTXO address (for inputs): ${utxoAddress}`);
    console.log(`- Output address (for dust): ${outputAddress || utxoAddress}`);
    
    // Calculate fee based on transaction size and fee rate
    const estimatedSize = feeConfig ? 300 : 250; // Larger size if adding fee output
    const feeAmount = Math.max(Math.ceil(estimatedSize * feeRate), 350); // Ensure minimum fee of 350 sats
    
    // Calculate service fee if provided
    const serviceFee = feeConfig ? feeConfig.amount : 0;
    const totalRequired = DUST_AMOUNT + feeAmount + serviceFee;
    
    console.log('Fee calculation:', {
      feeRate,
      estimatedSize,
      feeAmount,
      dustAmount: DUST_AMOUNT,
      serviceFee,
      totalRequired
    });
    
    // Always use MAINNET network configuration
    const network = MAINNET_CONFIG;
    console.log(`Using MAINNET network with bech32 prefix: ${network.bech32} for PSBT creation`);
    
    // Create PSBT instance with the correct network
    const psbt = new bitcoin.Psbt({ network });
    
    // Add inputs from UTXOs - only use what we need
    let totalInputValue = 0;
    const requiredAmount = totalRequired;
    
    // If no UTXOs are provided, create a template PSBT without inputs
    if (!utxos || utxos.length === 0) {
      console.log('No UTXOs provided, creating template PSBT without inputs');
    } else {
      // Sort UTXOs by value (largest first) for efficient selection
      const sortedUtxos = [...utxos].sort((a, b) => b.value - a.value);
      
      console.log(`Need ${requiredAmount} sats (${DUST_AMOUNT} dust + ${feeAmount} fee + ${serviceFee} service fee)`);
      debugLog('Available UTXOs:', sortedUtxos.map(u => `${u.value} sats`));
      
      // Add UTXOs until we have enough to cover dust + fees + service fee
      for (let i = 0; i < sortedUtxos.length && totalInputValue < requiredAmount; i++) {
        const utxo = sortedUtxos[i];
        debugLog(`Adding UTXO ${i+1}: ${utxo.txid.slice(0, 8)}... value: ${utxo.value} sats`);
        
        // Add input with witness UTXO
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: {
            script: Buffer.from(utxo.scriptPubKey, 'hex'),
            value: utxo.value
          }
        });
        
        totalInputValue += utxo.value;
        debugLog(`Total input value now: ${totalInputValue} sats`);
        
        // Stop if we have enough
        if (totalInputValue >= requiredAmount) {
          console.log(`Sufficient inputs selected (${totalInputValue} >= ${requiredAmount})`);
          break;
        }
      }
      
      if (totalInputValue < requiredAmount) {
        throw new Error(`Insufficient UTXOs: need ${requiredAmount} sats but only have ${totalInputValue} sats`);
      }
    }
    
    // Create OP_RETURN data for Alkanes protocol
    const opReturnScript = createAlkanesOpReturn(executeData);
    debugLog('Created OP_RETURN script');
    debugLog('OP_RETURN script hex:', opReturnScript.toString('hex'));
    debugLog('OP_RETURN script length:', opReturnScript.length, 'bytes');
    
    // Protorunes transaction structure:
    // 1. First output: Dust output to recipient (where minted tokens go)
    // 2. Second output: OP_RETURN with Protorunes data
    // 3. Third output: Service fee (if configured)
    // 4. Fourth output: Change output (if needed)
    
    // Output 0: Dust output to recipient (where minted tokens go)
    // Use the output address if provided, otherwise use the UTXO address
    const dustOutputAddress = outputAddress || utxoAddress;
    psbt.addOutput({
      address: dustOutputAddress,
      value: DUST_AMOUNT
    });
    console.log(`Added dust output to address: ${dustOutputAddress}`);
    
    // Output 1: OP_RETURN with Protorunes data
    psbt.addOutput({
      script: opReturnScript,
      value: 0
    });
    console.log('Added OP_RETURN output');
    
    // Output 2: Service fee output (if configured)
    if (feeConfig && feeConfig.amount > 0) {
      psbt.addOutput({
        address: feeConfig.address,
        value: feeConfig.amount
      });
      console.log(`Added service fee output: ${feeConfig.amount} sats to ${feeConfig.address}`);
    }
    
    // Output 3/4: Change output (if needed)
    const change = totalInputValue - DUST_AMOUNT - feeAmount - serviceFee;
    if (totalInputValue > 0 && change > DUST_AMOUNT) {
      console.log('Adding change output:', {
        address: utxoAddress,  // Send change back to the UTXO address (Segwit)
        changeAmount: change,
        calculation: `${totalInputValue} - ${DUST_AMOUNT} - ${feeAmount} - ${serviceFee} = ${change}`
      });
      
      psbt.addOutput({
        address: utxoAddress,  // Change goes back to the source address
        value: change
      });
      console.log('Added change output');
    } else {
      console.log(`No change output needed (change ${change} <= dust ${DUST_AMOUNT})`);
    }
    
    // Convert PSBT to base64
    const psbtBase64 = psbt.toBase64();
    const psbtHex = psbt.toHex();
    
    console.log(`PSBT created successfully, base64 length: ${psbtBase64.length}, hex length: ${psbtHex.length}`);
    console.log(`PSBT preview: ${psbtHex.substring(0, 100)}...`);
    
    // Add detailed debugging information
    const psbtDetails = {
      version: psbt.version,
      network: network.bech32,
      inputs: psbt.data.inputs.map((input, index) => {
        return {
          index,
          hash: input.witnessUtxo ? psbt.txInputs[index].hash.toString('hex') : 'No hash',
          witnessUtxo: input.witnessUtxo ? {
            script: input.witnessUtxo.script.toString('hex'),
            value: input.witnessUtxo.value
          } : 'No witnessUtxo'
        };
      }),
      outputs: psbt.txOutputs.map((output, index) => {
        // Try to convert script to address using the correct network
        let outputAddress = 'No address (OP_RETURN)';
        try {
          if (output.script && !output.script.toString('hex').startsWith('6a')) { // Not OP_RETURN
            outputAddress = bitcoin.address.fromOutputScript(output.script, network);
          }
        } catch (e) {
          console.log(`Could not convert output ${index} script to address:`, e.message);
        }
        
        return {
          index,
          address: outputAddress,
          value: output.value,
          script: output.script ? output.script.toString('hex') : undefined
        };
      })
    };
    
    debugLog('PSBT structure details:', JSON.stringify(psbtDetails, null, 2));
    
    // Return hex format instead of base64 for OYL wallet compatibility
    return psbtHex;
  } catch (error) {
    console.error('Error creating custom PSBT:', error);
    throw new Error(`Failed to create custom PSBT: ${error.message}`);
  }
};

// Create a PSBT for Alkanes execution
const createAlkanesExecutePsbt = async (utxoAddress, outputAddress, executeData, utxos, feeRate, walletPublicKey, feeConfig = null) => {
  try {
    console.log('Creating PSBT for Alkanes execution');
    console.log('UTXO address:', utxoAddress);
    console.log('Output address:', outputAddress);
    console.log('Using public key:', walletPublicKey ? walletPublicKey.slice(0, 10) + '...' : 'none');
    console.log('Fee config:', feeConfig);
    
    // Always use MAINNET network configuration
    const network = MAINNET_CONFIG;
    console.log('Using MAINNET network configuration for PSBT');
    
    // Use custom PSBT implementation
    return createCustomPsbt(utxoAddress, outputAddress, executeData, utxos, feeRate, walletPublicKey, network, feeConfig);
  } catch (error) {
    console.error('Error creating PSBT:', error);
    throw error;
  }
};

// API endpoint for creating alkanes execute PSBT
app.post('/api/alkanes/execute', async (req, res) => {
  console.log('=== ALKANES EXECUTE API CALLED ===');
  
  try {
    const { address, taprootAddress, executeData, feeRate, walletPublicKey, feeConfig } = req.body;
    console.log('Request data:', {
      address,
      taprootAddress,
      executeData,
      feeRate,
      hasWalletPublicKey: !!walletPublicKey,
      feeConfig
    });
    
    // address is the UTXO address (usually Segwit)
    // taprootAddress is for the output (optional, defaults to address)
    const utxoAddress = address;
    const outputAddress = taprootAddress || address;
    
    console.log(`UTXO address (for inputs): ${utxoAddress}`);
    console.log(`Output address (for dust): ${outputAddress}`);
    
    // Validate address
    const addressInfo = getAddressInfo(utxoAddress);
    if (!addressInfo.isValid) {
      return res.status(400).json({ error: 'Invalid address' });
    }
    
    // Get UTXOs for the address
    console.log(`Attempting to fetch UTXOs for address: ${utxoAddress}`);
    
    let utxoData;
    try {
      utxoData = await fetchUTXOs(utxoAddress, walletPublicKey);
      console.log('UTXO fetch result:', {
        totalUtxos: utxoData.utxos?.length || 0,
        spendableUtxos: utxoData.spendableUtxos?.length || 0,
        utxoData: utxoData
      });
      
      if (!utxoData.spendableUtxos || utxoData.spendableUtxos.length === 0) {
        console.log('No UTXOs found, returning error');
        
        // Add detailed debugging information
        console.log('Debug info for empty UTXOs:');
        console.log('- Address:', utxoAddress);
        console.log('- Public key provided:', !!walletPublicKey);
        console.log('- Raw UTXO data:', JSON.stringify(utxoData, null, 2));
        
        return res.status(400).json({ 
          error: 'No UTXOs found for address. Please ensure your wallet has funds on Bitcoin mainnet.',
          address: utxoAddress,
          debug: {
            totalUtxos: utxoData.utxos?.length || 0,
            spendableUtxos: utxoData.spendableUtxos?.length || 0
          }
        });
      }
    } catch (fetchError) {
      console.error('Error fetching UTXOs:', fetchError);
      return res.status(500).json({
        error: 'Failed to fetch UTXOs from all data sources',
        details: fetchError.message,
        address: utxoAddress
      });
    }
    
    // Calculate total available and fees
    const totalAvailable = utxoData.spendableUtxos.reduce((sum, utxo) => sum + utxo.value, 0);
    const estimatedSize = feeConfig ? 300 : 250; // Larger size if adding fee output
    const estimatedFee = Math.max(Math.ceil(estimatedSize * (feeRate || 1)), 350); // Minimum 350 sats
    const serviceFee = feeConfig ? feeConfig.amount : 0;
    const changeAmount = totalAvailable - DUST_AMOUNT - estimatedFee - serviceFee;
    
    console.log('Transaction details:', {
      totalAvailable,
      estimatedFee,
      dustAmount: DUST_AMOUNT,
      serviceFee,
      changeAmount
    });
    
    if (changeAmount < 0) {
      return res.status(400).json({ 
        error: `Insufficient funds. Need ${DUST_AMOUNT + estimatedFee + serviceFee} sats, but only have ${totalAvailable} sats.`,
        totalAvailable,
        required: DUST_AMOUNT + estimatedFee + serviceFee
      });
    }
    
    // Create PSBT using our function
    const psbt = await createAlkanesExecutePsbt(
      utxoAddress,
      outputAddress,
      executeData,
      utxoData.spendableUtxos,
      feeRate || 1,
      walletPublicKey,
      feeConfig
    );
    
    // Return the PSBT and transaction details
    return res.json({
      psbt: psbt,
      address: utxoAddress,
      outputAddress: outputAddress,
      estimatedFee,
      serviceFee,
      totalAvailable,
      changeAmount
    });
  } catch (error) {
    console.error('Error creating Alkanes execute PSBT:', error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
});

// API endpoint for getting UTXOs
app.get('/api/utxos/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({
        error: 'Missing required parameter: address',
        timestamp: new Date().toISOString()
      });
    }
    
    // Fetch UTXOs
    const utxos = await fetchUTXOs(address);
    
    // Return UTXOs
    return res.status(200).json({
      utxos,
      originalAddress: address,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching UTXOs:', error);
    return res.status(500).json({
      error: 'Failed to fetch UTXOs',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API endpoint for getting account balance
app.get('/api/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({
        error: 'Missing required parameter: address',
        timestamp: new Date().toISOString()
      });
    }
    
    // Fetch account UTXOs
    const accountUtxos = await getAccountUTXOs(address);
    
    // Return balance
    return res.status(200).json({
      balance: accountUtxos.spendableTotalBalance,
      pendingBalance: accountUtxos.pendingTotalBalance,
      totalBalance: accountUtxos.totalBalance,
      originalAddress: address,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    return res.status(500).json({
      error: 'Failed to fetch balance',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API endpoint for broadcasting transactions
app.post('/api/broadcast', async (req, res) => {
  try {
    const { signedPsbt, originalAddress } = req.body;
    
    if (!signedPsbt) {
      return res.status(400).json({ error: 'Missing required parameter: signedPsbt' });
    }
    
    console.log('Broadcasting signed PSBT...');
    console.log('PSBT length:', signedPsbt.length);
    console.log('PSBT preview:', signedPsbt.substring(0, 100) + '...');
    
    try {
      // Determine the network to use for extracting the transaction
      let network;
      if (originalAddress) {
        if (originalAddress.startsWith('bc1')) {
          network = bitcoin.networks.bitcoin;
          console.log('Using mainnet network for transaction extraction');
        } else if (originalAddress.startsWith('tb1')) {
          network = TESTNET_CONFIG;
          console.log('Using testnet network for transaction extraction');
        } else {
          // Default to mainnet if we can't determine
          network = MAINNET_CONFIG;
          console.log('Using default mainnet network for transaction extraction');
        }
      } else {
        // Default to MAINNET since that's what we're using
        network = MAINNET_CONFIG;
        console.log('No address provided, using MAINNET network');
      }
      
      // Check if the PSBT is in hex or base64 format
      let psbt;
      let isHex = false;
      
      // Check if it's hex (starts with typical PSBT magic bytes in hex)
      if (signedPsbt.startsWith('70736274ff')) {
        console.log('PSBT appears to be in hex format, converting to base64');
        isHex = true;
        const psbtBuffer = Buffer.from(signedPsbt, 'hex');
        const psbtBase64 = psbtBuffer.toString('base64');
        psbt = bitcoin.Psbt.fromBase64(psbtBase64, { network });
      } else {
        // Assume it's base64
        console.log('PSBT appears to be in base64 format');
        psbt = bitcoin.Psbt.fromBase64(signedPsbt, { network });
      }
      
      console.log('PSBT loaded successfully');
      debugLog('PSBT has', psbt.inputCount, 'inputs and', psbt.txOutputs.length, 'outputs');
      
      // Check if all inputs are finalized
      let allFinalized = true;
      for (let i = 0; i < psbt.inputCount; i++) {
        if (!psbt.data.inputs[i].finalScriptWitness && !psbt.data.inputs[i].finalScriptSig) {
          console.log(`Input ${i} is not finalized`);
          allFinalized = false;
          
          // Try to finalize the input
          try {
            psbt.finalizeInput(i);
            console.log(`Successfully finalized input ${i}`);
          } catch (finalizeError) {
            console.error(`Failed to finalize input ${i}:`, finalizeError.message);
          }
        }
      }
      
      if (!allFinalized) {
        console.log('Not all inputs were finalized, attempting to finalize all...');
        try {
          psbt.finalizeAllInputs();
          console.log('Successfully finalized all inputs');
        } catch (finalizeError) {
          console.error('Failed to finalize all inputs:', finalizeError.message);
          // Continue anyway, maybe some inputs are finalized
        }
      }
      
      // Extract transaction from PSBT
      console.log(`Extracting transaction with network bech32 prefix: ${network.bech32}...`);
      const tx = psbt.extractTransaction();
      const txHex = tx.toHex();
      console.log('Successfully extracted transaction');
      console.log('Transaction ID:', tx.getId());
      console.log('Transaction size:', txHex.length / 2, 'bytes');
      console.log('Extracted transaction hex:', txHex.substring(0, 100) + '...');
      
      // Broadcast the transaction to Mainnet using multiple fallback sources
      console.log('Attempting to broadcast to Bitcoin mainnet...');
      
      const broadcastSources = [
        {
          name: 'Sandshrew',
          url: `${sandshrewApi.baseUrl}/${sandshrewApi.projectId}/esplora_tx`,
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: txHex
        },
        {
          name: 'Blockstream',
          url: 'https://blockstream.info/api/tx',
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: txHex
        },
        {
          name: 'Mempool.space',
          url: 'https://mempool.space/api/tx',
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: txHex
        }
      ];
      
      let txid;
      let lastError = null;
      
      for (const source of broadcastSources) {
        try {
          console.log(`Broadcasting via ${source.name}: ${source.url}`);
          
          const broadcastResponse = await fetch(source.url, {
            method: source.method,
            headers: source.headers,
            body: source.body,
            timeout: 15000 // 15 second timeout
          });
          
          if (!broadcastResponse.ok) {
            throw new Error(`${source.name} broadcast error: ${broadcastResponse.status} ${broadcastResponse.statusText}`);
          }
          
          txid = await broadcastResponse.text();
          console.log(`Transaction broadcast successful via ${source.name}:`, txid);
          break; // Success, exit loop
          
        } catch (broadcastError) {
          console.error(`${source.name} broadcast failed:`, broadcastError.message);
          lastError = broadcastError;
          continue; // Try next source
        }
      }
      
      if (!txid) {
        console.error('All broadcast sources failed');
        
        // For development, return a mock txid
        if (process.env.NODE_ENV === 'development') {
          console.log('Development mode: Returning mock txid');
          txid = 'mock_' + Math.random().toString(36).substring(2, 15);
        } else {
          throw new Error(`Failed to broadcast transaction: ${lastError?.message || 'All sources failed'}`);
        }
      }
      
      return res.json({ txid });
    } catch (error) {
      console.error('Error broadcasting transaction:', error);
      console.error('Error stack:', error.stack);
      return res.status(500).json({ error: `Failed to broadcast transaction: ${error.message}` });
    }
  } catch (error) {
    console.error('Error in broadcast endpoint:', error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
});

// Address validation for mainnet (no conversion needed)
const validateMainnetAddress = (address) => {
  try {
    // Check if it's a valid mainnet address
    if (address.startsWith('bc1')) {
      bitcoin.address.fromBech32(address);
      console.log(`Valid mainnet address: ${address}`);
      return address;
    }
    
    // If we get here, it's an unsupported address format
    console.warn(`Address ${address} is not a mainnet address`);
    return address;
  } catch (error) {
    console.error('Error validating address:', error);
    return address;
  }
};

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
