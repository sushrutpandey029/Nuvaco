import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import hbs from "hbs";
import session from "express-session";
import { createRequire } from "module";
import flash from "express-flash";
const require = createRequire(import.meta.url);
const MySQLStore = require("express-mysql-session")(session);

import { Db_connection, sequelize } from "./DBConnection/mysqlconnetion.js";
import adminrouter from "./Route/adminRoutes.js";
import dealerrouter from "./Route/dealerRoutes.js";

dotenv.config();
  
const app = express();
const PORT = process.env.PORT || 5050;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "view"));
hbs.registerPartials(path.join(__dirname, "view", "admin", "partials"));
hbs.registerPartials(path.join(__dirname, "view", "dealer", "dealerpartials"));

hbs.registerHelper("subtract", (a, b) => a - b);
hbs.registerHelper("add", (...args) =>
  args.slice(0, -1).reduce((s, n) => s + n, 0),
);
hbs.registerHelper("times", function (n, block) {
  let result = "";
  for (let i = 0; i < n; i++) result += block.fn({ "@index": i });
  return result;
});
hbs.registerHelper("eq", (a, b) => a === b);
hbs.registerHelper("gt", (a, b) => a > b);
hbs.registerHelper("inc", function (value) {
  return value + 1;
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static("uploads"));

// Session Store
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

app.use(
  session({
    key: "admin_session",
    secret: process.env.SESSION_SECRET || "defaultsecret",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);
app.use(flash());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.dealer = req.session.dealer || null;
  next();
});

app.use("/admin", adminrouter);
app.use("/", dealerrouter);

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
