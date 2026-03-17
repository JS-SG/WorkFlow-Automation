const express = require("express");
const router = express.Router();
const controller = require("../controllers/notificationController");
console.log("Notifications router loaded");
router.get("/", controller.getNotifications);
router.get("/user/:userId", controller.getNotifications); 
router.patch("/:id/read", controller.markRead);
router.patch("/all/read", controller.markRead);

module.exports = router;
