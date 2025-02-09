import { faker } from "@faker-js/faker";

export class TextService {
  constructor() {}

  generateTypingText() {
    return faker.lorem.words(24);
  }
}
