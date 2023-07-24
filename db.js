  const { Sequelize, DataTypes } = require("sequelize");

  // 从环境变量中读取数据库配置
  const { MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_ADDRESS = "" } = process.env;

  const [host, port] = MYSQL_ADDRESS.split(":");

  const sequelize = new Sequelize("ynrl", MYSQL_USERNAME, MYSQL_PASSWORD, {
    host,
    port,
    dialect: "mysql" /* one of 'mysql' | 'mariadb' | 'postgres' | 'mssql' */,
  });

  // Define communities model
  const Communities = sequelize.define("communities", {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      primaryKey: true,
    },
    text: {
      type: DataTypes.STRING,
      allowNull: false,
    },},{
    timestamps: false, // 禁用 Sequelize 的自动添加 timestamp 的行为
  });

  const Users = sequelize.define("user", {
    userId: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
    },
    ResidentCode: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    TotalArrears: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    CurrentYearArrears: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    HistoricalArrears: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    InstallationStatus: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    HeatingStatus: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    ChargeableArea: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    UserType: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    contact: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    phone_number: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    address: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    community: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    buildingId: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    unitId: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    floorId: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    roomId: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    commercial_name: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    communityId: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
  }, {
    tableName: 'user',
    timestamps: false,  // Assuming your table doesn't have 'createdAt' or 'updatedAt' columns.
  });

  Communities.hasMany(Users, { as: 'Users', foreignKey: 'communityId', sourceKey: 'id' });
  Users.belongsTo(Communities, { as: 'Community', foreignKey: 'communityId', targetKey: 'id' });
  async function migrateCommunityId() {
    // 获取所有 communities
    const communities = await Communities.findAll();
  
    // 创建一个从 community text 映射到 id 的对象
    const communityMap = communities.reduce((map, community) => {
      map[community.text] = community.id;
      return map;
    }, {});
  
    // 获取所有 users
    const users = await Users.findAll();
  
    // 对每个 user，根据其 community 文本设置 communityId
    for (const user of users) {
      user.communityId = communityMap[user.community];
      await user.save();
    }
  }
  
  migrateCommunityId().catch(console.error);
  
  // 数据库初始化方法
  async function init() {
    try {
      await Communities.sync({ alter: true });
      await Users.sync({ alter: true });
      migrateCommunityId();
    } catch (error) {
      console.error('Failed to synchronize the model with the database', error);
    }
  }

  // 导出初始化方法和模型
  module.exports = {
    init,
    Communities,
    Users
  };
