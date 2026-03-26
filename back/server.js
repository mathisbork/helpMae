require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("Erreur de connexion à MySQL :", err.message);
    return;
  }
  console.log(
    `Connecté avec succès à la base de données '${process.env.DB_NAME}' !`,
  );

  const createDessins = `CREATE TABLE IF NOT EXISTS dessins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255), category VARCHAR(255), typeDessin VARCHAR(255), taille VARCHAR(100),
        prix DECIMAL(10,2), description TEXT, image LONGTEXT, stock INT
    )`;

  const createCommandes = `CREATE TABLE IF NOT EXISTS commandes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(255), email VARCHAR(255), adresse TEXT, date DATETIME
    )`;

  const createCommandeItems = `CREATE TABLE IF NOT EXISTS commande_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        commande_id INT, nom_dessin VARCHAR(255), quantite INT
    )`;

  db.query(createDessins);
  db.query(createCommandes);
  db.query(createCommandeItems);
});


app.get("/api/dessins", (req, res) => {
  db.query("SELECT * FROM dessins", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post("/api/dessins", (req, res) => {
  const d = req.body;
  const sql = `INSERT INTO dessins (name, category, typeDessin, taille, prix, description, image, stock) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(
    sql,
    [
      d.name,
      d.category,
      d.typeDessin,
      d.taille,
      d.prix,
      d.description,
      d.image,
      d.stock,
    ],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: result.insertId });
    },
  );
});


app.post("/api/commandes", (req, res) => {
  const { client, panier } = req.body;

  const date = new Date().toISOString().slice(0, 19).replace("T", " ");

  const sqlCommande = `INSERT INTO commandes (nom, email, adresse, date) VALUES (?, ?, ?, ?)`;

  db.query(
    sqlCommande,
    [client.nom, client.email, client.adresse, date],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      const commandeId = result.insertId;

      if (panier && panier.length > 0) {
        const sqlItems = `INSERT INTO commande_items (commande_id, nom_dessin, quantite) VALUES ?`;
        const itemsData = panier.map((item) => [
          commandeId,
          item.name,
          item.qty,
        ]);

        db.query(sqlItems, [itemsData], (err) => {
          if (err) console.error("Erreur ajout items:", err);
        });
      }

      res.json({ message: "Commande validée", commandeId });
    },
  );
});

app.get("/api/commandes", (req, res) => {
  db.query("SELECT * FROM commandes ORDER BY id DESC", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur Galerie démarré sur http://localhost:${PORT}`);
});
