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
    state: {
      type: DataTypes.STRING,   // state name — e.g. "Gurgaon", "Mumbai"
      allowNull: false,
      unique: true,
    },
    video_path: {
      type: DataTypes.STRING,
      allowNull: true,          // base video path — /uploads/videos/gurgaon.mp4
    },
    name_timestamp: {
      type: DataTypes.FLOAT,
      allowNull: true,          // second pe naam aata hai — e.g. 8.5
    },
    elevenlabs_voice_id: {
      type: DataTypes.STRING,
      allowNull: true,          // ElevenLabs cloned voice ID for this region head
    },
    name_prefix: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",         // e.g. "" ya "Shri" ya "Dear"
    },
    name_suffix: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: " ji",      // e.g. " ji" ya " bhai"
    },
  },
  {
    tableName: "message",
    timestamps: true,
  }
);

export default MessageModel;
