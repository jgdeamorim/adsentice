import dotenv from "dotenv"
dotenv.config()

export default {
  port: parseInt(process.env.PORT || "3100", 10),
  sessionDir: process.env.SESSION_DIR || "./sessions",
}
