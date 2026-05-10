import { ethers } from 'ethers';
import axios from 'axios';

// abi estratta da remix dopo la compilazione. ho tenuto solo le firme che mi servono per il poc
const CONTRACT_ABI = [
  "function createOrder(address _customer, string _item, string _color, string _size) public returns (uint256)",
  "function updateStatus(uint256 _orderId, uint8 _newStatus, string _ipfsCid) public",
  "function getOrder(uint256 _orderId) public view returns (tuple(uint256 id, address customer, string item, string color, string size, uint8 status, string ipfsCid, uint256 timestamp))",
  "function orderCount() public view returns (uint256)",
  "event StatusUpdated(uint256 indexed orderId, uint8 newStatus, string ipfsCid)",
  "event OrderCreated(uint256 indexed orderId, address indexed customer)"
];

// address del contratto deployato su sepolia testnet
const CONTRACT_ADDRESS = "0x1C2b296F394278a885cb3caa797e6FAf787C5445" as string; 

export const connectWallet = async () => {
  if (typeof window.ethereum !== 'undefined') {
    try {
      // uso ethers v6 con il browser provider per agganciarmi a metamask
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      return { provider, account: accounts[0] };
    } catch (error) {
      console.error("Errore connessione wallet:", error);
      return null;
    }
  }
  return null;
};

export const uploadToIPFS = async (file: File) => {
  try {
    const reader = new FileReader();
    const fileBase64Promise = new Promise((resolve) => {
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    
    const fileData = await fileBase64Promise;

    // passo l'immagine al backend locale per non esporre le api key di pinata sul frontend
    const res = await axios.post("/api/ipfs/upload", {
      fileData,
      fileName: file.name
    });
    
    return res.data.IpfsHash;
  } catch (error) {
    console.error("Errore caricamento IPFS via Backend:", error);
    return null;
  }
};

export const createBlockchainOrder = async (customer: string, item: string, color: string, size: string) => {
  const wallet = await connectWallet();
  if (!wallet) return null;

  const signer = await wallet.provider.getSigner();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

  // trick per il db locale: se 'customer' è un uid (es. user-123), uso l'address del wallet connesso come fallback on-chain
  const customerAddress = ethers.isAddress(customer) ? customer : await signer.getAddress();

  try {
    // eseguo la transazione reale
    const tx = await contract.createOrder(customerAddress, item, color, size);
    const receipt = await tx.wait();
    
    let orderId = null;
    
    // estraggo l'id dell'ordine parsando i log dell'evento emesso dallo smart contract
    for (const log of receipt.logs) {
      try {
        const parsedLog = contract.interface.parseLog(log);
        if (parsedLog && parsedLog.name === 'OrderCreated') {
          orderId = Number(parsedLog.args[0]);
          break;
        }
      } catch (e) {
        // ignoro log che non appartengono a questo contratto
      }
    }

    // fallback estremo: leggo l'orderCount globale se l'evento non viene letto bene
    if (orderId === null) {
      try {
        const count = await contract.orderCount();
        orderId = Number(count) - 1;
      } catch (e) {
        console.error("Impossibile recuperare orderCount", e);
        throw new Error("Impossibile recuperare l'ID dell'ordine dallo Smart Contract.");
      }
    }

    return { txHash: receipt.hash, orderId };
  } catch (error) {
    console.error("Errore creazione ordine blockchain:", error);
    return null;
  }
};

export const updateBlockchainStatus = async (orderId: number, status: number, ipfsCid: string) => {
  const wallet = await connectWallet();
  if (!wallet) return null;

  const signer = await wallet.provider.getSigner();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

  try {
    // chiamata riservata all'admin per avanzare lo stato della macchina a stati e storare il cid
    const tx = await contract.updateStatus(orderId, status, ipfsCid);
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (error) {
    console.error("Errore aggiornamento blockchain:", error);
    return null;
  }
};