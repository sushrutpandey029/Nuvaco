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
      validate: {
        len: [10, 15], // basic phone validation
      },
    },

    region: {
      type: DataTypes.ENUM("North", "South", "East", "West"),
      allowNull: false,
    },

    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    shop_image: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "dealers",
    timestamps: true,
  }
);

export default Dealer;