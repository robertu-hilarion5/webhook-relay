import express from "express";

const app = express();

// Raw Body unverändert übernehmen
app.use(express.raw({ type: "*/*", limit: "10mb" }));

const targets = (
  process.env.TARGET_URLS || ""
)
  .split(",")
  .map(url => url.trim())
  .filter(Boolean);

app.get("/", (_, res) => {
  res.send("Webhook Relay running");
});

app.post("/webhook", async (req, res) => {
  console.log(
    `[${new Date().toISOString()}] Webhook received`
  );

  // Dem Payment-Anbieter sofort antworten
  res.status(200).send("OK");

  const body = req.body;

  const headers = {
    "Content-Type":
      req.headers["content-type"] ||
      "application/json"
  };

  const results = await Promise.allSettled(
    targets.map(url =>
      fetch(url, {
        method: "POST",
        headers,
        body
      })
    )
  );

  results.forEach((result, index) => {
    const target = targets[index];

    if (result.status === "fulfilled") {
      console.log(`✓ ${target}`);
    } else {
      console.error(`✗ ${target}`, result.reason);
    }
  });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});