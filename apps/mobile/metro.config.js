const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo (needed for packages/shared)
config.watchFolders = [monorepoRoot];

// 2. Tell Metro where to look — project first, then monorepo root
//    disableHierarchicalLookup stops Metro climbing the dir tree
//    and accidentally finding a second copy of react-native
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

// 3. Make sure react-native always resolves to exactly one copy
//    (the one hoisted to the monorepo root)
config.resolver.extraNodeModules = {
  'react-native': path.resolve(monorepoRoot, 'node_modules/react-native'),
  'react': path.resolve(monorepoRoot, 'node_modules/react'),
};

module.exports = config;
