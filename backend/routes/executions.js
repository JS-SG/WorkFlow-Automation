const express = require("express");
const router = express.Router();
const controller = require("../controllers/executionController");

router.get("/", controller.getExecutions);
router.get("/user/:userId", controller.getUserExecutions);
router.get("/pending", controller.getPendingApprovals);
router.post("/:workflow_id/execute", controller.startExecution);
router.get("/details/:id", controller.getExecutionDetails);
router.get("/:id", controller.getExecution);
router.post("/:id/cancel", controller.cancelExecution);
router.post("/:id/retry", controller.retryExecution);
router.post("/:id/approve", controller.approveExecution);

module.exports = router;