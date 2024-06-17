import path from "path";

const config = {
  entry: "./dist/app.js",
  output: {
    filename: "app.js",
  },
  module: {
    rules: [
      {
        test: /\.js$/, // Rule for handling JavaScript files
        exclude: /node_modules/, // Exclude node_modules folder
      },
    ],
  },
};

const base_dir = path.resolve("websocket", "..");
config.output.path = path.resolve(base_dir, "build");

export default config;
