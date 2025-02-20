# Typing Gods Backend

## Description

The Typing Gods Backend is a robust and scalable backend application built to power real-time, multi-user typing experiences. Leveraging the power of ExpressJS and a well-structured MVC architecture, it provides a solid foundation for handling complex application logic and data management.  This backend is designed to manage typing sessions for multiple participants simultaneously, ensuring a smooth and responsive user experience.

## Technologies Used

*   **Backend Framework:** [ExpressJS](https://expressjs.com/) - A minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications.
*   **Design Pattern:** Model-View-Controller (MVC) - An architectural pattern that separates an application into three main logical components: the model, the view, and the controller, to facilitate development and maintainability.
*   **Dependency Injection:**  A design pattern in which an object receives other objects that it depends on (dependencies). Dependency injection aims to separate the concerns of constructing objects and using them, leading to loosely coupled and testable code.
*   **Real-time Communication:** [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) & [Socket.IO](https://socket.io/) -  WebSockets provide full-duplex communication channels over a single TCP connection. Socket.IO is a library that enables real-time, bidirectional and event-based communication between web browsers and servers, particularly useful for applications requiring live updates and interactions.
*   **Database:** [Neon Postgres](https://neon.tech/) - A serverless, fully managed PostgreSQL database designed for modern applications, offering scalability and ease of use.
*   **ORM (Object-Relational Mapper):** [Drizzle ORM](https://orm.drizzle.team/) - A modern TypeScript ORM that provides type-safe database access and schema management for PostgreSQL.
*   **Database Migrations:** [Drizzle Kit](https://kit.drizzle.team/) - A toolkit for Drizzle ORM that helps manage database schema migrations and generate migration files.
*   **Package Manager:** [npm](https://www.npmjs.com/) - The package manager for JavaScript, used for managing project dependencies and running scripts.

## Getting Started

To get the Typing Gods Backend application running, follow these steps:

### Prerequisites

Ensure you have the following installed:

*   [Node.js](https://nodejs.org/) (version 18 or higher recommended)
*   [npm](https://www.npmjs.com/) (usually comes with Node.js installation)
*   A [Neon Postgres](https://neon.tech/) account is required for database setup and connection.

### Installation

1.  **Clone the repository:**

    Open your terminal and clone the repository from GitHub:

    ```bash
    git clone [https://github.com/nisaacdz/typinggods.git](https://www.google.com/search?q=https://github.com/nisaacdz/typinggods.git)
    cd typinggods/backend
    ```

2.  **Install Dependencies:**

    Navigate into the `backend` directory and install the required npm packages:

    ```bash
    npm install
    ```

### Database Setup and Migrations

1.  **Environment Configuration:**

    Before running database migrations, you will need environment variables configured, especially for database connection.  **Contact Isaac (me) to obtain the `.env` file** which contains necessary configuration, including database connection details for Neon Postgres.

2.  **Generate Database Migrations:**

    Run the following command to generate migration files based on your Drizzle schema:

    ```bash
    npx drizzle-kit generate
    ```

3.  **Apply Database Migrations:**

    Apply the generated migrations to your Neon Postgres database to update the schema:

    ```bash
    npx drizzle-kit migrate
    ```

### Seed Database with Demo Data (Development)

For development and testing purposes, you can seed the database with demo data. Run the seed script using npm:

```bash
npm run seed
