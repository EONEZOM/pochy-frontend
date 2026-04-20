module.exports = {
  pouchy: {
    input: "http://백엔드-스웨거-주소/v3/api-docs",
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
