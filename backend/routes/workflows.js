const express = require("express");
const router = express.Router();
const controller = require("../controllers/workflowController");
const stepController = require("../controllers/stepController");
const { onlyAdmin } = require("../controllers/authController");

router.get("/", controller.getWorkflows);
router.get("/user/:userId", controller.getUserWorkflows);
router.get("/:id", controller.getWorkflow);
router.post("/", onlyAdmin, controller.createWorkflow);
router.put("/:id", onlyAdmin, controller.updateWorkflow);
router.delete("/:id", onlyAdmin, controller.deleteWorkflow);
router.patch("/:id/start-step", controller.setStartStep);
router.post("/:workflow_id/steps", stepController.createStep);
router.get("/:workflow_id/steps", stepController.getSteps);

module.exports = router;