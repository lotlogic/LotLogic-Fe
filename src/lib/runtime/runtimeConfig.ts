type RuntimeConfigState = {
  prototypeEstateId?: string;
};

let runtimeConfig: RuntimeConfigState = {};

export const getRuntimeConfig = (): RuntimeConfigState => runtimeConfig;

export const setRuntimeConfig = (updates: RuntimeConfigState) => {
  runtimeConfig = {
    ...runtimeConfig,
    ...updates,
  };
};

