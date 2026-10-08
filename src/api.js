import { request } from "undici";

const { statusCode, body } = await request(
  "https://stock.indianapi.in/stock?name=Reliance",
  {
    headers: {
      "x-api-key": "sk-live-nPT88Gh3nGNr3gCeDWV5QE6fRfpUpVvXhFju7mQz",
    },
  },
);

Bun.write("out/res.json", JSON.stringify(await body.json()));
