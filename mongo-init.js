// MongoDB initialization script
db = db.getSiblingDB("idurar_db");

// Create user for the application
db.createUser({
  user: "admin@gmail.com",
  pwd: "admin123",
  roles: [
    {
      role: "readWrite",
      db: "idurar_db",
    },
  ],
});

print("Database and user created successfully");
