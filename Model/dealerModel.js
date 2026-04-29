// models/dealer.js
import { DataTypes } from "sequelize";
import { sequelize } from "../DBConnection/mysqlconnetion.js";

const Dealer = sequelize.define(
  "Dealer",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    fullname: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    contact: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    region: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "dealers",
    timestamps: true,
  },
);

export default Dealer;
