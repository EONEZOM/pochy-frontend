const OPENAPI_BASE_URL = process.env.OPENAPI_BASE_URL;
if (!OPENAPI_BASE_URL) {
  throw new Error("OPENAPI_BASE_URL is required");
}


module.exports = {
  pouchy: {
    input: `${OPENAPI_BASE_URL.replace(/\/$/, "")}/v3/api-docs`,
    output: {
      mode: "tags-split",
      target: "./src/api/generated/pouchy.ts",
      schemas: "./src/api/model",
      client: "react-query",
      httpClient: "axios",
      override: {
        mutator: {
          path: "./app/api/axios-instance.ts",
          name: "customInstance",
        },
      },
    },
  },
};
