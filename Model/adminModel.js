import { DataTypes } from "sequelize";
import { sequelize } from "../DBConnection/mysqlconnetion.js";

const AdminModel = sequelize.define('nuvaco_admin', {
  fullname: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phonenumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  accessToken: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null
  },
}, {
  tableName: 'nuvaco_admins',
  timestamps: true,
});

export default AdminModel;