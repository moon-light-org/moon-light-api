import "dotenv/config";
import { app } from "./server.js";

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
