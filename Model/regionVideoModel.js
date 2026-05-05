// models/regionVideo.js
import { DataTypes } from "sequelize";
import { sequelize } from "../DBConnection/mysqlconnetion.js";

const RegionVideo = sequelize.define(
  "RegionVideo",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    state: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    video: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "region_videos",
    timestamps: true,
  }
);

export default RegionVideo;