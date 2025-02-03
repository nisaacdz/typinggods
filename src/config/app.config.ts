const joiValidatorOptions = {
  errors: {
    wrap: {
      label: "",
    },
  },
  stripUnknown: true,
  abortEarly: false,
  allowUnknown: false,
}

const ENVIRONMENTS = Object.freeze({
  PROD: "production",
  DEV: "development",
  UAT: "user acceptance testing",
  STAGING: "staging",
})

export { ENVIRONMENTS, joiValidatorOptions }
