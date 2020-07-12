'use strict';

const { pipeline, output } = require('./metadata.json');

function _requirePlugin(name) {
  let modPath = pipeline[name];
  let isInference = false;
  if (name === 'modelDefine') {
    try {
      require.resolve(`${modPath}/dist/inference.js`);
      modPath = `${modPath}/dist/inference.js`;
      isInference = true;
    } catch (e) {
      console.warn(`${modPath}/dist/inference.js doesn't exist, use ${modPath}.`);
    }
  }
  const mod = require(modPath);
  const plugin = {
    name,
    isInference,
    module: null
  };
  if (mod && typeof mod.default === 'function') {
    plugin.module = mod.default;
  } else {
    plugin.module = mod;
  }
  return plugin;
}

const modelDefine = _requirePlugin('modelDefine');

let dataProcess;
if (typeof pipeline.dataProcess === 'string') {
  dataProcess = _requirePlugin('dataProcess');
}

const recoverPath = `${__dirname}/model`;
const dataset = JSON.parse(output.dataset);
let model;
if (!modelDefine.isInference) {
  model = modelDefine.module(null, {
    recoverPath,
    dataset,
  });
} else {
  // modelPath, { labelMaps, feature }
  model = modelDefine.module(recoverPath, dataset);
}

module.exports = function predict(data) {
  const sample = { data, label: null };
  let future = model;

  if (dataProcess && typeof dataProcess.module === 'function') {
    future = future.then((m) => {
      dataProcess.module(sample, {}, JSON.parse(pipeline.dataProcessParams));
      return m
    });
  }
  return future.then((m) => {
    if (typeof m === 'function') {
      return m(sample);
    } else {
      return m.predict(sample);
    }
  });
};
