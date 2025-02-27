# Typing Gods Backend

## Description

Typing Gods Backend powers real-time, multi-user typing experiences. Built with ExpressJS and MVC, it manages typing sessions for multiple participants using Websockets and Socket.IO. It uses Neon Postgres and Drizzle for database management.

## Technologies Used

- **Backend Framework:** [ExpressJS](https://expressjs.com/)
- **Design Pattern:** MVC (Model-View-Controller)
- **Dependency Injection**
- **Real-time Communication:** [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) & [Socket.IO](https://socket.io/)
- **Database:** [Neon Postgres](https://neon.tech/)
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Database Migrations:** [Drizzle Kit](https://kit.drizzle.team/)
- **Package Manager:** [npm](https://www.npmjs.com/)

## Getting Started

To run the Typing Gods Backend:

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [npm](https://www.npmjs.com/)
- [Neon Postgres](https://neon.tech/) account

### Installation

1.  **Clone:**

    ```bash
    git clone [https://github.com/nisaacdz/typinggods.git](https://www.google.com/search?q=https://github.com/nisaacdz/typinggods.git)
    cd typinggods/backend
    ```

2.  **Install:**
    ```bash
    npm install
    ```

### Database Setup & Migrations

1.  **Environment:**

    - **Contact Isaac (me) for the `.env` file** (includes Neon Postgres connection details).

2.  **Generate Migrations:**

    ```bash
    npx drizzle-kit generate
    ```

3.  **Apply Migrations:**
    ```bash
    npx drizzle-kit migrate
    ```

### Seed (Development)

For development, seed the database with demo data:

```bash
npm run seed
```
