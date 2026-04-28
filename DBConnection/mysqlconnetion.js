import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    port: Number(process.env.DB_PORT),
    logging: false,
  },
);

const Db_connection = async () => {
  try {
    await sequelize.authenticate();
    console.log("DB connected successfully");
  } catch (err) {
    console.error("DB connection error", err);
  }
};

export { sequelize, Db_connection };
