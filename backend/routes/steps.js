const express = require("express");
const router = express.Router();
const controller = require("../controllers/stepController");
const ruleController = require("../controllers/ruleController");

router.put("/:id", controller.updateStep);
router.delete("/:id", controller.deleteStep);

// Rules under step
router.post("/:step_id/rules", ruleController.createRule);
router.get("/:step_id/rules", ruleController.getRules);

module.exports = router;