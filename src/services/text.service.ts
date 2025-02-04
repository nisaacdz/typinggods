import { faker } from "@faker-js/faker";

export const generateTypingText = () => {
  return faker.lorem.words(24);
};
