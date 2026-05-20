
import { DataTypes } from "sequelize";
import { sequelize } from "../DBConnection/mysqlconnetion.js";
import Dealer from "./dealerModel.js";

const TradeMarketingSpoc = sequelize.define(
  "TradeMarketingSpoc",
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
    tableName: "trade_marketing_spocs",
    timestamps: true,
  }
);

// Relations
Dealer.hasMany(TradeMarketingSpoc, {
  foreignKey: "dealer_id",
});

TradeMarketingSpoc.belongsTo(Dealer, {
  foreignKey: "dealer_id",
});

export default TradeMarketingSpoc;