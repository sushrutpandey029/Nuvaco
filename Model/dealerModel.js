// import { DataTypes } from "sequelize";
// import { sequelize } from "../DBConnection/mysqlconnetion.js";

// const Dealer = sequelize.define(
//   "Dealer",
//   {
//     id: {
//       type: DataTypes.INTEGER,
//       autoIncrement: true,
//       primaryKey: true,
//     },
//     state: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },

//     dealer_code: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       unique: true,
//     },

//     shop_name: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },

//     dealer_person: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },

//     district: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },

//     address: {
//       type: DataTypes.TEXT,
//       allowNull: false,
//     },

//     pincode: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },

//     dealer_mobile_number: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     isImageUploaded: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       defaultValue: "no",
//     },
//   },
//   {
//     tableName: "dealers",
//     timestamps: true,
//   },
// );

// export default Dealer;

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

    state: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    dealer_code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    shop_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    dealer_person: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    district: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    pincode: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    dealer_mobile_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    club_millennium: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isImageUploaded: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "no",
    },
  },
  {
    tableName: "dealers",
    timestamps: true,
  },
);

export default Dealer;
