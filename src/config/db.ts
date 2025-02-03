import { logger } from "../extensions/helpers/logger.helper"

const connectToDB = async () => {
  return connectToMongoDBUsingMongoose()
}

async function connectToMongoDBUsingMongoose() {
  return new Promise((resolve, reject) => {
    try {
      throw new Error("Method not implemented")
    } catch (error) {
      logger.error(error)
      reject(error)
    }
  })
}

export default connectToDB
