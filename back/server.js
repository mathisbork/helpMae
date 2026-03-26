require("dotenv").config();
const bcrypt = require("bcrypt");
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

  const createUsers = `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL
    )`;
  db.query(createUsers);

  const createDessins = `CREATE TABLE IF NOT EXISTS dessins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255), category VARCHAR(255), typeDessin VARCHAR(255), taille VARCHAR(100),
        prix DECIMAL(10,2), description TEXT, image LONGTEXT, stock INT
    )`;
  db.query(createDessins);

  const createCommandes = `CREATE TABLE IF NOT EXISTS commandes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(255), email VARCHAR(255), adresse TEXT, date DATETIME
    )`;
  db.query(createCommandes);

  const createCommandeItems = `CREATE TABLE IF NOT EXISTS commande_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        commande_id INT, nom_dessin VARCHAR(255), quantite INT
    )`;
  db.query(createCommandeItems);

  db.query("SELECT * FROM users", async (err, results) => {
    if (err) return console.error("Erreur vérification users :", err);
    if (results.length === 0) {
      try {
        const hashedPassword = await bcrypt.hash("admin123", 10);
        db.query(
          "INSERT INTO users (username, password) VALUES (?, ?)",
          ["admin", hashedPassword],
          (insertErr) => {
            if (!insertErr)
              console.log("✅ Compte admin par défaut créé (admin / admin123)");
          },
        );
      } catch (e) {
        console.error("Erreur de hachage :", e);
      }
    }
  });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      if (results.length > 0) {
        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) res.json({ success: true });
        else res.json({ success: false, message: "Mot de passe incorrect" });
      } else {
        res.json({ success: false, message: "Utilisateur introuvable" });
      }
    },
  );
});

app.get("/api/dessins", (req, res) => {
  db.query("SELECT * FROM dessins", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post("/api/dessins", (req, res) => {
  const d = req.body;
  const sql = `INSERT INTO dessins (name, category, typeDessin, taille, prix, description, image, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
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

  db.query(
    `INSERT INTO commandes (nom, email, adresse, date) VALUES (?, ?, ?, ?)`,
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
        db.query(sqlItems, [itemsData], () => {});
      }
      res.json({ message: "Commande validée", commandeId });
    },
  );
});

app.get("/api/commandes", (req, res) => {
  const sql = `
    SELECT c.*, GROUP_CONCAT(CONCAT(ci.nom_dessin, ' (x', ci.quantite, ')') SEPARATOR ', ') AS dessins
    FROM commandes c
    LEFT JOIN commande_items ci ON c.id = ci.commande_id
    GROUP BY c.id
    ORDER BY c.id DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post("/api/commandes/:id/valider", (req, res) => {
  const commandeId = req.params.id;

  db.query("SELECT * FROM commande_items WHERE commande_id = ?", [commandeId], (err, items) => {
    if (err) return res.status(500).json({ error: err.message });

    items.forEach(item => {
      db.query("UPDATE dessins SET stock = stock - ? WHERE name = ?", [item.quantite, item.nom_dessin], (err) => {
        db.query("DELETE FROM dessins WHERE stock <= 0");
      });
    });

    db.query("DELETE FROM commandes WHERE id = ?", [commandeId]);
    db.query("DELETE FROM commande_items WHERE commande_id = ?", [commandeId]);

    res.json({ success: true });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur Galerie démarré sur http://localhost:${PORT}`);
});
