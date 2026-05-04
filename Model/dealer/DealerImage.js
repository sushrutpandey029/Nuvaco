import { DataTypes } from "sequelize";
import { sequelize } from "../../DBConnection/mysqlconnetion.js";
import Dealer from "../dealerModel.js";

const DealerImage = sequelize.define(
  "DealerImage",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    dealer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Dealer,
        key: "id",
      },
    },

    language: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    image: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "dealer_images",
    timestamps: true,
  },
);

// Relations
Dealer.hasMany(DealerImage, {
  foreignKey: "dealer_id",
});

DealerImage.belongsTo(Dealer, {
  foreignKey: "dealer_id",
});

export default DealerImage;
