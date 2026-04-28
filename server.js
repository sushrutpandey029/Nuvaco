import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import hbs from "hbs";

import { Db_connection, sequelize } from "./DBConnection/mysqlconnetion.js";
import adminrouter from "./Route/adminRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "view"));
hbs.registerPartials(path.join(__dirname, "view", "admin", "partials"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

app.use("/admin", adminrouter);

const startServer = async () => {
  try {
    await Db_connection();

    await sequelize.sync();

    app.listen(PORT, () => {
      console.log(`Server running: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Server not started due to DB error");
    process.exit(1);
  }
};

startServer();
