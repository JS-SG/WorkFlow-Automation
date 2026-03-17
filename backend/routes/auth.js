const express = require("express");
const router = express.Router();
const controller = require("../controllers/authController");

router.get("/users", controller.getUsers);
router.get("/users/role/:role", controller.getUsersByRole);
router.post("/login", controller.login);

module.exports = router;
