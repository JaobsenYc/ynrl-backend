const Koa = require("koa");
const Router = require("koa-router");
const logger = require("koa-logger");
const bodyParser = require("koa-bodyparser");
const fs = require("fs");
const path = require("path");
const { init: initDB, Communities , Users, Households} = require("./db");

const router = new Router();

const homePage = fs.readFileSync(path.join(__dirname, "index.html"), "utf-8");

async function bootstrap() {
  await sequelize.sync({ alter: true });
  app.listen(port, () => {
    console.log("启动成功", port);
  });
}
// 首页
router.get("/", async (ctx) => {
  ctx.body = homePage;
});

router.get("/api/communities", async (ctx) => {
  if (!Communities) {
    ctx.throw(503, "Database is not ready, please try again later");
  }
  const communitiesResult = await Communities.findAll();
  ctx.body = communitiesResult.map(community => ({ id: community.id, text: community.text }))
  ;
});
// // 根据community获取buildings
router.get("/api/communities/:communityId/buildings", async (ctx) => {
  if (!Users) {
    ctx.throw(503, "Database is not ready, please try again later");
  }
  const usersResult = await Users.findAll({
    where: { communityId: ctx.params.communityId },
    attributes: ['buildingId'], // only select the 'buildingId' field
    group: 'buildingId' // group by 'buildingId' to remove duplicates
  });
  ctx.body = usersResult.map(user => user.buildingId);
});

// // 根据buildings获取units

router.get("/api/communities/:communityId/buildings/:buildingId/units", async (ctx) => {
  if (!Users) {
    ctx.throw(503, "Database is not ready, please try again later");
  }
  const usersResult = await Users.findAll({
    where: { 
      communityId: ctx.params.communityId,
      buildingId: ctx.params.buildingId 
    },
    attributes: ['unitId'], // only select the 'unitId' field
    group: 'unitId' // group by 'unitId' to remove duplicates
  });
  ctx.body = usersResult.map(user => user.unitId );
});

// Get all floors by unit ID

router.get("/api/communities/:communityId/buildings/:buildingId/units/:unitId/floors", async (ctx) => {
  if (!Users) {
    ctx.throw(503, "Database is not ready, please try again later");
  }
  const usersResult = await Users.findAll({
    where: { 
      communityId: ctx.params.communityId,
      buildingId: ctx.params.buildingId,
      unitId: ctx.params.unitId 
    },
    attributes: ['floorId'], // only select the 'floorId' field
    group: 'floorId' // group by 'floorId' to remove duplicates
  });
  ctx.body = usersResult.map(user => user.floorId );
});


router.get("/api/communities/:communityId/buildings/:buildingId/units/:unitId/floors/:floorId/rooms", async (ctx) => {
  if (!Users) {
    ctx.throw(503, "Database is not ready, please try again later");
  }
  const usersResult = await Users.findAll({
    where: { 
      communityId: ctx.params.communityId,
      buildingId: ctx.params.buildingId,
      unitId: ctx.params.unitId,
      floorId: ctx.params.floorId
    },
    attributes: ['roomId'], 
    group: 'roomId'
  });
  ctx.body = usersResult.map(user => user.roomId );
});

// Get all users by room ID
router.get("/api/communities/:communityId/buildings/:buildingId/units/:unitId/floors/:floorId/rooms/:roomId/users", async (ctx) => {
  if (!Users) {
    ctx.throw(503, "Database is not ready, please try again later");
  }
  const usersResult = await Users.findOne({
    where: { 
      communityId: ctx.params.communityId,
      buildingId: ctx.params.buildingId,
      unitId: ctx.params.unitId,
      floorId: ctx.params.floorId,
      roomId: ctx.params.roomId 
    }
  });
    // 定义一个函数来隐藏部分姓名
    function hidePartOfName(name) {
      const length = name.length;
      if (length <= 1) {
        return "*";
      } else if (length === 2) {
        return name.substring(0, 1) + "*";
      } else {
        let newName = name.substring(0, 1);
        for (let i = 1; i < length - 1; i++) {
          newName += "*";
        }
        newName += name.substring(length - 1, length);
        return newName;
      }
    }
  
    // 检查是否找到了用户，然后对姓名进行部分隐藏
    if (usersResult && usersResult.contact) {
      usersResult.contact = hidePartOfName(usersResult.contact);
      usersResult.phone_number = hidePartOfName(usersResult.phone_number);
    }
  ctx.body = usersResult;
});


router.get("/api/users/:userId/details", async (ctx) => {
  if (!Users) {
    ctx.throw(503, "Database is not ready, please try again later");
  }
  const userResult = await Users.findOne({
    where: { userId: ctx.params.userId }
  });
  
  if (!userResult) {
    ctx.throw(404, "User not found");
  }
  
  ctx.body = userResult;
});


//创建保存的tag
// 创建保存的tag
router.post("/api/users/households", async (ctx) => {
  try {
    const { householdId, tag } = ctx.request.body;
    const openId = ctx.headers['x-wx-openid'];

    if (!openId || !householdId) {
      ctx.throw(503, "OpenId或HouseholdId不能为空");
    }

    // 如果没有提供tag，则设置为默认值
    let householdTag = tag || "我家";

    // 检查household是否已存在
    const [household, created] = await Households.findOrCreate({
      where: { openId, householdId },
      defaults: { tag: householdTag }
    });

    // 如果household存在但tag不同，则进行更新
    if (!created && household.tag !== householdTag) {
      household.tag = householdTag;
      await household.save();
    }

    ctx.status = created ? 201 : 200;
    ctx.body = household;
  } catch (err) {
    ctx.throw(err.status || 500, err.message || "发生了错误");
  }
});

// 删除保存的tag
router.delete("/api/users/households", async (ctx) => {
  try {
    const { householdId } = ctx.request.body;
    const openId = ctx.headers['x-wx-openid'];

    if (!openId || !householdId) {
      ctx.throw(503, "OpenId或HouseholdId不能为空");
    }

    // 在数据库中查找并删除对应的household
    const deletedCount = await Households.destroy({
      where: { openId, householdId }
    });

    if (deletedCount === 0) {
      ctx.throw(404, "找不到要删除的household");
    }

    ctx.status = 200;
    ctx.body = { message: "成功删除household" };
  } catch (err) {
    ctx.throw(err.status || 500, err.message || "发生了错误");
  }
});



// 小程序调用，获取微信 Open ID
router.get("/api/wx_openid", async (ctx) => {
  if (ctx.request.headers[" "]) {
    ctx.body = ctx.request.headers["x-wx-openid"];
  }
});

const app = new Koa();
app
  .use(logger())
  .use(bodyParser())
  .use(router.routes())
  .use(router.allowedMethods());

const port = process.env.PORT || 80;
async function bootstrap() {
  await initDB();
  app.listen(port, () => {
    console.log("启动成功", port);
  });
}
bootstrap();
