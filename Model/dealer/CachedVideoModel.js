import { DataTypes } from "sequelize";
import { sequelize } from "../../DBConnection/mysqlconnetion.js";

// Har dealer ka ek baar generate hua personalized video yahan store hoga
const CachedVideo = sequelize.define(
  "CachedVideo",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    dealer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,             // ek dealer ka ek hi cached video
    },
    dealer_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    video_path: {
      type: DataTypes.STRING,
      allowNull: false,         // /uploads/processed/dealer_123_gurgaon.mp4
    },
    status: {
      type: DataTypes.ENUM("processing", "ready", "failed"),
      defaultValue: "processing",
    },
  },
  {
    tableName: "cached_videos",
    timestamps: true,
  }
);

export default CachedVideo;
