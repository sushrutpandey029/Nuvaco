import { DataTypes } from "sequelize";
import { sequelize } from "../../DBConnection/mysqlconnetion.js";

const DealerOTP = sequelize.define(
  "DealerOTP",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    contact: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    otp: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: "dealer_otps",
    timestamps: true,
  },
);

export default DealerOTP;
