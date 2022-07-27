# third-auth-mock

用于模拟爱速搭的第三方登录

先执行 `npm i ` 安装 npm 包。

开发请运行 `npm run dev` 正式运行请执行 `npm start`

## docker 运行

注意，因为里面的实现用的是简单的内存缓存，所以不能开多实例

```
# docker 构建
docker build -t third_auth .

# docker 运行
docker run -d -p 3000:3000 third_auth
```
