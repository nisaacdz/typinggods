import { faker } from "@faker-js/faker"

const generateDate = () => {
  const randomDate = faker.date.recent()

  const dd = String(randomDate.getDate()).padStart(2, "0")
  const mm = String(randomDate.getMonth() + 1).padStart(2, "0")
  const yyyy = String(randomDate.getFullYear())

  return `${dd}-${mm}-${yyyy}`
}

export default generateDate
