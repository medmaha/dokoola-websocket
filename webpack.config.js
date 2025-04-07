import path from "path";

const config = {
  entry: "./dist/app",
  output: {
    filename: "app",
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
