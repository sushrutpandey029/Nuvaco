import { DataTypes } from "sequelize";
import { sequelize } from "../../DBConnection/mysqlconnetion.js";
import Dealer from "../dealerModel.js";
import DealerImage from "./DealerImage.js";

const DealerFinalImage = sequelize.define(
  "DealerFinalImage",
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
    image_id : {
        type:DataTypes.INTEGER,
        allowNull:false,
        references:{
            model:DealerImage,
            key:"id"
        }
    }
  },
  {
    tableName: "dealer_final_image",
    timestamps: true,
  },
);

// Relations
// Dealer.hasMany(DealerImage, {
//   foreignKey: "dealer_id",
// });

// DealerImage.belongsTo(Dealer, {
//   foreignKey: "dealer_id",
// });

export default DealerFinalImage;
