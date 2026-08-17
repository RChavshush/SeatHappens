import { env } from "./env.js";
import { buildApp } from "./http/app.js";

const app = buildApp();

app.listen(env.PORT, () => {
  console.log(`cinema server listening on :${env.PORT}`);
});
