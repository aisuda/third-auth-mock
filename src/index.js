const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const FileStore = require("session-file-store")(session);
const app = express();
const uuid = require("uuid");

const identityKey = "thirdauth";
app.use(
  session({
    name: identityKey,
    secret: "thirdauth",
    store: new FileStore(),
    saveUninitialized: false,
    resave: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

// 首页
app.get("/", (req, res) => {
  res.send(`
  <html>
    <head></head>
    <body>
      <div>
      这是爱速搭第三方登录示例，请在爱速搭中配置如下环境变量来测试。

      ${
        req.session.user
          ? `
      <p>当前登录用户为：${req.session.user.user}，<a href="/logout">点此退出</a></p>`
          : ""
      }

      <pre>
      # 启动第三方登录，里面有 third 即可。
      AUTH_ENABLED_LIST=third
    
      # 第三方登录地址
      ISUDA_THIRD_AUTH_AUTHORIZE_URL=http://${req.header(
        "host"
      )}/login?service={{callback}}
      
      # 获取用户信息地址
      ISUDA_THIRD_AUTH_PROFILE_URL=http://${req.header(
        "host"
      )}/profile?ticket={{code}}
      
      # 可选，用来配置通过什么参数去获取用户信息
      ISUDA_THIRD_AUTH_CODE_FIELD=ticket
      
      # 第三方登出地址
      ISUDA_THIRD_AUTH_LOGOUT_URL=http://${req.header("host")}/logout
      </pre>
      </div>
    </body>
  </html>
  `);
});

// 用来存储授权信息，目前为了简单直接存内存中，所以这个 mock 程序是不可以多实例的。
// 正常请存 redis，db, 或者其他持久化存储里面。
const ticketMapping = {};

app.get("/login", (req, res) => {
  const service = req.query.service;
  if (!service) {
    throw new Error("service 参数没有指定，调用错误");
  }

  // 如果已经登录了，则直接跳转
  // 让用户无感自
  if (req.session.user) {
    let redirect = `${service}${~service.indexOf("?") ? "&" : "?"}ticket=${
      req.session.user.id
    }`;

    // 因为用的是内存缓存，可能丢失，所以这里把 session 数据存进去
    // 让 profile 接口可以拿得到
    ticketMapping[req.session.user.id] = req.session.user;

    res.redirect(redirect);
    return;
  }

  res.send(`
  <html>
    <head>爱速搭第三方登录示例</head>
    <body>
    <form id="stripe-login" action="/login" method="post">
      <div>
        <label for="user">用户名</label>
        <input type="user" name="user">
      </div>
      <div>
        <label for="email">密码</label>
        <input type="password" name="password">
      </div>
      <div>
        <label for="email">邮箱地址</label>
        <input type="email" name="email">
        
      </div>
      <input type="hidden" name="service" value="${req.query.service}">
      <div>
        <input type="submit" name="submit" value="登录">
      </div>

      ${
        req.session.errorMessage ? `<div>${req.session.errorMessage}</div>` : ""
      }

      <p>密码跟用户请设置成一样<br />
      邮箱可选，不设置就 mock</p>
    </form>
    </body>
  </html>
  `);

  req.session.errorMessage = "";
});

app.post("/login", (req, res) => {
  const service = req.body.service;
  if (!service) {
    throw new Error("service 参数没有指定，调用错误");
  }

  let errorMessage = "";

  if (!req.body.user) {
    errorMessage = "用户名不能为空";
  } else if (req.body.password !== req.body.user) {
    errorMessage = "用户名密码不匹配";
  }

  if (errorMessage) {
    req.session.errorMessage = errorMessage;
    res.redirect(`/login?service=${service}`);
  } else {
    const ticket = uuid.v4();
    let redirect = `${service}${
      ~service.indexOf("?") ? "&" : "?"
    }ticket=${ticket}`;

    req.session.user = ticketMapping[ticket] = {
      id: ticket,
      user: req.body.user,
      email: req.body.email || `${req.body.user}@baidu.com`,
      displayName: req.body.user,
    };

    res.redirect(redirect);
  }
});

app.get("/profile", (req, res) => {
  const ticket = req.query.ticket;

  if (ticketMapping[ticket]) {
    res.json(ticketMapping[ticket]);
  } else {
    res.json({
      status: 500,
      msg: "用户没找到",
    });
  }
});

app.get("/logout", function (req, res, next) {
  req.session.destroy(function (err) {
    if (err) {
      res.statusCode(500);
      res.send("退出登录失败");
      return;
    }

    // req.session.loginUser = null;
    res.clearCookie(identityKey);
    res.redirect("/");
  });
});

// 开启服务
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening: http://localhost:${port}`);
});
