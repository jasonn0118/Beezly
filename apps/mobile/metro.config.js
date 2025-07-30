// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure React uses a single instance and prevent workspace root resolution
config.resolver.alias = {
  'react': path.resolve(__dirname, 'node_modules/react'),
  'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
  'react-native': path.resolve(__dirname, 'node_modules/react-native'),
};

// Prevent Metro from resolving modules from workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

// Ensure strict resolution order
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName === 'react-dom' || moduleName === 'react-native') {
    return context.resolveRequest(context, path.resolve(__dirname, 'node_modules', moduleName), platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
