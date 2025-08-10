// MongoDB initialization script
db = db.getSiblingDB("idurar_db");

// Create user for the application
db.createUser({
  user: "idurar_user",
  pwd: "userpassword",
  roles: [
    {
      role: "readWrite",
      db: "idurar_db",
    },
  ],
});

print("Database and user created successfully");
