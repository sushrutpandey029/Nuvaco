import { DataTypes } from "sequelize";
import { sequelize } from "../../DBConnection/mysqlconnetion.js";

const MessageModel = sequelize.define(
  "Message",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    region: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    image: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "message",
    timestamps: true,
  },
);

export default MessageModel;
