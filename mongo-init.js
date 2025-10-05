// MongoDB initialization script
db = db.getSiblingDB("idurar_db");

// Create user for the application
// Password should be set via environment variable MONGO_INITDB_ROOT_PASSWORD
const adminPassword = process.env.MONGO_ADMIN_PASSWORD || (() => {
  throw new Error("MONGO_ADMIN_PASSWORD environment variable is required");
})();

db.createUser({
  user: process.env.MONGO_ADMIN_USER || "admin@gmail.com",
  pwd: adminPassword,
  roles: [
    {
      role: "readWrite",
      db: "idurar_db",
    },
  ],
});

print("Database and user created successfully");
