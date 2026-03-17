const express = require("express");
const router = express.Router();
const controller = require("../controllers/ruleController");

router.put("/:id", controller.updateRule);
router.delete("/:id", controller.deleteRule);

module.exports = router;