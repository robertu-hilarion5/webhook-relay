import express from "express";

const app = express();
const defaultTargetUrls = "https://keesha-superb-nonbarbarously.ngrok-free.dev/api/portal/kyc/callback/concedus";

// Raw Body unveraendert uebernehmen
app.use(express.raw({ type: "*/*", limit: "10mb" }));

const targets = (
  process.env.TARGET_URLS || defaultTargetUrls
)
  .split(",")
  .map(url => url.trim())
  .filter(Boolean);

const responseBodyLogLimit = Number(process.env.RESPONSE_BODY_LOG_LIMIT || 5000);

async function readResponseBodyForLog(response) {
  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();

  if (body.length <= responseBodyLogLimit) {
    return { contentType, body, truncated: false };
  }

  return {
    contentType,
    body: body.slice(0, responseBodyLogLimit),
    truncated: true
  };
}

app.get("/", (_, res) => {
  res.send("Webhook Relay running");
});

app.post("/webhook", async (req, res) => {
  console.log(
    `[${new Date().toISOString()}] Webhook received`
  );

  // sofort antworten
  res.status(200).send("OK");

  const body = req.body;

  const headers = {
    "Content-Type":
      req.headers["content-type"] ||
      "application/json"
  };

  const results = await Promise.allSettled(
    targets.map(async url => {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body
      });

      const responseBody = await readResponseBodyForLog(response);

      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        ...responseBody
      };
    })
  );

  results.forEach((result, index) => {
    const target = targets[index];

    if (result.status === "fulfilled") {
      const response = result.value;

      console.log(
        `[${new Date().toISOString()}] Forward response ${target}`,
        {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          contentType: response.contentType,
          headers: response.headers,
          body: response.body,
          bodyTruncated: response.truncated
        }
      );
      return;
    }

    console.error(
      `[${new Date().toISOString()}] Forward failed ${target}`,
      result.reason
    );
  });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
  console.log("TARGET_URLS raw:", process.env.TARGET_URLS || "");
  console.log("TARGET_URLS parsed:", targets);
  console.log("TARGET_URLS count:", targets.length);
  console.log("RESPONSE_BODY_LOG_LIMIT:", responseBodyLogLimit);
});
