import express from "express";
import path from "path";
import cors from "cors";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from "axios";
import FormData from "form-data";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  
  // alzo il limite a 50mb per le foto pesanti caricate dall'admin
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // array temporanei che fanno da db per il poc
  let users: any[] = [];
  let orders: any[] = [];

  // api routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "ZERO.STOCK Backend (Local Mode) is running" });
  });

  app.get("/api/user/:uid", (req, res) => {
    const user = users.find(u => u.uid === req.params.uid);
    if (user) res.json(user);
    else res.status(404).json({ error: "Utente non trovato" });
  });

  app.post("/api/user/profile", (req, res) => {
    const index = users.findIndex(u => u.uid === req.body.uid);
    if (index !== -1) {
      // se l'utente esiste già aggiorno i dati
      users[index] = { ...users[index], ...req.body };
      res.json({ success: true, user: users[index] });
    } else {
      // altrimenti lo creo
      users.push(req.body);
      res.json({ success: true, user: req.body });
    }
  });

  app.get("/api/orders", (req, res) => {
    res.json(orders);
  });

  // vera integrazione pinata per la tesi!
  app.post("/api/ipfs/upload", async (req, res) => {
    try {
      const { fileData, fileName } = req.body;
      console.log("Richiesta upload IPFS ricevuta per:", fileName);

      // 1. estraggo il buffer dall'immagine in base64 mandata dal frontend
      const base64Data = fileData.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');

      // 2. preparo il form-data per le api di pinata
      const formData = new FormData();
      formData.append('file', buffer, { filename: fileName || 'proof.jpg' });

      // 3. chiamo le api usando le chiavi nel file .env
      const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
        headers: {
          ...formData.getHeaders(),
          pinata_api_key: process.env.PINATA_API_KEY,
          pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
        }
      });

      console.log("Upload IPFS completato con successo! CID:", response.data.IpfsHash);
      
      // restituisco il vero hash calcolato dalla rete
      res.json({ IpfsHash: response.data.IpfsHash });
    } catch (error: any) {
      console.error("Errore durante l'upload su Pinata:", error?.response?.data || error.message);
      res.status(500).json({ error: "Errore durante l'upload su IPFS" });
    }
  });

  app.post("/api/orders/update", (req, res) => {
    const { id, status, ipfsCid, customerUid, item, color, size } = req.body;
    const index = orders.findIndex(o => o.id === id);
    
    if (index !== -1) {
      // aggiornamento dello stato
      orders[index].status = status;
      if (ipfsCid) orders[index].ipfsCid = ipfsCid;
      orders[index].timestamp = Date.now();
      res.json({ success: true, order: orders[index] });
    } else {
      // creazione di un nuovo ordine dal configuratore
      const newOrder = {
        id,
        customerUid,
        item,
        color,
        size,
        status: status || 0,
        timestamp: Date.now(),
        ipfsCid: ipfsCid || null
      };
      orders.push(newOrder);
      res.json({ success: true, order: newOrder });
    }
  });

  // setup vite per il frontend
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    app.use(vite.middlewares);

    // gestisce tutte le route e serve index.html in dev
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    // serve i file ottimizzati in prod
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();