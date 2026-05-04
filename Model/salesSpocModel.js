import { DataTypes } from "sequelize";
import { sequelize } from "../DBConnection/mysqlconnetion.js";
import Dealer from "./dealerModel.js";

const SalesSpoc = sequelize.define(
  "SalesSpoc",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    dealer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    contact_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "sales_spocs",
    timestamps: true,
  }
);

// Relations
Dealer.hasMany(SalesSpoc, {
  foreignKey: "dealer_id",
});

SalesSpoc.belongsTo(Dealer, {
  foreignKey: "dealer_id",
});

export default SalesSpoc;