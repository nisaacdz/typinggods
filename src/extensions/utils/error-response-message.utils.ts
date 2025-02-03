const badRequestError = (message: string) => {
  return {
    response_code: 1,
    message: message,
  }
}

const INVALID_PERMISSION = Object.freeze({
  response_code: 2,
  message: "Sorry you do not have permission to perform this action",
} as const)

const DUPLICATE_EMAIL = Object.freeze({
  response_code: 3,
  message: "This email already exists, please login!",
} as const)

const UNABLE_TO_COMPLETE_REQUEST = Object.freeze({
  response_code: 4,
  message: "Unable to complete request.",
} as const)

const REGISTRATION_UNSUCCESSFUL = Object.freeze({
  response_code: 5,
  message: "Registration unsuccessful",
})

const AUTHENTICATION_FAILED = Object.freeze({
  response_code: 6,
  message: "Authentication failed",
})

const requiredField = (field: string) => {
  return {
    response_code: 7,
    message: field + " is required",
  }
}

const BAD_REQUEST = Object.freeze({
  response_code: 8,
  message: "Bad Request",
})

const INVALID_TOKEN = Object.freeze({
  response_code: 9,
  message: "Invalid Token",
})

const CLIENT_ERROR = Object.freeze({
  response_code: 10,
  message: "Client error",
} as const)

export {
  AUTHENTICATION_FAILED,
  BAD_REQUEST,
  CLIENT_ERROR,
  DUPLICATE_EMAIL,
  INVALID_PERMISSION,
  INVALID_TOKEN,
  REGISTRATION_UNSUCCESSFUL,
  UNABLE_TO_COMPLETE_REQUEST,
  badRequestError,
  requiredField,
}
