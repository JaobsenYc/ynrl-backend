const Koa = require("koa");
const Router = require("koa-router");
const logger = require("koa-logger");
const bodyParser = require("koa-bodyparser");
const fs = require("fs");
const path = require("path");
const { init: initDB, Communities , Users} = require("./db");

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


// // 更新计数
// router.post("/api/count", async (ctx) => {
//   const { request } = ctx;
//   const { action } = request.body;
//   if (action === "inc") {
//     await Communities.create();
//   } else if (action === "clear") {
//     await Communities.destroy({
//       truncate: true,
//     });
//   }

//   ctx.body = {
//     code: 0,
//     data: await Communities.count(),
//   };
// });

// // 获取计数
// router.get("/api/count", async (ctx) => {
//   const result = await Communities.count();

//   ctx.body = {
//     code: 0,
//     data: result,
//   };
// });

// 小程序调用，获取微信 Open ID
router.get("/api/wx_openid", async (ctx) => {
  if (ctx.request.headers["x-wx-source"]) {
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
